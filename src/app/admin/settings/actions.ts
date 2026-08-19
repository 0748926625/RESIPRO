"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { platformSettingsSchema } from "@/lib/validations/settings.schema";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function updatePlatformSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = platformSettingsSchema.safeParse({
    platformName: formData.get("platformName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    paymentOperator: formData.get("paymentOperator"),
    paymentPhone: formData.get("paymentPhone"),
    paymentRecipientName: formData.get("paymentRecipientName"),
    paymentInstructions: formData.get("paymentInstructions"),
    commissionType: formData.get("commissionType"),
    commissionValue: formData.get("commissionValue"),
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

  const data = parsed.data;
  const rows = [
    { key: "platform_name", value: data.platformName },
    { key: "contact_email", value: data.contactEmail ?? null },
    { key: "contact_phone", value: data.contactPhone ?? null },
    { key: "payment_operator", value: data.paymentOperator },
    { key: "payment_phone", value: data.paymentPhone },
    { key: "payment_recipient_name", value: data.paymentRecipientName },
    { key: "payment_instructions", value: data.paymentInstructions ?? null },
    { key: "commission_type", value: data.commissionType },
    { key: "commission_value", value: data.commissionValue },
  ].map((row) => ({ key: row.key, value: row.value, updated_by: user.id }));

  const { error } = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    return { error: "Impossible d'enregistrer les paramètres." };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
