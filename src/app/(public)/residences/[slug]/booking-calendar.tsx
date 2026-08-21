"use client";

import { useActionState, useMemo, useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { buildMonthGrid, isSameDay, startOfDay } from "@/lib/services/calendar.service";

import type { BookingFormState } from "./actions";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type Block = { start: Date; end: Date };

type Slot = { key: "full" | "day" | "night"; label: string; start: Date; end: Date };

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function slotsForDate(date: Date, checkInTime: string, allowsHalfDay: boolean, mode: "classic" | "shared"): Slot[] {
  const [h, m] = checkInTime.split(":").map(Number);
  const fullStart = new Date(date);
  fullStart.setHours(h || 13, m || 0, 0, 0);
  const halfBoundary = new Date(fullStart.getTime() + 7 * 3600000);
  const fullEnd = new Date(fullStart.getTime() + 24 * 3600000);

  const slots: Slot[] = [];
  if (mode === "classic") {
    slots.push({ key: "full", label: "Journée complète", start: fullStart, end: fullEnd });
  }
  if (allowsHalfDay) {
    slots.push({
      key: "day",
      label: `Demi-journée (${timeLabel(fullStart)} – ${timeLabel(halfBoundary)})`,
      start: fullStart,
      end: halfBoundary,
    });
    slots.push({
      key: "night",
      label: `Demi-journée (${timeLabel(halfBoundary)} – ${timeLabel(fullEnd)} le lendemain)`,
      start: halfBoundary,
      end: fullEnd,
    });
  }
  return slots;
}

function isSlotBlocked(slot: Slot, blocks: Block[]): boolean {
  return blocks.some((block) => block.start < slot.end && slot.start < block.end);
}

// A day shows as blocked once every slot it could offer is individually blocked — matches
// the slot buttons' own per-slot check exactly, so the month grid never shows a date as
// "available" when every actual option under it says "indisponible".
function isDayFullyBlocked(date: Date, checkInTime: string, allowsHalfDay: boolean, blocks: Block[]): boolean {
  const daySlots = slotsForDate(date, checkInTime, allowsHalfDay, "classic");
  return daySlots.every((slot) => isSlotBlocked(slot, blocks));
}

export function BookingCalendar({
  action,
  blocks,
  checkInTime,
  allowsHalfDay,
  mode,
  title,
  priceLabel,
  submitLabel,
}: {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  blocks: Block[];
  checkInTime: string;
  allowsHalfDay: boolean;
  mode: "classic" | "shared";
  title: string;
  priceLabel: string;
  submitLabel: string;
}) {
  const today = startOfDay(new Date());
  const [monthCursor, setMonthCursor] = useState(startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlotKey, setSelectedSlotKey] = useState<Slot["key"] | null>(null);

  const grid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const slots = useMemo(
    () => slotsForDate(selectedDate, checkInTime, allowsHalfDay, mode),
    [selectedDate, checkInTime, allowsHalfDay, mode],
  );
  const selectedSlot = slots.find((slot) => slot.key === selectedSlotKey) ?? null;

  const [state, formAction] = useActionState(action, {});

  function selectDate(date: Date) {
    setSelectedDate(date);
    setSelectedSlotKey(null);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="text-sm font-semibold text-foreground">{priceLabel}</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
          className="text-foreground/60"
        >
          ← Mois précédent
        </button>
        <span className="font-medium text-foreground">
          {monthCursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
          className="text-foreground/60"
        >
          Mois suivant →
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-foreground/10">
        <div className="grid grid-cols-7 border-b border-foreground/10 bg-foreground/5 text-xs font-medium text-foreground/60">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-1.5 text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((date) => {
            const inMonth = date.getMonth() === monthCursor.getMonth();
            const inPast = date < today;
            const fullyBlocked = isDayFullyBlocked(date, checkInTime, allowsHalfDay, blocks);
            const isSelected = isSameDay(date, selectedDate);

            let cellClass = "bg-transparent";
            if (inMonth && !inPast) {
              cellClass = fullyBlocked ? "bg-red-500/10" : "bg-emerald-500/10";
            }
            if (isSelected) cellClass += " ring-2 ring-primary";

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={inPast || !inMonth}
                onClick={() => selectDate(date)}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 border-b border-r border-foreground/5 p-1 text-xs ${cellClass} ${
                  inMonth && !inPast ? "text-foreground" : "text-foreground/25"
                }`}
              >
                <span className={isSameDay(date, today) ? "font-semibold underline" : ""}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">
          {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        <div className="flex flex-col gap-2">
          {slots.map((slot) => {
            const blocked = isSlotBlocked(slot, blocks);
            const isChosen = selectedSlotKey === slot.key;
            return (
              <button
                key={slot.key}
                type="button"
                disabled={blocked}
                onClick={() => setSelectedSlotKey(slot.key)}
                className={`rounded-md border px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  isChosen ? "border-primary bg-primary/10 font-medium text-primary" : "border-foreground/15 text-foreground"
                }`}
              >
                {slot.label}
                {blocked ? " — indisponible" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="startsAt" value={selectedSlot ? selectedSlot.start.toISOString() : ""} />
        <input type="hidden" name="endsAt" value={selectedSlot ? selectedSlot.end.toISOString() : ""} />
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.fieldErrors?.startsAt || state.fieldErrors?.endsAt ? (
          <p className="text-sm text-red-600">Choisissez un créneau ci-dessus.</p>
        ) : null}
        <SubmitButton disabled={!selectedSlot}>{selectedSlot ? submitLabel : "Choisissez un créneau"}</SubmitButton>
      </form>
    </div>
  );
}
