"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { DAY_OF_WEEK_LABELS } from "@/lib/validations/availability.schema";

export type AvailabilityFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function RuleForm({
  action,
}: {
  action: (state: AvailabilityFormState, formData: FormData) => Promise<AvailabilityFormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="dayOfWeek" className="text-xs font-medium text-foreground/70">
          Jour
        </label>
        <select
          id="dayOfWeek"
          name="dayOfWeek"
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        >
          {DAY_OF_WEEK_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="openTime" className="text-xs font-medium text-foreground/70">
          Ouverture
        </label>
        <input
          id="openTime"
          name="openTime"
          type="time"
          required
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="closeTime" className="text-xs font-medium text-foreground/70">
          Fermeture
        </label>
        <input
          id="closeTime"
          name="closeTime"
          type="time"
          required
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="minDurationMinutes" className="text-xs font-medium text-foreground/70">
          Durée min. (min)
        </label>
        <input
          id="minDurationMinutes"
          name="minDurationMinutes"
          type="number"
          min={1}
          defaultValue={60}
          className="w-24 rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        />
      </div>
      <SubmitButton>Ajouter</SubmitButton>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
      {state.fieldErrors?.closeTime ? (
        <p className="w-full text-xs text-red-600">{state.fieldErrors.closeTime[0]}</p>
      ) : null}
    </form>
  );
}
