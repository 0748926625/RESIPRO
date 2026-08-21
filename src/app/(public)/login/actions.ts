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

// OAuth accounts are provisioned the same way password accounts are (handle_new_user(),
// 0016) — Google never supplies a role hint, so a first-time Google sign-in always lands
// as 'client', same as the default for any signup that doesn't explicitly ask for 'owner'.
// Owners still go through /register for their explicit role choice.
export async function signInWithGoogle(next?: string): Promise<never> {
  const supabase = await createClient();
  const callbackUrl = new URL("/auth/callback", process.env.NEXT_PUBLIC_APP_URL);
  if (next && next.startsWith("/")) {
    callbackUrl.searchParams.set("next", next);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect("/login?error=" + encodeURIComponent("Connexion Google indisponible pour le moment."));
  }

  redirect(data.url);
}

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
