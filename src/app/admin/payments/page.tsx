import Link from "next/link";

import { PAYMENT_STATUS_LABELS } from "@/lib/constants/statuses";
import type { PaymentStatus } from "@/lib/constants/statuses";
import { confirmPayment, rejectPayment } from "@/lib/bookings/payment-actions";
import { createClient } from "@/lib/supabase/server";

type PaymentRow = {
  id: string;
  reference_code: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  submitted_at: string | null;
  profiles: { full_name: string; phone: string | null } | null;
  booking: { booking_code: string; properties: { name: string } | null } | null;
};

const FILTERS = [
  { value: "payment_submitted", label: "À vérifier" },
  { value: "pending", label: "En attente" },
  { value: "payment_confirmed", label: "Confirmés" },
  { value: "payment_rejected", label: "Refusés" },
  { value: "all", label: "Tous" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status ?? "payment_submitted";

  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select(
      "id, reference_code, amount, currency, status, submitted_at, profiles:payer_profile_id(full_name, phone), booking:bookings(booking_code, properties(name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter as PaymentStatus);
  }

  const { data } = await query;
  const payments = (data ?? []) as unknown as PaymentRow[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Paiements</h1>

      <div className="flex gap-2 text-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/payments?status=${filter.value}`}
            className={`rounded-full px-3 py-1 ${
              activeFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "border border-foreground/15 text-foreground/70"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucun paiement dans ce filtre.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {payment.reference_code} — {payment.profiles?.full_name ?? "—"}
                </p>
                <p className="text-foreground/60">
                  {payment.booking?.properties?.name ?? "Résidence"} · {payment.amount} {payment.currency}
                </p>
                <p className="text-xs text-foreground/50">{PAYMENT_STATUS_LABELS[payment.status]}</p>
                {payment.profiles?.phone ? (
                  <a href={`tel:${payment.profiles.phone}`} className="text-xs text-primary underline">
                    Appeler le client · {payment.profiles.phone}
                  </a>
                ) : null}
              </div>
              {payment.status === "payment_submitted" ? (
                <div className="flex items-center gap-2">
                  <form action={confirmPayment.bind(null, payment.id, "/admin/payments")}>
                    <button
                      type="submit"
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Confirmer
                    </button>
                  </form>
                  <form action={rejectPayment.bind(null, payment.id, "/admin/payments")} className="flex items-center gap-1">
                    <input
                      type="text"
                      name="note"
                      placeholder="Motif (optionnel)"
                      className="w-32 rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs"
                    />
                    <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                      Refuser
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
