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

type BlockWithMeta = AvailabilityBlock & {
  id: string;
  reason: string;
  note: string | null;
  clientName: string | null;
};

// Deterministic (same client -> same color everywhere on the calendar, not just when
// adjacent) so a stay that gets extended later still reads as "same client" at a glance.
// Anonymous/untagged blocks skip this palette entirely and stay plain emerald-500.
const CLIENT_COLOR_PALETTE = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-indigo-500",
  "bg-fuchsia-500",
];

function colorForClient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CLIENT_COLOR_PALETTE[hash % CLIENT_COLOR_PALETTE.length];
}

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
  onTagClient,
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
  onTagClient?: (dates: string[], clientName: string) => Promise<void>;
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
            const { hasRule, blocksOnDay } = classifyDay(rules, blocks, date);
            const key = dateKey(date);
            const isQuickBlocked = quickBlockedDates.has(key);
            const isPendingDrag = dragDates.includes(key);

            // Occupied reads as green for an owner (a booked date is revenue, not a
            // problem) — the opposite of the client-facing calendar, where occupied is
            // red. Solid fill (not a light tint) so it's legible at a glance. Keyed off
            // blocksOnDay directly (not hasRule/isAvailable) so a quick-marked block still
            // shows as occupied even on a day with no recurring availability rule.
            const isOccupied = inMonth && blocksOnDay.length > 0;
            const dayClientName = (blocksOnDay as BlockWithMeta[]).find((block) => block.clientName)?.clientName ?? null;
            const occupiedColorClass = dayClientName ? colorForClient(dayClientName) : "bg-emerald-500";

            let cellClass = "bg-transparent";
            if (inMonth) {
              if (isOccupied) cellClass = occupiedColorClass;
              else if (!hasRule) cellClass = "bg-foreground/5";
            }
            if (isPendingDrag) {
              cellClass = dragAction === "add" ? "bg-emerald-500/70" : "bg-foreground/10";
            }

            const sharedClass = `flex min-h-20 flex-col gap-1 border-b border-r border-foreground/5 p-1.5 text-xs ${cellClass} ${
              isOccupied && !isPendingDrag ? "text-white" : inMonth ? "text-foreground" : "text-foreground/30"
            }`;

            const cellContent = (
              <>
                <span className={isSameDay(date, today) ? "font-semibold underline" : ""}>{date.getDate()}</span>
                {blocksOnDay.length > 0 ? (
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] ${
                      isOccupied && !isPendingDrag
                        ? "bg-white/20 text-white"
                        : "bg-red-500/20 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {dayClientName ?? (isQuickBlocked ? "Occupé" : `${blocksOnDay.length} blocage${blocksOnDay.length > 1 ? "s" : ""}`)}
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

      {invoicePromptDates && propertyId && currency && onCreateInvoice && onTagClient ? (
        <InvoicePrompt
          propertyId={propertyId}
          dates={invoicePromptDates}
          currency={currency}
          createAction={onCreateInvoice}
          tagClientAction={onTagClient}
          onClose={() => setInvoicePromptDates(null)}
        />
      ) : null}
    </div>
  );
}
