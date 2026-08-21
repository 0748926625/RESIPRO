"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { externalBookingSchema } from "@/lib/validations/external-booking.schema";

export type CreateInvoiceResult = { id: string } | { error: string };

export async function createExternalBooking(
  propertyId: string,
  input: { clientName: string; startsAt: string; endsAt: string; nightlyRate: number; amountPaid: number },
): Promise<CreateInvoiceResult> {
  const parsed = externalBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    return { error: "La date de fin doit être après la date de début." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: property } = await supabase.from("properties").select("currency").eq("id", propertyId).single();

  // No .select() chained on the insert: see the note in owner/properties/new/actions.ts
  // about INSERT ... RETURNING 42501-ing once the SELECT policy consults another table
  // (here, external_bookings_owner_select's owns_property() check against "owners"). A
  // plain insert plus a follow-up select is the reliable pattern.
  const { error } = await supabase.from("external_bookings").insert({
    property_id: propertyId,
    client_name: parsed.data.clientName,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    nightly_rate: parsed.data.nightlyRate,
    amount_paid: parsed.data.amountPaid,
    currency: property?.currency ?? "XOF",
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: "Impossible d'enregistrer la facture." };
  }

  const { data: created } = await supabase
    .from("external_bookings")
    .select("id")
    .eq("property_id", propertyId)
    .eq("client_name", parsed.data.clientName)
    .eq("starts_at", parsed.data.startsAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  revalidatePath(`/owner/properties/${propertyId}/invoices`);
  revalidatePath(`/owner/properties/${propertyId}/availability`);

  if (!created) {
    return { error: "Facture créée mais introuvable — rafraîchissez la page." };
  }

  // An advance recorded on an off-platform invoice is real cash already received — mirror
  // it into the same income_transactions/cash_transactions tables the finance pages read,
  // exactly like a manually-recorded "other" income entry, so it shows up there without a
  // separate reconciliation step.
  if (parsed.data.amountPaid > 0 && user) {
    const { data: income } = await supabase
      .from("income_transactions")
      .insert({
        property_id: propertyId,
        source: "other",
        amount: parsed.data.amountPaid,
        recorded_by: user.id,
      })
      .select("id")
      .single();

    if (income) {
      await supabase.from("cash_transactions").insert({
        property_id: propertyId,
        type: "in",
        amount: parsed.data.amountPaid,
        reason: `Avance reçue — facture ${parsed.data.clientName}`,
        performed_by: user.id,
        related_income_id: income.id,
      });
    }

    revalidatePath(`/owner/properties/${propertyId}/finance`);
    revalidatePath(`/owner/finance`);
  }

  return { id: created.id };
}

export async function deleteExternalBooking(propertyId: string, invoiceId: string) {
  const supabase = await createClient();
  await supabase.from("external_bookings").delete().eq("id", invoiceId).eq("property_id", propertyId);
  revalidatePath(`/owner/properties/${propertyId}/invoices`);
}
