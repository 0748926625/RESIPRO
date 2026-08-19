import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database.types";

// Browser-side client: uses the public anon key, subject to RLS. Safe to import from
// Client Components.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
