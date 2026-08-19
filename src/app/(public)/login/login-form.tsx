"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { login, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <FormField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Se connecter</SubmitButton>
      <div className="flex justify-between text-xs text-foreground/60">
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
        <Link href="/register">Créer un compte</Link>
      </div>
    </form>
  );
}
