import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/calendar/print-button";
import { computeInvoiceTotals } from "@/lib/services/external-booking.service";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await params;

  const supabase = await createClient();
  const [{ data: property }, { data: invoice }] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, name, city, address, logo_url, signature_url, owner_id, owners(business_name, profiles(full_name, phone))",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("external_bookings")
      .select("id, client_name, starts_at, ends_at, nightly_rate, amount_paid, currency, note, created_at")
      .eq("id", invoiceId)
      .eq("property_id", id)
      .single(),
  ]);

  if (!property || !invoice) {
    notFound();
  }

  const totals = computeInvoiceTotals({
    startsAt: invoice.starts_at,
    endsAt: invoice.ends_at,
    nightlyRate: invoice.nightly_rate,
    amountPaid: invoice.amount_paid,
  });
  const owner = property.owners as unknown as {
    business_name: string | null;
    profiles: { full_name: string; phone: string | null } | null;
  } | null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 print:py-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/owner/properties/${id}/invoices`} className="text-xs text-foreground/60 underline">
          ← Factures
        </Link>
        <PrintButton />
      </div>

      <div className="flex flex-col gap-8 rounded-lg border border-foreground/10 p-8 print:border-none print:p-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {property.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.logo_url}
                alt={`Logo ${property.name}`}
                className="h-14 w-14 rounded-md border border-foreground/10 object-contain"
              />
            ) : null}
            <div>
              <h1 className="text-lg font-semibold text-foreground">Facture — {property.name}</h1>
              <p className="text-sm text-foreground/60">
                {property.city}
                {property.address ? `, ${property.address}` : ""}
              </p>
              {owner?.business_name || owner?.profiles?.full_name ? (
                <p className="text-sm text-foreground/60">
                  {owner.business_name ?? owner.profiles?.full_name}
                  {owner.profiles?.phone ? ` · ${owner.profiles.phone}` : ""}
                </p>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-foreground/50">Émise le {dateFormatter.format(new Date(invoice.created_at))}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground/50">Client</p>
          <p className="text-base font-medium text-foreground">{invoice.client_name}</p>
        </div>

        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-foreground/10">
              <td className="py-2 text-foreground/60">Période</td>
              <td className="py-2 text-right text-foreground">
                {dateFormatter.format(new Date(invoice.starts_at))} → {dateFormatter.format(new Date(invoice.ends_at))}
              </td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="py-2 text-foreground/60">Nombre de nuits</td>
              <td className="py-2 text-right text-foreground">{totals.nights}</td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="py-2 text-foreground/60">Prix négocié / nuit</td>
              <td className="py-2 text-right text-foreground">
                {invoice.nightly_rate.toLocaleString("fr-FR")} {invoice.currency}
              </td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="py-2 font-medium text-foreground">Total à payer</td>
              <td className="py-2 text-right font-medium text-foreground">
                {totals.total.toLocaleString("fr-FR")} {invoice.currency}
              </td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="py-2 text-foreground/60">Montant avancé</td>
              <td className="py-2 text-right text-foreground">
                {invoice.amount_paid.toLocaleString("fr-FR")} {invoice.currency}
              </td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="py-2 font-medium text-foreground">Reste à payer</td>
              <td
                className={`py-2 text-right text-base font-semibold ${
                  totals.remaining > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {totals.remaining.toLocaleString("fr-FR")} {invoice.currency}
              </td>
            </tr>
          </tbody>
        </table>

        {invoice.note ? <p className="text-xs text-foreground/50">{invoice.note}</p> : null}

        {property.signature_url ? (
          <div className="flex flex-col items-end gap-1 self-end">
            <p className="text-xs text-foreground/50">Signature</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={property.signature_url}
              alt="Signature"
              className="h-16 w-40 object-contain"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
