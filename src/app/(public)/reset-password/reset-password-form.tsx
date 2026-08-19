"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { updatePassword, type ResetPasswordActionState } from "./actions";

const initialState: ResetPasswordActionState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <FormField
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.password}
      />
      <FormField
        label="Confirmer le mot de passe"
        name="passwordConfirmation"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.passwordConfirmation}
      />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Mettre à jour le mot de passe</SubmitButton>
    </form>
  );
}
