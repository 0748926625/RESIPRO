import { isSameDay } from "@/lib/services/calendar.service";

// Bookings can now span several nights (0037_multi_night_classic_booking), so a bare end
// *time* is ambiguous or outright misleading once starts_at and ends_at fall on different
// calendar days — this always shows the departure date too when that's the case.
export function formatBookingRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const startLabel = start.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  if (isSameDay(start, end)) {
    return `${startLabel} – ${end.toLocaleTimeString("fr-FR", { timeStyle: "short" })}`;
  }

  const endLabel = end.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  return `${startLabel} → ${endLabel}`;
}
