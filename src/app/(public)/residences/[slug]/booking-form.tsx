"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { requestClassicBooking, type BookingFormState } from "./actions";

const initialState: BookingFormState = {};

export function BookingForm({
  propertyId,
  basePrice,
  currency,
}: {
  propertyId: string;
  basePrice: number;
  currency: string;
}) {
  const action = requestClassicBooking.bind(null, propertyId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Réserver</h2>
        <span className="text-sm font-semibold text-foreground">
          {basePrice} {currency}
        </span>
      </div>
      <FormField label="Date" name="date" type="date" required errors={state.fieldErrors?.date} />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Heure d'arrivée"
          name="startTime"
          type="time"
          required
          errors={state.fieldErrors?.startTime}
        />
        <FormField label="Heure de départ" name="endTime" type="time" required errors={state.fieldErrors?.endTime} />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>Réserver</SubmitButton>
      <p className="text-xs text-foreground/50">
        La disponibilité finale est vérifiée au moment de la validation.
      </p>
    </form>
  );
}
