"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

const REVALIDATE_PATH = "/admin/intermediation";

type IntermediationUpdate = Database["public"]["Tables"]["intermediation_requests"]["Update"];

async function updateStatus(requestId: string, fields: IntermediationUpdate) {
  const supabase = await createClient();
  await supabase.from("intermediation_requests").update(fields).eq("id", requestId);
  revalidatePath(REVALIDATE_PATH);
}

export async function markContacted(requestId: string): Promise<void> {
  await updateStatus(requestId, { status: "contacted" });
}

export async function assignProperty(requestId: string, formData: FormData): Promise<void> {
  const propertyId = formData.get("propertyId");
  if (typeof propertyId !== "string" || !propertyId) return;
  await updateStatus(requestId, { status: "residence_found", assigned_property_id: propertyId });
}

export async function markClientReferred(requestId: string): Promise<void> {
  await updateStatus(requestId, { status: "client_referred" });
}

export async function linkBooking(requestId: string, formData: FormData): Promise<void> {
  const bookingId = formData.get("bookingId");
  if (typeof bookingId !== "string" || !bookingId) return;
  await updateStatus(requestId, { status: "reservation_created", linked_booking_id: bookingId });
}

export async function markCompleted(requestId: string): Promise<void> {
  await updateStatus(requestId, { status: "completed" });
}

export async function markCancelled(requestId: string): Promise<void> {
  await updateStatus(requestId, { status: "cancelled" });
}
