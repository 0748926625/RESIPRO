import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Handles the redirect after a signup confirmation email (§25 "vérification email si
// activée"). Password recovery links go straight to /reset-password instead, since that
// page needs the exchanged session to update the password in place.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
