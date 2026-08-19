"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { availabilityBlockSchema, availabilityRuleSchema } from "@/lib/validations/availability.schema";

export type AvailabilityFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createRule(
  propertyId: string,
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const parsed = availabilityRuleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    openTime: formData.get("openTime"),
    closeTime: formData.get("closeTime"),
    minDurationMinutes: formData.get("minDurationMinutes") || 60,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // No .select() chained: see the note in owner/properties/new/actions.ts about
  // INSERT ... RETURNING failing once the SELECT policy consults another table (here,
  // availability_rules_manage's ownership check against "properties"). We don't need
  // the new row's id back, so a plain insert is enough.
  const { error } = await supabase.from("availability_rules").insert({
    property_id: propertyId,
    day_of_week: parsed.data.dayOfWeek,
    open_time: parsed.data.openTime,
    close_time: parsed.data.closeTime,
    min_duration_minutes: parsed.data.minDurationMinutes,
  });

  if (error) {
    return { error: "Impossible d'ajouter ce créneau." };
  }

  revalidatePath(`/owner/properties/${propertyId}/availability`);
  return {};
}

export async function deleteRule(propertyId: string, ruleId: string) {
  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", ruleId).eq("property_id", propertyId);
  revalidatePath(`/owner/properties/${propertyId}/availability`);
}

export async function createBlock(
  propertyId: string,
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const parsed = availabilityBlockSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("availability_blocks").insert({
    property_id: propertyId,
    starts_at: new Date(parsed.data.startsAt).toISOString(),
    ends_at: new Date(parsed.data.endsAt).toISOString(),
    reason: parsed.data.reason,
    note: parsed.data.note ?? null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: "Impossible d'ajouter ce blocage." };
  }

  revalidatePath(`/owner/properties/${propertyId}/availability`);
  return {};
}

export async function deleteBlock(propertyId: string, blockId: string) {
  const supabase = await createClient();
  await supabase.from("availability_blocks").delete().eq("id", blockId).eq("property_id", propertyId);
  revalidatePath(`/owner/properties/${propertyId}/availability`);
}
