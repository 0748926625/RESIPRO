"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validations/auth.schema";

export type ResetPasswordActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updatePassword(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée, redemandez un lien de réinitialisation." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "Impossible de mettre à jour le mot de passe." };
  }

  redirect("/login");
}
