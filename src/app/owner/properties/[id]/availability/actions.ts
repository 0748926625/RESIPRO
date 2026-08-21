"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  availabilityBlockSchema,
  availabilityRuleSchema,
  QUICK_BLOCK_NOTE,
} from "@/lib/validations/availability.schema";

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

// Quick-mark calendar tool: tap (or drag across) whole days to mark them occupied — for
// bookings taken outside the platform — without filling the start/end/reason form each
// time. `dates` are "YYYY-MM-DD"; each becomes (or removes) a full-day "manual" block
// tagged with QUICK_BLOCK_NOTE so a repeat tap only ever toggles blocks this tool made.
export async function setQuickBlocks(propertyId: string, dates: string[], occupied: boolean) {
  if (dates.length === 0) return;

  const supabase = await createClient();

  if (occupied) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = dates.map((date) => ({
      property_id: propertyId,
      starts_at: new Date(`${date}T00:00:00`).toISOString(),
      ends_at: new Date(`${date}T23:59:59`).toISOString(),
      reason: "manual" as const,
      note: QUICK_BLOCK_NOTE,
      created_by: user?.id ?? null,
    }));

    await supabase.from("availability_blocks").insert(rows);
  } else {
    const startsAtList = dates.map((date) => new Date(`${date}T00:00:00`).toISOString());
    await supabase
      .from("availability_blocks")
      .delete()
      .eq("property_id", propertyId)
      .eq("note", QUICK_BLOCK_NOTE)
      .in("starts_at", startsAtList);
  }

  revalidatePath(`/owner/properties/${propertyId}/availability`);
}

// Tags the quick-marked blocks for these dates with a client name, purely so the calendar
// can color-code consecutive stays by client (month-calendar.tsx) — called right after
// marking dates occupied, whether or not the owner goes on to generate a full invoice.
export async function tagQuickBlocksWithClient(propertyId: string, dates: string[], clientName: string) {
  const trimmed = clientName.trim();
  if (dates.length === 0 || !trimmed) return;

  const supabase = await createClient();
  const startsAtList = dates.map((date) => new Date(`${date}T00:00:00`).toISOString());

  await supabase
    .from("availability_blocks")
    .update({ client_name: trimmed })
    .eq("property_id", propertyId)
    .eq("note", QUICK_BLOCK_NOTE)
    .in("starts_at", startsAtList);

  revalidatePath(`/owner/properties/${propertyId}/availability`);
}
