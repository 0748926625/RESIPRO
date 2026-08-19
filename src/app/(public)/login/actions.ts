"use server";

import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/constants/roles";
import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth.schema";

export type LoginActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function login(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile?.role ?? "client") as UserRole;

  redirect(next && next.startsWith("/") ? next : dashboardPathForRole(role));
}
