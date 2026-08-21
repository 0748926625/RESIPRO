import { PROFILE_STATUS_LABELS, type ProfileStatus } from "@/lib/constants/statuses";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { activateUser, suspendUser } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  owner: "Propriétaire / gérant",
  client: "Client",
};

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  status: ProfileStatus;
  created_at: string;
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const profiles = (data ?? []) as ProfileRow[];

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? "—"]));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Utilisateurs</h1>

      {profiles.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucun utilisateur.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {profiles.map((profile) => (
            <li key={profile.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{profile.full_name}</p>
                <p className="text-foreground/60">
                  {emailById.get(profile.id) ?? "—"} {profile.phone ? `· ${profile.phone}` : ""}
                </p>
                <p className="text-xs text-foreground/50">
                  {ROLE_LABELS[profile.role] ?? profile.role} · {PROFILE_STATUS_LABELS[profile.status]}
                </p>
              </div>
              {profile.id === user!.id ? (
                <span className="text-xs text-foreground/40">Vous</span>
              ) : profile.status === "active" ? (
                <form action={suspendUser.bind(null, profile.id)}>
                  <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                    Suspendre
                  </button>
                </form>
              ) : (
                <form action={activateUser.bind(null, profile.id)}>
                  <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                    Réactiver
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
