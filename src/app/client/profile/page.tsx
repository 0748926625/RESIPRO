import { ProfileForm } from "@/components/settings/profile-form";
import { createClient } from "@/lib/supabase/server";

import { updateClientProfile } from "./actions";

export default async function ClientProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Mon profil</h1>
      <ProfileForm
        action={updateClientProfile}
        email={user!.email ?? ""}
        defaultValues={{ fullName: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
      />
    </div>
  );
}
