"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { AVAILABILITY_BLOCK_REASON_LABELS, AVAILABILITY_BLOCK_REASONS } from "@/lib/validations/availability.schema";

export type AvailabilityFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function BlockForm({
  action,
}: {
  action: (state: AvailabilityFormState, formData: FormData) => Promise<AvailabilityFormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="startsAt" className="text-xs font-medium text-foreground/70">
          Début
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="endsAt" className="text-xs font-medium text-foreground/70">
          Fin
        </label>
        <input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          required
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reason" className="text-xs font-medium text-foreground/70">
          Motif
        </label>
        <select
          id="reason"
          name="reason"
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        >
          {AVAILABILITY_BLOCK_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {AVAILABILITY_BLOCK_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-xs font-medium text-foreground/70">
          Note (optionnelle)
        </label>
        <input
          id="note"
          name="note"
          type="text"
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
        />
      </div>
      <SubmitButton>Bloquer ce créneau</SubmitButton>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
      {state.fieldErrors?.endsAt ? <p className="w-full text-xs text-red-600">{state.fieldErrors.endsAt[0]}</p> : null}
    </form>
  );
}
