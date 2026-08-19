import { PropertyForm } from "@/components/property/property-form";
import { createClient } from "@/lib/supabase/server";

import { createProperty } from "./actions";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const { data: amenities } = await supabase.from("amenities").select("id, label").order("label");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Nouvelle résidence</h1>
        <p className="text-sm text-foreground/60">
          Elle restera en brouillon jusqu&apos;à ce que vous la soumettiez pour validation.
        </p>
      </div>
      <PropertyForm action={createProperty} amenities={amenities ?? []} submitLabel="Créer la résidence" />
    </div>
  );
}
