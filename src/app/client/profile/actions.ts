"use server";

import { revalidatePath } from "next/cache";

import type { ProfileFormState } from "@/components/settings/profile-form";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations/settings.schema";

export async function updateClientProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
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

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ?? null })
    .eq("id", user.id);

  if (error) {
    return { error: "Impossible d'enregistrer le profil." };
  }

  revalidatePath("/client/profile");
  return { success: true };
}
