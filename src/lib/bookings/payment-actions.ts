"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function submitPayment(paymentId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("submit_payment", { p_payment_id: paymentId });
  revalidatePath(revalidate);
}

export async function resubmitPayment(paymentId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("resubmit_payment", { p_payment_id: paymentId });
  revalidatePath(revalidate);
}

export async function confirmPayment(paymentId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("confirm_payment", { p_payment_id: paymentId });
  revalidatePath(revalidate);
}

export async function rejectPayment(paymentId: string, revalidate: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const note = formData.get("note");
  const trimmedNote = typeof note === "string" && note.trim().length > 0 ? note.trim() : undefined;
  await supabase.rpc("reject_payment", { p_payment_id: paymentId, p_note: trimmedNote });
  revalidatePath(revalidate);
}

export async function markReservedWithOwner(bookingId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("admin_mark_booking_reserved_with_owner", { p_booking_id: bookingId });
  revalidatePath(revalidate);
}

export async function ownerConfirmBooking(bookingId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("owner_confirm_booking", { p_booking_id: bookingId });
  revalidatePath(revalidate);
}
