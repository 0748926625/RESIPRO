import Link from "next/link";

import { PROPERTY_STATUSES, type PropertyStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

import {
  approveProperty,
  archiveProperty,
  reinstateProperty,
  rejectProperty,
  setManagerPhoneVisibility,
  suspendProperty,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  [PROPERTY_STATUSES.DRAFT]: "Brouillon",
  [PROPERTY_STATUSES.PENDING_REVIEW]: "En attente de validation",
  [PROPERTY_STATUSES.APPROVED]: "Approuvée",
  [PROPERTY_STATUSES.REJECTED]: "Refusée",
  [PROPERTY_STATUSES.SUSPENDED]: "Suspendue",
  [PROPERTY_STATUSES.ARCHIVED]: "Archivée",
};

const PHONE_VISIBILITY_LABELS: Record<string, string> = {
  hidden: "Jamais communiqué",
  admin_only: "Visible par vous uniquement",
  revealed: "Communiqué au client",
};

const FILTERS = [
  { value: "pending_review", label: "À valider" },
  { value: "approved", label: "Approuvées" },
  { value: "suspended", label: "Suspendues" },
  { value: "rejected", label: "Refusées" },
  { value: "all", label: "Toutes" },
];

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status ?? "pending_review";

  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("id, name, city, status, manager_phone_visibility, owner_id, owners(business_name, profiles(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter as PropertyStatus);
  }

  const { data } = await query;
  const properties = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    manager_phone_visibility: string;
    owner_id: string;
    owners: { business_name: string | null; profiles: { full_name: string } | null } | null;
  }>;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Résidences</h1>

      <div className="flex gap-2 text-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/properties?status=${filter.value}`}
            className={`rounded-full px-3 py-1 ${
              activeFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "border border-foreground/15 text-foreground/70"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {properties.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune résidence dans ce filtre.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {properties.map((property) => (
            <li key={property.id} className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">{property.name}</p>
                <p className="text-foreground/60">
                  {property.city} ·{" "}
                  {property.owners?.profiles?.full_name ?? property.owners?.business_name ?? "—"}
                </p>
                <p className="text-xs text-foreground/50">{STATUS_LABELS[property.status]}</p>
                <form action={setManagerPhoneVisibility.bind(null, property.id)} className="mt-1 flex items-center gap-2">
                  <label className="text-[10px] text-foreground/40">Numéro du gérant :</label>
                  <select
                    name="visibility"
                    defaultValue={property.manager_phone_visibility}
                    className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs"
                  >
                    {Object.entries(PHONE_VISIBILITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-md border border-foreground/20 px-2 py-1 text-[11px]">
                    Mettre à jour
                  </button>
                </form>
              </div>
              <div className="flex flex-wrap gap-2">
                {property.status === "pending_review" ? (
                  <>
                    <form action={approveProperty.bind(null, property.id)}>
                      <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                        Approuver
                      </button>
                    </form>
                    <form action={rejectProperty.bind(null, property.id)}>
                      <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                        Refuser
                      </button>
                    </form>
                  </>
                ) : null}
                {property.status === "approved" ? (
                  <form action={suspendProperty.bind(null, property.id)}>
                    <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                      Suspendre
                    </button>
                  </form>
                ) : null}
                {property.status === "suspended" ? (
                  <form action={reinstateProperty.bind(null, property.id)}>
                    <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                      Réactiver
                    </button>
                  </form>
                ) : null}
                {property.status !== "archived" ? (
                  <form action={archiveProperty.bind(null, property.id)}>
                    <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                      Archiver
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
