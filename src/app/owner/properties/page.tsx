import Link from "next/link";

import { PROPERTY_STATUSES } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  [PROPERTY_STATUSES.DRAFT]: "Brouillon",
  [PROPERTY_STATUSES.PENDING_REVIEW]: "En attente de validation",
  [PROPERTY_STATUSES.APPROVED]: "Approuvée",
  [PROPERTY_STATUSES.REJECTED]: "Refusée",
  [PROPERTY_STATUSES.SUSPENDED]: "Suspendue",
  [PROPERTY_STATUSES.ARCHIVED]: "Archivée",
};

export default async function OwnerPropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, city, status, base_price, currency")
    .eq("owner_id", owner?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mes résidences</h1>
        <Link
          href="/owner/properties/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Nouvelle résidence
        </Link>
      </div>

      {!properties || properties.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucune résidence pour le moment. Créez-en une pour commencer.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/owner/properties/${property.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-foreground/5"
              >
                <div>
                  <p className="font-medium text-foreground">{property.name}</p>
                  <p className="text-foreground/60">{property.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-foreground/60">
                    {STATUS_LABELS[property.status] ?? property.status}
                  </span>
                  <span className="text-foreground/80">
                    {property.base_price} {property.currency}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
