"use server";

import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations/auth.schema";
import type { UserRole } from "@/lib/constants/roles";
import { redirect } from "next/navigation";

export type RegisterActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function register(
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { fullName, email, phone, role, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Consumed server-side by handle_new_user() (supabase/migrations/0016) — the
      // trigger itself rejects anything other than "client"/"owner", so this is safe
      // even though it travels through user-controlled metadata.
      data: { full_name: fullName, phone, role },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/login`,
    },
  });

  if (error) {
    const message =
      error.code === "user_already_exists"
        ? "Un compte existe déjà avec cet email."
        : error.code === "weak_password"
          ? "Mot de passe trop faible."
          : "Impossible de créer le compte pour le moment.";
    return { error: message };
  }

  // If email confirmation is disabled on the project, signUp already returns a session.
  if (data.session) {
    redirect(dashboardPathForRole(role as UserRole));
  }

  return { success: true };
}
