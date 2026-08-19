"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export function ProfileForm({
  action,
  email,
  showBusinessName,
  defaultValues,
}: {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  email: string;
  showBusinessName?: boolean;
  defaultValues: { fullName: string; phone: string; businessName?: string };
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">Email</span>
        <p className="text-sm text-foreground/60">{email}</p>
      </div>

      <FormField
        label="Nom complet"
        name="fullName"
        required
        defaultValue={defaultValues.fullName}
        errors={state.fieldErrors?.fullName}
      />
      <FormField
        label="Téléphone"
        name="phone"
        type="tel"
        defaultValue={defaultValues.phone}
        errors={state.fieldErrors?.phone}
      />
      {showBusinessName ? (
        <FormField
          label="Nom de l'entreprise / structure"
          name="businessName"
          defaultValue={defaultValues.businessName ?? ""}
          errors={state.fieldErrors?.businessName}
        />
      ) : null}

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">Profil mis à jour.</p> : null}
      <SubmitButton>Enregistrer</SubmitButton>
    </form>
  );
}
