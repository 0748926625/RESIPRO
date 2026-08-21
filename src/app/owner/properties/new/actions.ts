"use server";

import { redirect } from "next/navigation";

import { slugify } from "@/lib/services/property.service";
import { createClient } from "@/lib/supabase/server";
import { propertyFormDataToInput, propertyInputSchema } from "@/lib/validations/property.schema";

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProperty(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = propertyInputSchema.safeParse(propertyFormDataToInput(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentification requise." };
  }

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!owner) {
    return { error: "Profil propriétaire introuvable." };
  }

  const input = parsed.data;
  const base = slugify(input.name) || "residence";
  let slug = base;
  let propertyId: string | null = null;

  for (let attempt = 0; attempt < 3 && !propertyId; attempt++) {
    // Deliberately not chaining .select() here (no INSERT ... RETURNING): with RLS
    // enabled, that combination reliably 42501s the moment the SELECT policy consults
    // another table (here, properties_select_public_approved's ownership check against
    // "owners") — reproduced directly against Postgres, independent of supabase-js and
    // of which function/expression backs the check. A plain INSERT plus a follow-up
    // SELECT is the reliable pattern.
    const { error } = await supabase.from("properties").insert({
      owner_id: owner.id,
      slug,
      name: input.name,
      description: input.description ?? null,
      property_type: input.propertyType,
      city: input.city,
      neighborhood: input.neighborhood ?? null,
      address: input.address ?? null,
      capacity: input.capacity,
      bedrooms: input.bedrooms,
      base_price: input.basePrice,
      currency: input.currency,
      check_in_time: input.checkInTime ?? null,
      check_out_time: input.checkOutTime ?? null,
      cleaning_buffer_minutes: input.cleaningBufferMinutes,
      house_rules: input.houseRules ?? null,
      allows_half_day: input.allowsHalfDay,
      // manager_phone_visibility deliberately omitted: defaults to 'admin_only' in the
      // DB, and only the Super Admin can change it (see admin/properties) — an owner
      // must never be able to self-reveal their phone to a client.
    });

    if (error) {
      // Unique violation on the slug — retry once with a random suffix.
      if (error.code === "23505") {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      return { error: "Impossible de créer la résidence." };
    }

    const { data: created } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", slug)
      .eq("owner_id", owner.id)
      .single();

    propertyId = created?.id ?? null;
  }

  if (!propertyId) {
    return { error: "Impossible de créer la résidence, réessayez." };
  }

  if (input.amenityIds.length > 0) {
    await supabase
      .from("property_amenities")
      .insert(input.amenityIds.map((amenityId) => ({ property_id: propertyId, amenity_id: amenityId })));
  }

  redirect(`/owner/properties/${propertyId}?created=1`);
}
