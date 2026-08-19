"use server";

import { revalidatePath } from "next/cache";

import { PROPERTY_STATUSES, type PropertyStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

async function setStatus(propertyId: string, newStatus: PropertyStatus, allowedFrom: PropertyStatus[]) {
  const supabase = await createClient();

  await supabase.rpc("set_property_status", {
    p_property_id: propertyId,
    p_new_status: newStatus,
    p_allowed_from: allowedFrom,
  });

  revalidatePath("/admin/properties");
  revalidatePath(`/owner/properties/${propertyId}`);
}

export async function approveProperty(propertyId: string) {
  await setStatus(propertyId, PROPERTY_STATUSES.APPROVED, [PROPERTY_STATUSES.PENDING_REVIEW]);
}

export async function rejectProperty(propertyId: string) {
  await setStatus(propertyId, PROPERTY_STATUSES.REJECTED, [PROPERTY_STATUSES.PENDING_REVIEW]);
}

export async function suspendProperty(propertyId: string) {
  await setStatus(propertyId, PROPERTY_STATUSES.SUSPENDED, [PROPERTY_STATUSES.APPROVED]);
}

export async function reinstateProperty(propertyId: string) {
  await setStatus(propertyId, PROPERTY_STATUSES.APPROVED, [PROPERTY_STATUSES.SUSPENDED]);
}

export async function archiveProperty(propertyId: string) {
  await setStatus(propertyId, PROPERTY_STATUSES.ARCHIVED, [
    PROPERTY_STATUSES.DRAFT,
    PROPERTY_STATUSES.PENDING_REVIEW,
    PROPERTY_STATUSES.APPROVED,
    PROPERTY_STATUSES.REJECTED,
    PROPERTY_STATUSES.SUSPENDED,
  ]);
}
