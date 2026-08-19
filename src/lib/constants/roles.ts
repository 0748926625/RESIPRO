// Mirrors the `user_role` Postgres enum (supabase/migrations/0002_enums.sql).
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  CLIENT: "client",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// A visitor is simply the absence of a session — not a stored role.
export type Viewer = { role: UserRole; profileId: string } | { role: "visitor" };
