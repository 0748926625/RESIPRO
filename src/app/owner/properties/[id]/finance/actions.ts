"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  cashTransactionSchema,
  expenseSchema,
  incomeSchema,
  recurringChargeSchema,
} from "@/lib/validations/finance.schema";

export type FinanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function revalidate(propertyId: string) {
  revalidatePath(`/owner/properties/${propertyId}/finance`);
}

export async function createExpense(
  propertyId: string,
  _prevState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    expenseDate: formData.get("expenseDate"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise." };

  const { error } = await supabase.from("expenses").insert({
    property_id: propertyId,
    category_id: parsed.data.categoryId ?? null,
    amount: parsed.data.amount,
    description: parsed.data.description ?? null,
    expense_date: parsed.data.expenseDate,
    recorded_by: user.id,
  });
  if (error) return { error: "Impossible d'enregistrer la dépense." };

  revalidate(propertyId);
  return {};
}

export async function createIncome(
  propertyId: string,
  _prevState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = incomeSchema.safeParse({
    amount: formData.get("amount"),
    incomeDate: formData.get("incomeDate"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise." };

  const { error } = await supabase.from("income_transactions").insert({
    property_id: propertyId,
    source: "other",
    amount: parsed.data.amount,
    income_date: parsed.data.incomeDate,
    recorded_by: user.id,
  });
  if (error) return { error: "Impossible d'enregistrer le revenu." };

  revalidate(propertyId);
  return {};
}

export async function createRecurringCharge(
  propertyId: string,
  _prevState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = recurringChargeSchema.safeParse({
    label: formData.get("label"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    nextDueDate: formData.get("nextDueDate"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_charges").insert({
    property_id: propertyId,
    label: parsed.data.label,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    next_due_date: parsed.data.nextDueDate,
  });
  if (error) return { error: "Impossible d'enregistrer la charge récurrente." };

  revalidate(propertyId);
  return {};
}

export async function deactivateRecurringCharge(propertyId: string, chargeId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("recurring_charges").update({ is_active: false }).eq("id", chargeId).eq("property_id", propertyId);
  revalidate(propertyId);
}

export async function createCashTransaction(
  propertyId: string,
  _prevState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = cashTransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise." };

  const { error } = await supabase.from("cash_transactions").insert({
    property_id: propertyId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    performed_by: user.id,
  });
  if (error) return { error: "Impossible d'enregistrer l'opération de caisse." };

  revalidate(propertyId);
  return {};
}

export async function reverseCashTransaction(propertyId: string, transactionId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("reverse_cash_transaction", { p_transaction_id: transactionId });
  revalidate(propertyId);
}
