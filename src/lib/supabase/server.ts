import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types/database.types";

// Server-side client for Server Components / Route Handlers / Server Actions: still uses
// the anon key and is subject to RLS, but carries the caller's session via cookies.
// `cookies()` is async as of Next.js 16.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no response to write to — safe to
            // ignore as long as the proxy (see src/proxy.ts) refreshes the session.
          }
        },
      },
    },
  );
}
