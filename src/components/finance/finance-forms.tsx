"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { RECURRING_CHARGE_FREQUENCIES, RECURRING_CHARGE_FREQUENCY_LABELS } from "@/lib/validations/finance.schema";

export type FinanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type Action = (state: FinanceFormState, formData: FormData) => Promise<FinanceFormState>;

export function ExpenseForm({
  action,
  categories,
}: {
  action: Action;
  categories: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-xs font-medium text-foreground/70">
          Catégorie
        </label>
        <select name="categoryId" id="categoryId" className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5">
          <option value="">—</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      <FormField label="Montant" name="amount" type="number" required errors={state.fieldErrors?.amount} />
      <FormField label="Date" name="expenseDate" type="date" required errors={state.fieldErrors?.expenseDate} />
      <FormField label="Description" name="description" errors={state.fieldErrors?.description} />
      <SubmitButton>Ajouter</SubmitButton>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function IncomeForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <FormField label="Montant" name="amount" type="number" required errors={state.fieldErrors?.amount} />
      <FormField label="Date" name="incomeDate" type="date" required errors={state.fieldErrors?.incomeDate} />
      <SubmitButton>Ajouter</SubmitButton>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function RecurringChargeForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <FormField label="Libellé" name="label" required errors={state.fieldErrors?.label} />
      <FormField label="Montant" name="amount" type="number" required errors={state.fieldErrors?.amount} />
      <div className="flex flex-col gap-1">
        <label htmlFor="frequency" className="text-xs font-medium text-foreground/70">
          Fréquence
        </label>
        <select name="frequency" id="frequency" className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5">
          {RECURRING_CHARGE_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {RECURRING_CHARGE_FREQUENCY_LABELS[frequency]}
            </option>
          ))}
        </select>
      </div>
      <FormField label="Prochaine échéance" name="nextDueDate" type="date" required errors={state.fieldErrors?.nextDueDate} />
      <SubmitButton>Ajouter</SubmitButton>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function CashTransactionForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-medium text-foreground/70">
          Type
        </label>
        <select name="type" id="type" className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5">
          <option value="in">Entrée</option>
          <option value="out">Sortie</option>
        </select>
      </div>
      <FormField label="Montant" name="amount" type="number" required errors={state.fieldErrors?.amount} />
      <FormField label="Motif" name="reason" required errors={state.fieldErrors?.reason} />
      <SubmitButton>Enregistrer</SubmitButton>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
