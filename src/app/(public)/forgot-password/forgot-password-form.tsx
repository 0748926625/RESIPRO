"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { requestPasswordReset, type ForgotPasswordActionState } from "./actions";

const initialState: ForgotPasswordActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium text-foreground">Email envoyé.</p>
        <p className="text-foreground/60">
          Si un compte existe avec cette adresse, un lien de réinitialisation vient d&apos;être
          envoyé.
        </p>
        <Link href="/login" className="text-foreground underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <SubmitButton>Envoyer le lien de réinitialisation</SubmitButton>
      <Link href="/login" className="text-center text-xs text-foreground/60 underline">
        Retour à la connexion
      </Link>
    </form>
  );
}
