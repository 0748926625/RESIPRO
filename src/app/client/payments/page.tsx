import { PAYMENT_STATUS_LABELS } from "@/lib/constants/statuses";
import type { PaymentStatus } from "@/lib/constants/statuses";
import { resubmitPayment, submitPayment } from "@/lib/bookings/payment-actions";
import { createClient } from "@/lib/supabase/server";

type PaymentRow = {
  id: string;
  reference_code: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  notes: string | null;
  booking: { booking_code: string; properties: { name: string } | null } | null;
};

export default async function ClientPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, reference_code, amount, currency, status, notes, booking:bookings(booking_code, properties(name))")
      .eq("payer_profile_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["payment_operator", "payment_phone", "payment_recipient_name", "payment_instructions"]),
  ]);

  const payments = (data ?? []) as unknown as PaymentRow[];
  const settings = Object.fromEntries((settingsRows ?? []).map((row) => [row.key, row.value as string | null]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Mes paiements</h1>

      {settings.payment_operator ? (
        <div className="rounded-lg border border-foreground/10 p-4 text-sm">
          <p className="font-medium text-foreground">Comment payer</p>
          <p className="text-foreground/80">
            Envoyez le montant via {settings.payment_operator} au {settings.payment_phone} (
            {settings.payment_recipient_name}), en indiquant la référence de votre paiement.
          </p>
          {settings.payment_instructions ? (
            <p className="mt-1 text-foreground/60">{settings.payment_instructions}</p>
          ) : null}
        </div>
      ) : null}

      {payments.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucun paiement pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {payment.reference_code} — {payment.booking?.properties?.name ?? "Résidence"}
                </p>
                <p className="text-foreground/60">
                  {payment.amount} {payment.currency}
                </p>
                <p className="text-xs text-foreground/50">{PAYMENT_STATUS_LABELS[payment.status]}</p>
                {payment.status === "payment_rejected" && payment.notes ? (
                  <p className="text-xs text-red-600">{payment.notes}</p>
                ) : null}
              </div>
              {payment.status === "pending" ? (
                <form action={submitPayment.bind(null, payment.id, "/client/payments")}>
                  <button
                    type="submit"
                    className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                  >
                    J&apos;ai effectué le paiement
                  </button>
                </form>
              ) : null}
              {payment.status === "payment_rejected" ? (
                <form action={resubmitPayment.bind(null, payment.id, "/client/payments")}>
                  <button
                    type="submit"
                    className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                  >
                    Renvoyer
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
