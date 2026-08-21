"use server";

import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/constants/roles";
import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, magicLinkSchema } from "@/lib/validations/auth.schema";

export type LoginActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type MagicLinkActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// Passwordless: one email field, no separate "create an account" step — a first-time
// address gets a profile via handle_new_user() (0016) the moment the link is clicked,
// defaulting to role 'client' since that's this flow's whole point (frictionless
// booking). Owners still go through /register, which needs their explicit role choice.
export async function sendMagicLink(
  _prevState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // Not /auth/callback: that route only handles the ?code= (PKCE) exchange used by
  // signup confirmation and password reset. Magic-link verification redirects with the
  // session in the URL *fragment* instead, which only a client-rendered page can read —
  // see src/app/auth/magic-link/page.tsx.
  const callbackUrl = new URL("/auth/magic-link", process.env.NEXT_PUBLIC_APP_URL);
  if (parsed.data.next && parsed.data.next.startsWith("/")) {
    callbackUrl.searchParams.set("next", parsed.data.next);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { error: "Impossible d'envoyer le lien pour le moment. Réessayez." };
  }

  return { success: true };
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
