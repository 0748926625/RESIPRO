"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { register, type RegisterActionState } from "./actions";

const initialState: RegisterActionState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(register, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium text-foreground">Compte créé.</p>
        <p className="text-foreground/60">
          Si la confirmation par email est activée, vérifiez votre boîte de réception pour
          activer votre compte avant de vous connecter.
        </p>
        <Link href="/login" className="text-foreground underline">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Type de compte</legend>
        <div className="flex gap-4 text-sm text-foreground">
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="client" defaultChecked /> Client
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="owner" /> Propriétaire / gérant
          </label>
        </div>
        {state.fieldErrors?.role ? (
          <p className="text-xs text-red-600">{state.fieldErrors.role[0]}</p>
        ) : null}
      </fieldset>
      <FormField
        label="Nom complet"
        name="fullName"
        autoComplete="name"
        required
        errors={state.fieldErrors?.fullName}
      />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <FormField
        label="Téléphone"
        name="phone"
        type="tel"
        autoComplete="tel"
        required
        errors={state.fieldErrors?.phone}
      />
      <FormField
        label="Mot de passe"
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
      <SubmitButton>Créer mon compte</SubmitButton>
      <p className="text-center text-xs text-foreground/60">
        Déjà un compte ?{" "}
        <Link href="/login" className="underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
