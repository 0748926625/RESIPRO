import { renderToBuffer } from "@react-pdf/renderer";

import { InvoicePdfDocument } from "@/components/invoice/invoice-pdf-document";
import { createClient } from "@/lib/supabase/server";

// Same access model as the public invoice page (../page.tsx): get_public_invoice (0040) is
// a SECURITY DEFINER function scoped to one exact id, so the invoice's UUID is the access
// key — no auth required, no enumeration possible.
export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_invoice", { p_invoice_id: invoiceId }).maybeSingle();

  if (!data) {
    return new Response("Facture introuvable.", { status: 404 });
  }

  const pdfBuffer = await renderToBuffer(
    InvoicePdfDocument({
      propertyName: data.property_name,
      propertyCity: data.property_city,
      propertyAddress: data.property_address,
      logoUrl: data.logo_url,
      signatureUrl: data.signature_url,
      ownerLabel: data.owner_business_name ?? data.owner_full_name,
      ownerPhone: data.owner_phone,
      clientName: data.client_name,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      nightlyRate: data.nightly_rate,
      amountPaid: data.amount_paid,
      currency: data.currency,
      note: data.note,
      createdAt: data.created_at,
    }),
  );

  const safeClientName = data.client_name.replace(/[^a-zA-Z0-9-]+/g, "-");
  const filename = `facture-${safeClientName}-${data.starts_at}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
