"use server";

import { revalidatePath } from "next/cache";

import type { ProfileFormState } from "@/components/settings/profile-form";
import { createClient } from "@/lib/supabase/server";
import { ownerProfileSchema } from "@/lib/validations/settings.schema";

export async function updateOwnerProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = ownerProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
  });

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

  const [{ error: profileError }, { error: ownerError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ?? null })
      .eq("id", user.id),
    supabase
      .from("owners")
      .update({ business_name: parsed.data.businessName ?? null })
      .eq("profile_id", user.id),
  ]);

  if (profileError || ownerError) {
    return { error: "Impossible d'enregistrer le profil." };
  }

  revalidatePath("/owner/settings");
  return { success: true };
}
