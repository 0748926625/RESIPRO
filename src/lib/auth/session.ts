import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/constants/roles";

export type Viewer =
  | { role: UserRole; profileId: string; fullName: string }
  | { role: "visitor" };

// Resolves the current request's viewer from the Supabase session + profiles row.
// Server-only (reads cookies via src/lib/supabase/server.ts).
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: "visitor" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { role: "visitor" };
  }

  return { role: profile.role, profileId: user.id, fullName: profile.full_name };
}
