"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { propertyFormDataToInput, propertyInputSchema } from "@/lib/validations/property.schema";

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateProperty(
  propertyId: string,
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = propertyInputSchema.safeParse(propertyFormDataToInput(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const input = parsed.data;

  const { error } = await supabase
    .from("properties")
    .update({
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
      manager_phone_visibility: input.managerPhoneVisibility,
    })
    .eq("id", propertyId);

  if (error) {
    return { error: "Impossible de mettre à jour la résidence." };
  }

  // Simplest correct way to keep the join table in sync with a checkbox list: replace
  // the full set rather than diffing it.
  await supabase.from("property_amenities").delete().eq("property_id", propertyId);
  if (input.amenityIds.length > 0) {
    await supabase
      .from("property_amenities")
      .insert(input.amenityIds.map((amenityId) => ({ property_id: propertyId, amenity_id: amenityId })));
  }

  revalidatePath(`/owner/properties/${propertyId}`);
  return {};
}

export async function submitForReview(propertyId: string) {
  const supabase = await createClient();

  // Only a draft or a previously-rejected listing can be (re-)submitted (§37).
  await supabase
    .from("properties")
    .update({ status: "pending_review" })
    .eq("id", propertyId)
    .in("status", ["draft", "rejected"]);

  revalidatePath(`/owner/properties/${propertyId}`);
}

export async function deletePropertyImage(propertyId: string, imageId: string, path: string) {
  const supabase = await createClient();

  await supabase.storage.from("property-images").remove([path]);
  await supabase.from("property_images").delete().eq("id", imageId).eq("property_id", propertyId);

  revalidatePath(`/owner/properties/${propertyId}`);
}
