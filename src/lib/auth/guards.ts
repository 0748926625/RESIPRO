import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/constants/roles";
import type { Viewer } from "./session";

// Server-side, defense-in-depth guard for role-scoped route groups. src/proxy.ts already
// redirects unauthenticated requests away from /client, /owner, /admin; this additionally
// enforces the *correct* role and must never be skipped just because the proxy ran (§53:
// never rely on a single layer, especially not the frontend, for access control).
export function requireRole(
  viewer: Viewer,
  allowed: readonly UserRole[],
): asserts viewer is Extract<Viewer, { role: UserRole }> {
  if (viewer.role === "visitor") {
    redirect("/login");
  }
  if (!allowed.includes(viewer.role)) {
    redirect("/");
  }
}
