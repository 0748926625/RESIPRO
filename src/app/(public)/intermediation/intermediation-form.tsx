"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { submitIntermediationRequest, type IntermediationFormState } from "./actions";

const initialState: IntermediationFormState = {};

export function IntermediationForm({
  defaultFullName,
  defaultPhone,
}: {
  defaultFullName?: string;
  defaultPhone?: string;
}) {
  const [state, formAction] = useActionState(submitIntermediationRequest, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-foreground/10 p-4 text-sm">
        <p className="font-medium text-foreground">Votre demande a été envoyée.</p>
        <p className="text-foreground/60">
          Un membre de l&apos;équipe Residence Pro vous contactera prochainement.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Nom complet"
          name="fullName"
          required
          defaultValue={defaultFullName}
          errors={state.fieldErrors?.fullName}
        />
        <FormField
          label="Téléphone"
          name="phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          errors={state.fieldErrors?.phone}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ville" name="requestedCity" errors={state.fieldErrors?.requestedCity} />
        <FormField label="Quartier" name="requestedNeighborhood" errors={state.fieldErrors?.requestedNeighborhood} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Date souhaitée" name="requestedDate" type="date" errors={state.fieldErrors?.requestedDate} />
        <FormField label="Heure d'arrivée" name="requestedStart" type="time" errors={state.fieldErrors?.requestedStart} />
        <FormField label="Heure de départ" name="requestedEnd" type="time" errors={state.fieldErrors?.requestedEnd} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Budget" name="budget" type="number" errors={state.fieldErrors?.budget} />
        <FormField label="Nombre de personnes" name="partySize" type="number" errors={state.fieldErrors?.partySize} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="preferences" className="text-sm font-medium text-foreground">
          Préférences (équipements, type de résidence…)
        </label>
        <textarea
          id="preferences"
          name="preferences"
          rows={2}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="comments" className="text-sm font-medium text-foreground">
          Commentaires
        </label>
        <textarea
          id="comments"
          name="comments"
          rows={2}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Envoyer ma demande</SubmitButton>
    </form>
  );
}
