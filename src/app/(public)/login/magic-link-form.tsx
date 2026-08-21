"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { sendMagicLink, type MagicLinkActionState } from "./actions";

const initialState: MagicLinkActionState = {};

export function MagicLinkForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-foreground/5 p-3 text-sm">
        <p className="font-medium text-foreground">Email envoyé.</p>
        <p className="text-foreground/60">
          Ouvrez le lien reçu par email pour vous connecter — aucun mot de passe n&apos;est nécessaire.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Recevoir un lien de connexion</SubmitButton>
    </form>
  );
}
