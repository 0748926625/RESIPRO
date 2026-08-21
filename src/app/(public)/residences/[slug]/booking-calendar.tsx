"use client";

import { useActionState, useMemo, useRef, useState } from "react";

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

// A multi-day drag produces exactly one slot: check-in on the first day through check-in
// on the day after the last day — the "N nuits" shape create_classic_booking now accepts.
function fullRangeSlot(rangeStart: Date, rangeEnd: Date, checkInTime: string): Slot {
  const [h, m] = checkInTime.split(":").map(Number);
  const start = new Date(rangeStart);
  start.setHours(h || 13, m || 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setDate(end.getDate() + 1);
  end.setHours(h || 13, m || 0, 0, 0);
  return { key: "full", label: "Séjour complet", start, end };
}

function nightsBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
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
  basePrice,
  currency,
  submitLabel,
}: {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  blocks: Block[];
  checkInTime: string;
  allowsHalfDay: boolean;
  mode: "classic" | "shared";
  title: string;
  priceLabel: string;
  basePrice: number;
  currency: string;
  submitLabel: string;
}) {
  const today = startOfDay(new Date());
  const [monthCursor, setMonthCursor] = useState(startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [rangeAnchor, setRangeAnchor] = useState(today);
  const [rangeFocus, setRangeFocus] = useState(today);
  const [selectedSlotKey, setSelectedSlotKey] = useState<Slot["key"] | null>(null);
  const draggingRef = useRef(false);

  const grid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);

  const rangeStart = rangeAnchor < rangeFocus ? rangeAnchor : rangeFocus;
  const rangeEnd = rangeAnchor < rangeFocus ? rangeFocus : rangeAnchor;
  const isMultiDay = mode === "classic" && !isSameDay(rangeStart, rangeEnd);

  const daySlots = useMemo(
    () => slotsForDate(rangeStart, checkInTime, allowsHalfDay, mode),
    [rangeStart, checkInTime, allowsHalfDay, mode],
  );
  const multiDaySlot = useMemo(
    () => (isMultiDay ? fullRangeSlot(rangeStart, rangeEnd, checkInTime) : null),
    [isMultiDay, rangeStart, rangeEnd, checkInTime],
  );

  const slots = isMultiDay ? [] : daySlots;
  const selectedSlot = isMultiDay ? multiDaySlot : (slots.find((slot) => slot.key === selectedSlotKey) ?? null);
  const multiDayBlocked = multiDaySlot ? isSlotBlocked(multiDaySlot, blocks) : false;
  // rangeStart/rangeEnd mark the first and last *selected day*, both inclusive — the stay
  // itself runs one night past rangeEnd (checkout the following morning), so the night
  // count must come from the actual slot span, not a naive rangeEnd - rangeStart diff.
  const nights = multiDaySlot ? nightsBetween(multiDaySlot.start, multiDaySlot.end) : 0;

  const [state, formAction] = useActionState(action, {});

  function startSelection(date: Date) {
    draggingRef.current = true;
    setRangeAnchor(date);
    setRangeFocus(date);
    setSelectedSlotKey(null);
  }

  function extendSelection(date: Date) {
    if (!draggingRef.current || mode !== "classic") return;
    setRangeFocus(date);
    setSelectedSlotKey(null);
  }

  function handlePointerDown(event: React.PointerEvent, date: Date) {
    // Touch pointers implicitly capture to the start element, which would prevent
    // pointerenter from firing on cells dragged over next — release it so a finger-drag
    // across days works the same as a mouse-drag.
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    startSelection(date);
  }

  function commitSelection() {
    draggingRef.current = false;
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

      {mode === "classic" ? (
        <p className="text-xs text-foreground/50">
          Touchez un jour pour le réserver, ou glissez sur plusieurs jours pour un séjour de plusieurs nuits.
        </p>
      ) : null}

      <div
        className="touch-none select-none overflow-hidden rounded-lg border border-foreground/10"
        onPointerUp={commitSelection}
        onPointerCancel={commitSelection}
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
            const inMonth = date.getMonth() === monthCursor.getMonth();
            const inPast = date < today;
            const fullyBlocked = isDayFullyBlocked(date, checkInTime, allowsHalfDay, blocks);
            const inSelectedRange = date >= rangeStart && date <= rangeEnd;

            const isOccupied = inMonth && !inPast && fullyBlocked;

            // Occupied reads as a solid red fill for a client (can't book this date) — the
            // opposite of the owner-facing calendar, where occupied is green.
            let cellClass = "bg-transparent";
            if (inMonth && !inPast) {
              cellClass = isOccupied ? "bg-red-500" : "bg-emerald-500/10";
            }
            if (inSelectedRange) cellClass += " ring-2 ring-primary ring-inset";

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={inPast || !inMonth}
                onPointerDown={(event) => handlePointerDown(event, date)}
                onPointerEnter={() => extendSelection(date)}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 border-b border-r border-foreground/5 p-1 text-xs ${cellClass} ${
                  isOccupied ? "text-white" : inMonth && !inPast ? "text-foreground" : "text-foreground/25"
                }`}
              >
                <span className={isSameDay(date, today) ? "font-semibold underline" : ""}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isMultiDay ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            Arrivée {multiDaySlot!.start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à{" "}
            {timeLabel(multiDaySlot!.start)} — Départ{" "}
            {multiDaySlot!.end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à{" "}
            {timeLabel(multiDaySlot!.end)} — {nights} nuit{nights > 1 ? "s" : ""}
          </p>
          <p className="text-sm text-foreground/80">
            Total : {basePrice * nights} {currency}
          </p>
          {multiDayBlocked ? (
            <p className="text-sm text-red-600">
              Une partie de ce séjour n&apos;est plus disponible — ajustez les dates sélectionnées.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            {rangeStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
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
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="startsAt" value={selectedSlot && !multiDayBlocked ? selectedSlot.start.toISOString() : ""} />
        <input type="hidden" name="endsAt" value={selectedSlot && !multiDayBlocked ? selectedSlot.end.toISOString() : ""} />
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.fieldErrors?.startsAt || state.fieldErrors?.endsAt ? (
          <p className="text-sm text-red-600">Choisissez un créneau ci-dessus.</p>
        ) : null}
        <SubmitButton disabled={!selectedSlot || multiDayBlocked}>
          {selectedSlot ? submitLabel : "Choisissez un créneau"}
        </SubmitButton>
      </form>
    </div>
  );
}
