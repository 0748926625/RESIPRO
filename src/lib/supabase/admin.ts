import "server-only";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database.types";

// Service-role client: bypasses RLS entirely. Never import this from a Client Component
// or expose SUPABASE_SERVICE_ROLE_KEY to the browser (§24). Reserved for trusted
// server-only operations: admin dashboards, notification dispatch, expiration sweeps.
export function createAdminClient() {
  return createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
