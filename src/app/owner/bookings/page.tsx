import { BOOKING_STATUS_LABELS } from "@/lib/constants/statuses";
import type { BookingStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

type BookingRow = {
  id: string;
  booking_code: string;
  status: BookingStatus;
  type: string;
  starts_at: string;
  ends_at: string;
  total_price: number;
  currency: string;
  properties: { name: string; city: string } | null;
};

export default async function OwnerBookingsPage() {
  const supabase = await createClient();
  // RLS (bookings_select) already scopes this to bookings on the signed-in owner's
  // properties — no explicit owner_id filter needed here.
  const { data } = await supabase
    .from("bookings")
    .select("id, booking_code, status, type, starts_at, ends_at, total_price, currency, properties(name, city)")
    .order("starts_at", { ascending: false });

  const bookings = (data ?? []) as unknown as BookingRow[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Réservations</h1>

      {bookings.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune réservation pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {booking.properties?.name ?? "Résidence"} — {booking.booking_code}
                </p>
                <p className="text-foreground/60">
                  {booking.properties?.city} ·{" "}
                  {new Date(booking.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} –{" "}
                  {new Date(booking.ends_at).toLocaleTimeString("fr-FR", { timeStyle: "short" })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-foreground/60">
                <span>{BOOKING_STATUS_LABELS[booking.status] ?? booking.status}</span>
                <span className="font-medium text-foreground">
                  {booking.total_price} {booking.currency}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
