"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { updatePlatformSettings, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: {
    platformName: string;
    contactEmail: string;
    contactPhone: string;
    paymentOperator: string;
    paymentPhone: string;
    paymentRecipientName: string;
    paymentInstructions: string;
    commissionType: string;
    commissionValue: string;
  };
}) {
  const [state, formAction] = useActionState(updatePlatformSettings, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Plateforme</h2>
        <FormField
          label="Nom de la plateforme"
          name="platformName"
          required
          defaultValue={defaultValues.platformName}
          errors={state.fieldErrors?.platformName}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Email de contact"
            name="contactEmail"
            type="email"
            defaultValue={defaultValues.contactEmail}
            errors={state.fieldErrors?.contactEmail}
          />
          <FormField
            label="Téléphone de contact"
            name="contactPhone"
            defaultValue={defaultValues.contactPhone}
            errors={state.fieldErrors?.contactPhone}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Mobile Money</h2>
        <p className="text-xs text-foreground/60">
          Ces informations sont affichées aux clients pour effectuer leur paiement (§31). Ne
          jamais coder ce numéro en dur ailleurs dans l&apos;application.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Opérateur"
            name="paymentOperator"
            required
            defaultValue={defaultValues.paymentOperator}
            errors={state.fieldErrors?.paymentOperator}
          />
          <FormField
            label="Numéro"
            name="paymentPhone"
            required
            defaultValue={defaultValues.paymentPhone}
            errors={state.fieldErrors?.paymentPhone}
          />
        </div>
        <FormField
          label="Nom du bénéficiaire"
          name="paymentRecipientName"
          required
          defaultValue={defaultValues.paymentRecipientName}
          errors={state.fieldErrors?.paymentRecipientName}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="paymentInstructions" className="text-sm font-medium text-foreground">
            Instructions de paiement
          </label>
          <textarea
            id="paymentInstructions"
            name="paymentInstructions"
            rows={3}
            defaultValue={defaultValues.paymentInstructions}
            className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Commission (§32)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="commissionType" className="text-sm font-medium text-foreground">
              Type
            </label>
            <select
              id="commissionType"
              name="commissionType"
              defaultValue={defaultValues.commissionType}
              className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm"
            >
              <option value="percentage">Pourcentage</option>
              <option value="fixed">Montant fixe</option>
            </select>
          </div>
          <FormField
            label="Valeur"
            name="commissionValue"
            type="number"
            defaultValue={defaultValues.commissionValue}
            errors={state.fieldErrors?.commissionValue}
          />
        </div>
      </section>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">Paramètres enregistrés.</p> : null}
      <SubmitButton>Enregistrer</SubmitButton>
    </form>
  );
}
