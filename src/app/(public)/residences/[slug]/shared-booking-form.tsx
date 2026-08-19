"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { requestSharedBooking, type BookingFormState } from "./actions";

const initialState: BookingFormState = {};

export function SharedBookingForm({
  propertyId,
  basePrice,
  currency,
}: {
  propertyId: string;
  basePrice: number;
  currency: string;
}) {
  const action = requestSharedBooking.bind(null, propertyId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Créer une demande de partage</h2>
        <span className="text-sm font-semibold text-foreground">
          {Math.round(basePrice / 2)} {currency} / personne
        </span>
      </div>
      <p className="text-xs text-foreground/60">
        Choisissez votre créneau — la plateforme affichera &quot;recherche d&apos;un deuxième
        participant&quot; pour le reste du temps d&apos;ouverture, jusqu&apos;à ce qu&apos;un
        autre client rejoigne avec un créneau consécutif.
      </p>
      <FormField label="Date" name="date" type="date" required errors={state.fieldErrors?.date} />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Mon heure d'arrivée"
          name="startTime"
          type="time"
          required
          errors={state.fieldErrors?.startTime}
        />
        <FormField
          label="Mon heure de départ"
          name="endTime"
          type="time"
          required
          errors={state.fieldErrors?.endTime}
        />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Publier ma demande de partage</SubmitButton>
    </form>
  );
}
