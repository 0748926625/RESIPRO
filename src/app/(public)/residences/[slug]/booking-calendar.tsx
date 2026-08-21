"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import {
  classifyDay,
  computeAvailableWindows,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/services/availability.service";
import { buildMonthGrid, isSameDay, startOfDay } from "@/lib/services/calendar.service";

import type { BookingFormState } from "./actions";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const SNAP_MINUTES = 15;

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function timeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function BookingCalendar({
  action,
  rules,
  blocks,
  title,
  priceLabel,
  submitLabel,
}: {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  title: string;
  priceLabel: string;
  submitLabel: string;
}) {
  const today = startOfDay(new Date());
  const [monthCursor, setMonthCursor] = useState(startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [selectedDate, setSelectedDate] = useState(today);
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);

  const draggingRef = useRef(false);
  const anchorRef = useRef<Date | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const windows = useMemo(
    () => computeAvailableWindows(rules, blocks, selectedDate),
    [rules, blocks, selectedDate],
  );
  const timelineStart = windows[0]?.start;
  const timelineEnd = windows[windows.length - 1]?.end;

  const [state, formAction] = useActionState(action, {});

  function selectDate(date: Date) {
    setSelectedDate(date);
    setRange(null);
  }

  function timeAtClientX(clientX: number): Date | null {
    if (!timelineRef.current || !timelineStart || !timelineEnd) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const ms = timelineStart.getTime() + ratio * (timelineEnd.getTime() - timelineStart.getTime());
    const snapMs = SNAP_MINUTES * 60000;
    return new Date(Math.round(ms / snapMs) * snapMs);
  }

  function isAvailableAt(date: Date): boolean {
    return windows.some((window) => window.start <= date && date <= window.end);
  }

  function handlePointerDown(event: React.PointerEvent) {
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    const time = timeAtClientX(event.clientX);
    if (!time || !isAvailableAt(time)) return;
    draggingRef.current = true;
    anchorRef.current = time;
    setRange({ start: time, end: time });
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!draggingRef.current || !anchorRef.current) return;
    const time = timeAtClientX(event.clientX);
    if (!time) return;
    const clamped = isAvailableAt(time)
      ? time
      : time < anchorRef.current
        ? (windows.find((w) => w.end <= anchorRef.current!) ?? windows[0])?.end ?? time
        : (windows.find((w) => w.start >= anchorRef.current!) ?? windows[windows.length - 1])?.start ?? time;
    const [start, end] = clamped < anchorRef.current ? [clamped, anchorRef.current] : [anchorRef.current, clamped];
    setRange({ start, end });
  }

  function handlePointerUp() {
    draggingRef.current = false;
    anchorRef.current = null;
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
            const { hasRule, isAvailable } = classifyDay(rules, blocks, date);
            const isSelected = isSameDay(date, selectedDate);

            let cellClass = "bg-transparent";
            if (inMonth && !inPast) {
              if (!hasRule) cellClass = "bg-foreground/5";
              else if (isAvailable) cellClass = "bg-emerald-500/10";
              else cellClass = "bg-red-500/10";
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

        {windows.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucun créneau disponible ce jour-là. Choisissez une autre date.</p>
        ) : (
          <>
            <p className="text-xs text-foreground/50">
              Glissez sur la frise pour choisir votre créneau (ou touchez un point de départ).
            </p>
            <div
              ref={timelineRef}
              className="relative h-12 touch-none select-none overflow-hidden rounded-md bg-red-500/10"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {timelineStart && timelineEnd
                ? windows.map((window) => {
                    const total = timelineEnd.getTime() - timelineStart.getTime();
                    const left = ((window.start.getTime() - timelineStart.getTime()) / total) * 100;
                    const width = ((window.end.getTime() - window.start.getTime()) / total) * 100;
                    return (
                      <div
                        key={window.start.toISOString()}
                        className="absolute inset-y-0 bg-emerald-500/25"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    );
                  })
                : null}
              {range && timelineStart && timelineEnd
                ? (() => {
                    const total = timelineEnd.getTime() - timelineStart.getTime();
                    const left = ((range.start.getTime() - timelineStart.getTime()) / total) * 100;
                    const width = Math.max(
                      0.5,
                      ((range.end.getTime() - range.start.getTime()) / total) * 100,
                    );
                    return (
                      <div
                        className="absolute inset-y-0 rounded bg-primary/70"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    );
                  })()
                : null}
            </div>
            <div className="flex justify-between text-[10px] text-foreground/40">
              <span>{timelineStart ? timeLabel(timelineStart) : ""}</span>
              <span>{timelineEnd ? timeLabel(timelineEnd) : ""}</span>
            </div>
          </>
        )}

        {range ? (
          <p className="text-sm text-foreground">
            Créneau choisi : <span className="font-medium">{timeLabel(range.start)} – {timeLabel(range.end)}</span>
          </p>
        ) : null}
      </div>

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="date" value={dateKey(selectedDate)} />
        <input type="hidden" name="startTime" value={range ? timeInputValue(range.start) : ""} />
        <input type="hidden" name="endTime" value={range ? timeInputValue(range.end) : ""} />
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.fieldErrors?.startTime || state.fieldErrors?.endTime ? (
          <p className="text-sm text-red-600">Choisissez un créneau valide sur la frise ci-dessus.</p>
        ) : null}
        <SubmitButton disabled={!range}>{range ? submitLabel : "Choisissez un créneau"}</SubmitButton>
      </form>
    </div>
  );
}
