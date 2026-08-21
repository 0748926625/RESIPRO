import Link from "next/link";

import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants/statuses";
import type { BookingStatus, PaymentStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

type UpcomingSegment = {
  id: string;
  starts_at: string;
  ends_at: string;
  booking: { id: string; booking_code: string; status: BookingStatus; properties: { name: string } | null } | null;
};

type PendingPayment = {
  id: string;
  reference_code: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  booking: { properties: { name: string } | null } | null;
};

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date().toISOString();

  const [{ data: segmentsData }, { data: paymentsData }, { count: sharedCount }] = await Promise.all([
    supabase
      .from("booking_segments")
      .select("id, starts_at, ends_at, booking:bookings(id, booking_code, status, properties(name))")
      .eq("participant_profile_id", user!.id)
      .neq("status", "cancelled")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("payments")
      .select("id, reference_code, amount, currency, status, booking:bookings(properties(name))")
      .eq("payer_profile_id", user!.id)
      .in("status", ["pending", "payment_rejected"])
      .order("created_at", { ascending: false }),
    supabase
      .from("shared_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("initiator_profile_id", user!.id)
      .in("status", ["searching_partner", "partner_found"]),
  ]);

  const upcoming = (segmentsData ?? []) as unknown as UpcomingSegment[];
  const pendingPayments = (paymentsData ?? []) as unknown as PendingPayment[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Mon espace</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-foreground/10 p-3">
          <p className="text-xs text-foreground/60">Réservations à venir</p>
          <p className="text-lg font-semibold text-foreground">{upcoming.length}</p>
        </div>
        <div className="rounded-lg border border-foreground/10 p-3">
          <p className="text-xs text-foreground/60">Paiements à traiter</p>
          <p className="text-lg font-semibold text-foreground">{pendingPayments.length}</p>
        </div>
        <div className="rounded-lg border border-foreground/10 p-3">
          <p className="text-xs text-foreground/60">Demandes partagées actives</p>
          <p className="text-lg font-semibold text-foreground">{sharedCount ?? 0}</p>
        </div>
      </div>

      {pendingPayments.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Paiements à traiter</h2>
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {pendingPayments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {payment.booking?.properties?.name ?? "Résidence"} — {payment.reference_code} ·{" "}
                  {payment.amount.toLocaleString("fr-FR")} {payment.currency}
                </span>
                <span className="text-xs text-foreground/50">{PAYMENT_STATUS_LABELS[payment.status]}</span>
              </li>
            ))}
          </ul>
          <Link href="/client/payments" className="w-fit text-sm underline">
            Voir mes paiements
          </Link>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Réservations à venir</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucune réservation à venir. <Link href="/residences" className="underline">Chercher une résidence</Link>.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {upcoming.map((segment) => (
              <li key={segment.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {segment.booking?.properties?.name ?? "Résidence"} — {segment.booking?.booking_code} ·{" "}
                  {new Date(segment.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span className="text-xs text-foreground/50">
                  {segment.booking ? (BOOKING_STATUS_LABELS[segment.booking.status] ?? segment.booking.status) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/client/bookings" className="w-fit text-sm underline">
          Voir toutes mes réservations
        </Link>
      </section>

      <section className="flex flex-wrap gap-3 text-sm">
        <Link href="/residences" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Chercher une résidence
        </Link>
        <Link href="/client/shared-bookings" className="rounded-md border border-foreground/10 px-4 py-2">
          Réservations partagées
        </Link>
        <Link href="/client/intermediation" className="rounded-md border border-foreground/10 px-4 py-2">
          Demandes personnalisées
        </Link>
      </section>
    </div>
  );
}
