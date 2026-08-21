import Link from "next/link";

import { BOOKING_STATUS_LABELS, NON_CANCELLABLE_BOOKING_STATUSES } from "@/lib/constants/statuses";
import { cancelBooking } from "@/lib/bookings/actions";
import { formatBookingRange } from "@/lib/format/booking-range";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/constants/statuses";

type SegmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  price_share: number;
  booking: {
    id: string;
    booking_code: string;
    status: BookingStatus;
    type: string;
    properties: { name: string; city: string; slug: string } | null;
  } | null;
};

export default async function ClientBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("booking_segments")
    .select(
      "id, starts_at, ends_at, price_share, booking:bookings(id, booking_code, status, type, properties(name, city, slug))",
    )
    .eq("participant_profile_id", user!.id)
    .order("starts_at", { ascending: false });

  const segments = (data ?? []) as unknown as SegmentRow[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Mes réservations</h1>

      {segments.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucune réservation pour le moment. <Link href="/residences" className="underline">Chercher une résidence</Link>.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {segments.map((segment) => {
            const booking = segment.booking;
            if (!booking) return null;
            const canCancel = !NON_CANCELLABLE_BOOKING_STATUSES.includes(booking.status);

            return (
              <li key={segment.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {booking.properties?.name ?? "Résidence"} — {booking.booking_code}
                  </p>
                  <p className="text-foreground/60">
                    {booking.properties?.city} · {formatBookingRange(segment.starts_at, segment.ends_at)}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {BOOKING_STATUS_LABELS[booking.status] ?? booking.status} · {segment.price_share}
                  </p>
                </div>
                {canCancel ? (
                  <form action={cancelBooking.bind(null, booking.id, "/client/bookings")}>
                    <button type="submit" className="text-xs text-red-600 underline">
                      Annuler
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
