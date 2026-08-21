import { notFound } from "next/navigation";

import { PrintButton } from "@/components/calendar/print-button";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { createClient } from "@/lib/supabase/server";

// Public, unauthenticated view: shared with a client over WhatsApp/SMS/email. Reads via
// get_public_invoice() (0040), a SECURITY DEFINER function scoped to one exact invoice id —
// the invoice's UUID is the access key, there is no listing/enumeration path.
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_invoice", { p_invoice_id: invoiceId }).maybeSingle();

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 print:py-0">
      <div className="flex items-center justify-end print:hidden">
        <PrintButton />
      </div>

      <InvoiceDocument
        propertyName={data.property_name}
        propertyCity={data.property_city}
        propertyAddress={data.property_address}
        logoUrl={data.logo_url}
        signatureUrl={data.signature_url}
        ownerLabel={data.owner_business_name ?? data.owner_full_name}
        ownerPhone={data.owner_phone}
        clientName={data.client_name}
        startsAt={data.starts_at}
        endsAt={data.ends_at}
        nightlyRate={data.nightly_rate}
        amountPaid={data.amount_paid}
        currency={data.currency}
        note={data.note}
        createdAt={data.created_at}
      />
    </div>
  );
}
