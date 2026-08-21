import { createClient } from "@/lib/supabase/server";

import { IntermediationForm } from "./intermediation-form";

export const metadata = {
  title: "Demande personnalisée",
  description: "Vous ne trouvez pas ce qu'il vous faut ? Décrivez votre besoin, l'équipe s'en occupe.",
};

export default async function IntermediationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let defaultFullName: string | undefined;
  let defaultPhone: string | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();
    defaultFullName = profile?.full_name ?? undefined;
    defaultPhone = profile?.phone ?? undefined;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Demande personnalisée</h1>
        <p className="text-sm text-foreground/60">
          Vous ne trouvez pas ce qu&apos;il vous faut dans la recherche ? Décrivez votre besoin —
          l&apos;équipe ResiPro cherche pour vous et vous met en relation (§15).
        </p>
      </div>
      <IntermediationForm defaultFullName={defaultFullName} defaultPhone={defaultPhone} />
    </div>
  );
}
