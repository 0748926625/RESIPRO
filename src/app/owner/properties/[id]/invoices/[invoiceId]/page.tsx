import Link from "next/link";
import { notFound } from "next/navigation";

import { DownloadPdfButton } from "@/components/invoice/download-pdf-button";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { RecordPaymentForm } from "@/components/invoice/record-payment-form";
import { WhatsAppShareButton } from "@/components/invoice/whatsapp-share-button";
import { computeInvoiceTotals } from "@/lib/services/external-booking.service";
import { createClient } from "@/lib/supabase/server";

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
  const ownerLabel = owner?.business_name ?? owner?.profiles?.full_name ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 print:py-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/owner/properties/${id}/invoices`} className="text-xs text-foreground/60 underline">
          ← Factures
        </Link>
        <div className="flex items-center gap-2">
          <WhatsAppShareButton
            invoiceId={invoice.id}
            propertyName={property.name}
            clientName={invoice.client_name}
            total={totals.total}
            remaining={totals.remaining}
            currency={invoice.currency}
          />
          <DownloadPdfButton invoiceId={invoice.id} />
        </div>
      </div>

      <InvoiceDocument
        propertyName={property.name}
        propertyCity={property.city}
        propertyAddress={property.address}
        logoUrl={property.logo_url}
        signatureUrl={property.signature_url}
        ownerLabel={ownerLabel}
        ownerPhone={owner?.profiles?.phone ?? null}
        clientName={invoice.client_name}
        startsAt={invoice.starts_at}
        endsAt={invoice.ends_at}
        nightlyRate={invoice.nightly_rate}
        amountPaid={invoice.amount_paid}
        currency={invoice.currency}
        note={invoice.note}
        createdAt={invoice.created_at}
      />

      {totals.remaining > 0 ? (
        <RecordPaymentForm
          propertyId={id}
          invoiceId={invoice.id}
          remaining={totals.remaining}
          currency={invoice.currency}
        />
      ) : null}
    </div>
  );
}
