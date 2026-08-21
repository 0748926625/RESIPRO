"use server";

import { revalidatePath } from "next/cache";

import { computeInvoiceTotals } from "@/lib/services/external-booking.service";
import { createClient } from "@/lib/supabase/server";
import { externalBookingSchema, invoicePaymentSchema } from "@/lib/validations/external-booking.schema";

export type CreateInvoiceResult = { id: string } | { error: string };

// Mirrors real cash received on an off-platform invoice into the same
// income_transactions/cash_transactions tables the finance pages read, exactly like a
// manually-recorded "other" income entry — shared by invoice creation and by recording a
// later top-up payment, so both show up in Finances without a separate reconciliation step.
async function recordIncomeAndCash(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { propertyId: string; amount: number; userId: string; reason: string },
) {
  const { data: income } = await supabase
    .from("income_transactions")
    .insert({
      property_id: input.propertyId,
      source: "other",
      amount: input.amount,
      recorded_by: input.userId,
    })
    .select("id")
    .single();

  if (income) {
    await supabase.from("cash_transactions").insert({
      property_id: input.propertyId,
      type: "in",
      amount: input.amount,
      reason: input.reason,
      performed_by: input.userId,
      related_income_id: income.id,
    });
  }
}

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

  if (parsed.data.amountPaid > 0 && user) {
    await recordIncomeAndCash(supabase, {
      propertyId,
      amount: parsed.data.amountPaid,
      userId: user.id,
      reason: `Avance reçue — facture ${parsed.data.clientName}`,
    });

    revalidatePath(`/owner/properties/${propertyId}/finance`);
    revalidatePath(`/owner/finance`);
  }

  return { id: created.id };
}

export type RecordPaymentState = {
  error?: string;
};

// Records a further payment against an existing invoice (the "client verse le reste"
// case) — external_bookings has no edit UI otherwise, so without this the owner had no way
// to reflect a later top-up and "reste à payer" would stay wrong forever. Adds to
// amount_paid rather than replacing it, and mirrors just the increment into Finances (the
// original amount was already recorded at creation).
export async function recordInvoicePayment(
  propertyId: string,
  invoiceId: string,
  _prevState: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  const parsed = invoicePaymentSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Montant invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Authentification requise." };
  }

  const { data: invoice } = await supabase
    .from("external_bookings")
    .select("client_name, starts_at, ends_at, nightly_rate, amount_paid, currency")
    .eq("id", invoiceId)
    .eq("property_id", propertyId)
    .single();

  if (!invoice) {
    return { error: "Facture introuvable." };
  }

  const totals = computeInvoiceTotals({
    startsAt: invoice.starts_at,
    endsAt: invoice.ends_at,
    nightlyRate: invoice.nightly_rate,
    amountPaid: invoice.amount_paid,
  });

  if (parsed.data.amount > totals.remaining) {
    return {
      error: `Le montant dépasse le reste à payer (${totals.remaining.toLocaleString("fr-FR")} ${invoice.currency}).`,
    };
  }

  const { error } = await supabase
    .from("external_bookings")
    .update({ amount_paid: invoice.amount_paid + parsed.data.amount })
    .eq("id", invoiceId)
    .eq("property_id", propertyId);

  if (error) {
    return { error: "Impossible d'enregistrer ce paiement." };
  }

  await recordIncomeAndCash(supabase, {
    propertyId,
    amount: parsed.data.amount,
    userId: user.id,
    reason: `Paiement complémentaire — facture ${invoice.client_name}`,
  });

  revalidatePath(`/owner/properties/${propertyId}/invoices/${invoiceId}`);
  revalidatePath(`/owner/properties/${propertyId}/invoices`);
  revalidatePath(`/owner/properties/${propertyId}/finance`);
  revalidatePath(`/owner/finance`);

  return {};
}

export async function deleteExternalBooking(propertyId: string, invoiceId: string) {
  const supabase = await createClient();
  await supabase.from("external_bookings").delete().eq("id", invoiceId).eq("property_id", propertyId);
  revalidatePath(`/owner/properties/${propertyId}/invoices`);
}
