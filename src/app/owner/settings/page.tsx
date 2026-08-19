import { ProfileForm } from "@/components/settings/profile-form";
import { createClient } from "@/lib/supabase/server";

import { updateOwnerProfile } from "./actions";

export default async function OwnerSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: owner }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user!.id).single(),
    supabase.from("owners").select("business_name").eq("profile_id", user!.id).single(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Paramètres</h1>
      <ProfileForm
        action={updateOwnerProfile}
        email={user!.email ?? ""}
        showBusinessName
        defaultValues={{
          fullName: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          businessName: owner?.business_name ?? "",
        }}
      />
    </div>
  );
}
