import Link from "next/link";

import { INTERMEDIATION_STATUS_LABELS, MANAGER_PHONE_VISIBILITY } from "@/lib/constants/statuses";
import type { IntermediationStatus } from "@/lib/constants/statuses";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RequestRow = {
  id: string;
  requested_city: string | null;
  requested_date: string | null;
  requested_start: string | null;
  requested_end: string | null;
  status: IntermediationStatus;
  created_at: string;
  assigned_property: {
    id: string;
    name: string;
    slug: string;
    manager_phone_visibility: string;
    owner_id: string;
  } | null;
};

export default async function ClientIntermediationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("intermediation_requests")
    .select(
      "id, requested_city, requested_date, requested_start, requested_end, status, created_at, assigned_property:properties(id, name, slug, manager_phone_visibility, owner_id)",
    )
    .eq("client_profile_id", user!.id)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as unknown as RequestRow[];

  // The manager's phone is never public (§6). It's only fetched here, server-side, for a
  // property the platform has explicitly marked "revealed" for this specific
  // intermediation — a normal client session could never read another user's phone
  // directly (profiles RLS blocks it), so this one narrow, conditional lookup uses the
  // service-role client instead of trying to express it as an RLS policy.
  const revealedOwnerIds = requests
    .filter((request) => request.assigned_property?.manager_phone_visibility === MANAGER_PHONE_VISIBILITY.REVEALED)
    .map((request) => request.assigned_property!.owner_id);

  let ownerPhoneByOwnerId = new Map<string, string | null>();
  if (revealedOwnerIds.length > 0) {
    const admin = createAdminClient();
    const { data: owners } = await admin
      .from("owners")
      .select("id, profiles(phone)")
      .in("id", revealedOwnerIds);
    ownerPhoneByOwnerId = new Map(
      ((owners ?? []) as unknown as { id: string; profiles: { phone: string | null } | null }[]).map((owner) => [
        owner.id,
        owner.profiles?.phone ?? null,
      ]),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mes demandes personnalisées</h1>
        <Link href="/intermediation" className="text-sm underline">
          Nouvelle demande
        </Link>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune demande pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {requests.map((request) => {
            const property = request.assigned_property;
            const revealedPhone =
              property?.manager_phone_visibility === MANAGER_PHONE_VISIBILITY.REVEALED
                ? ownerPhoneByOwnerId.get(property.owner_id)
                : null;

            return (
              <li key={request.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  {request.requested_city ?? "Ville non précisée"}
                  {request.requested_date ? ` · ${request.requested_date}` : ""}
                  {request.requested_start ? ` ${request.requested_start.slice(0, 5)}` : ""}
                  {request.requested_end ? `–${request.requested_end.slice(0, 5)}` : ""}
                </p>
                <p className="text-xs text-foreground/50">{INTERMEDIATION_STATUS_LABELS[request.status]}</p>
                {property ? (
                  <div className="mt-1 rounded-md bg-foreground/5 p-2 text-xs">
                    <p className="text-foreground/80">
                      Résidence proposée :{" "}
                      <Link href={`/residences/${property.slug}`} className="underline">
                        {property.name}
                      </Link>
                    </p>
                    {revealedPhone ? <p className="text-foreground/80">Contact gérant : {revealedPhone}</p> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
