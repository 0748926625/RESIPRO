import { createClient } from "@/lib/supabase/server";

import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("platform_settings").select("key, value");

  const settings = Object.fromEntries((rows ?? []).map((row) => [row.key, row.value]));
  const asString = (value: unknown, fallback = "") =>
    value === null || value === undefined ? fallback : String(value);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Paramètres plateforme</h1>
        <p className="text-sm text-foreground/60">
          Nom, contact, configuration Mobile Money et commission — modifiables ici uniquement.
        </p>
      </div>
      <SettingsForm
        defaultValues={{
          platformName: asString(settings.platform_name, "Residence Pro"),
          contactEmail: asString(settings.contact_email),
          contactPhone: asString(settings.contact_phone),
          paymentOperator: asString(settings.payment_operator),
          paymentPhone: asString(settings.payment_phone),
          paymentRecipientName: asString(settings.payment_recipient_name),
          paymentInstructions: asString(settings.payment_instructions),
          commissionType: asString(settings.commission_type, "percentage"),
          commissionValue: asString(settings.commission_value, "10"),
        }}
      />
    </div>
  );
}
