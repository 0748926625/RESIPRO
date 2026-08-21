import { PROFILE_STATUS_LABELS, type ProfileStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

import { unverifyOwner, verifyOwner } from "./actions";

type OwnerRow = {
  id: string;
  business_name: string | null;
  verified: boolean;
  profile_id: string;
  profiles: { full_name: string; phone: string | null; status: ProfileStatus } | null;
};

export default async function AdminOwnersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("owners")
    .select("id, business_name, verified, profile_id, profiles(full_name, phone, status)")
    .order("created_at", { ascending: false });

  const owners = (data ?? []) as unknown as OwnerRow[];
  const ownerIds = owners.map((owner) => owner.id);

  const { data: propertyRows } =
    ownerIds.length > 0
      ? await supabase.from("properties").select("owner_id").in("owner_id", ownerIds)
      : { data: [] };

  const propertyCountByOwner = new Map<string, number>();
  for (const row of propertyRows ?? []) {
    propertyCountByOwner.set(row.owner_id, (propertyCountByOwner.get(row.owner_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Propriétaires / gérants</h1>

      {owners.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucun compte propriétaire.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {owners.map((owner) => (
            <li key={owner.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {owner.profiles?.full_name ?? "—"}
                  {owner.business_name ? ` — ${owner.business_name}` : ""}
                </p>
                <p className="text-foreground/60">
                  {owner.profiles?.phone ?? "—"} · {propertyCountByOwner.get(owner.id) ?? 0} résidence(s)
                </p>
                <p className="text-xs text-foreground/50">
                  {owner.profiles ? PROFILE_STATUS_LABELS[owner.profiles.status] : "—"} ·{" "}
                  {owner.verified ? "Vérifié" : "Non vérifié"}
                </p>
              </div>
              {owner.verified ? (
                <form action={unverifyOwner.bind(null, owner.id)}>
                  <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                    Retirer la vérification
                  </button>
                </form>
              ) : (
                <form action={verifyOwner.bind(null, owner.id)}>
                  <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                    Vérifier
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
