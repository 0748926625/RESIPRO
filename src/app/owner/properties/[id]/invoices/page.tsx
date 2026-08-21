import Link from "next/link";
import { notFound } from "next/navigation";

import { computeInvoiceTotals } from "@/lib/services/external-booking.service";
import { createClient } from "@/lib/supabase/server";

import { deleteExternalBooking } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function PropertyInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id, name").eq("id", id).single();
  if (!property) {
    notFound();
  }

  const { data } = await supabase
    .from("external_bookings")
    .select("id, client_name, starts_at, ends_at, nightly_rate, amount_paid, currency")
    .eq("property_id", id)
    .order("starts_at", { ascending: false });

  const invoices = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <Link href={`/owner/properties/${id}/availability`} className="text-xs text-foreground/60 underline">
          ← {property.name}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Factures — réservations hors plateforme</h1>
        <p className="text-sm text-foreground/60">
          Générées depuis le calendrier en marquant des dates occupées avec les informations du client.
        </p>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucune facture. Depuis le{" "}
          <Link href={`/owner/properties/${id}/availability`} className="underline">
            calendrier
          </Link>
          , activez « Marquer des dates occupées », glissez sur les nuits concernées, puis renseignez le client.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {invoices.map((invoice) => {
            const totals = computeInvoiceTotals({
              startsAt: invoice.starts_at,
              endsAt: invoice.ends_at,
              nightlyRate: invoice.nightly_rate,
              amountPaid: invoice.amount_paid,
            });
            return (
              <li key={invoice.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <Link href={`/owner/properties/${id}/invoices/${invoice.id}`} className="font-medium text-foreground hover:underline">
                    {invoice.client_name}
                  </Link>
                  <p className="text-foreground/60">
                    {dateFormatter.format(new Date(invoice.starts_at))} – {dateFormatter.format(new Date(invoice.ends_at))} ·{" "}
                    {totals.nights} nuit{totals.nights > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-foreground/50">
                    Total {totals.total.toLocaleString("fr-FR")} {invoice.currency} · Reste{" "}
                    <span className={totals.remaining > 0 ? "text-red-600" : "text-emerald-600"}>
                      {totals.remaining.toLocaleString("fr-FR")} {invoice.currency}
                    </span>
                  </p>
                </div>
                <form action={deleteExternalBooking.bind(null, id, invoice.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Supprimer
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
