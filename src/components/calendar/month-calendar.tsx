"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import type { CreateInvoiceResult } from "@/app/owner/properties/[id]/invoices/actions";
import {
  classifyDay,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/services/availability.service";
import { buildMonthGrid, isSameDay } from "@/lib/services/calendar.service";
import { QUICK_BLOCK_NOTE } from "@/lib/validations/availability.schema";

import { InvoicePrompt } from "./invoice-prompt";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type BlockWithMeta = AvailabilityBlock & { id: string; reason: string; note: string | null };

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function MonthCalendar({
  month,
  rules,
  blocks,
  basePath,
  propertyId,
  currency,
  onToggleQuickBlocks,
  onCreateInvoice,
}: {
  month: Date;
  rules: AvailabilityRule[];
  blocks: BlockWithMeta[];
  basePath: string;
  propertyId?: string;
  currency?: string;
  onToggleQuickBlocks?: (dates: string[], occupied: boolean) => Promise<void>;
  onCreateInvoice?: (input: {
    clientName: string;
    startsAt: string;
    endsAt: string;
    nightlyRate: number;
    amountPaid: number;
  }) => Promise<CreateInvoiceResult>;
}) {
  const grid = buildMonthGrid(month);
  const today = new Date();

  const [markMode, setMarkMode] = useState(false);
  const [dragDates, setDragDates] = useState<string[]>([]);
  const [dragAction, setDragAction] = useState<"add" | "remove" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [invoicePromptDates, setInvoicePromptDates] = useState<string[] | null>(null);
  const draggingRef = useRef(false);

  const quickBlockedDates = new Set(
    blocks.filter((block) => block.note === QUICK_BLOCK_NOTE).map((block) => dateKey(block.start)),
  );

  function commitDrag() {
    if (draggingRef.current && dragDates.length > 0 && dragAction && onToggleQuickBlocks) {
      const dates = dragDates;
      const occupied = dragAction === "add";
      startTransition(async () => {
        await onToggleQuickBlocks(dates, occupied);
      });
      if (occupied && onCreateInvoice) {
        setInvoicePromptDates(dates);
      }
    }
    draggingRef.current = false;
    setDragDates([]);
    setDragAction(null);
  }

  function handlePointerDown(event: React.PointerEvent, date: Date) {
    if (!markMode) return;
    // Touch pointers implicitly capture to the start element, which would prevent
    // pointerenter from firing on the cells dragged over next — release it so a
    // finger-drag across days works the same as a mouse-drag.
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    const key = dateKey(date);
    draggingRef.current = true;
    setDragAction(quickBlockedDates.has(key) ? "remove" : "add");
    setDragDates([key]);
  }

  function handlePointerEnter(date: Date) {
    if (!markMode || !draggingRef.current) return;
    const key = dateKey(date);
    setDragDates((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }

  return (
    <div className="flex flex-col gap-2">
      {onToggleQuickBlocks ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMarkMode((value) => !value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              markMode ? "bg-primary text-primary-foreground" : "border border-foreground/20 text-foreground/70"
            }`}
          >
            {markMode ? "Marquage rapide activé" : "Marquer des dates occupées"}
          </button>
          {isPending ? <span className="text-xs text-foreground/50">Enregistrement…</span> : null}
        </div>
      ) : null}

      <div
        className="touch-none select-none overflow-hidden rounded-lg border border-foreground/10"
        onPointerUp={commitDrag}
        onPointerCancel={commitDrag}
      >
        <div className="grid grid-cols-7 border-b border-foreground/10 bg-foreground/5 text-xs font-medium text-foreground/60">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-1.5 text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((date) => {
            const inMonth = date.getMonth() === month.getMonth();
            const { hasRule, isAvailable, blocksOnDay } = classifyDay(rules, blocks, date);
            const key = dateKey(date);
            const isQuickBlocked = quickBlockedDates.has(key);
            const isPendingDrag = dragDates.includes(key);

            let cellClass = "bg-transparent";
            if (inMonth) {
              if (!hasRule) cellClass = "bg-foreground/5";
              else if (isAvailable) cellClass = "bg-emerald-500/10";
              else cellClass = "bg-red-500/10";
            }
            if (isPendingDrag) {
              cellClass = dragAction === "add" ? "bg-red-500/30" : "bg-emerald-500/20";
            }

            const sharedClass = `flex min-h-20 flex-col gap-1 border-b border-r border-foreground/5 p-1.5 text-xs ${cellClass} ${
              inMonth ? "text-foreground" : "text-foreground/30"
            }`;

            const cellContent = (
              <>
                <span className={isSameDay(date, today) ? "font-semibold underline" : ""}>{date.getDate()}</span>
                {blocksOnDay.length > 0 ? (
                  <span className="rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-700 dark:text-red-300">
                    {isQuickBlocked ? "Occupé" : `${blocksOnDay.length} blocage${blocksOnDay.length > 1 ? "s" : ""}`}
                  </span>
                ) : null}
              </>
            );

            if (markMode) {
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={`${sharedClass} text-left`}
                  onPointerDown={(event) => handlePointerDown(event, date)}
                  onPointerEnter={() => handlePointerEnter(date)}
                >
                  {cellContent}
                </button>
              );
            }

            return (
              <Link key={date.toISOString()} href={`${basePath}?view=day&date=${key}`} className={sharedClass}>
                {cellContent}
              </Link>
            );
          })}
        </div>
      </div>

      {markMode ? (
        <p className="text-xs text-foreground/50">
          Touchez un jour pour le marquer occupé, ou glissez pour en marquer plusieurs d&apos;un coup. Touchez à
          nouveau un jour déjà marqué pour le libérer.
        </p>
      ) : null}

      {invoicePromptDates && propertyId && currency && onCreateInvoice ? (
        <InvoicePrompt
          propertyId={propertyId}
          dates={invoicePromptDates}
          currency={currency}
          createAction={onCreateInvoice}
          onClose={() => setInvoicePromptDates(null)}
        />
      ) : null}
    </div>
  );
}
