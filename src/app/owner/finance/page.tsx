import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function OwnerFinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owner } = await supabase.from("owners").select("id").eq("profile_id", user!.id).single();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, city")
    .eq("owner_id", owner?.id ?? "")
    .order("name");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Finances</h1>

      {!properties || properties.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Créez d&apos;abord une résidence pour gérer ses finances.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/owner/properties/${property.id}/finance`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-foreground/5"
              >
                <span className="font-medium text-foreground">{property.name}</span>
                <span className="text-foreground/60">{property.city}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
