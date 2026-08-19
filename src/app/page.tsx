import { SearchForm } from "@/components/marketplace/search-form";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: amenities } = await supabase.from("amenities").select("id, label").order("label");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Residence Pro</h1>
        <p className="text-sm text-foreground/60">
          Résidences meublées à réserver — seul, ou à deux en réservation partagée.
        </p>
      </div>
      <SearchForm amenities={amenities ?? []} defaultValues={{}} />
    </div>
  );
}
