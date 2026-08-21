"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

import { recordInvoicePayment, type RecordPaymentState } from "@/app/owner/properties/[id]/invoices/actions";

const initialState: RecordPaymentState = {};

export function RecordPaymentForm({
  propertyId,
  invoiceId,
  remaining,
  currency,
}: {
  propertyId: string;
  invoiceId: string;
  remaining: number;
  currency: string;
}) {
  const [state, formAction] = useActionState(recordInvoicePayment.bind(null, propertyId, invoiceId), initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-4 print:hidden">
      <p className="text-sm font-medium text-foreground">
        Enregistrer un paiement complémentaire — reste à payer : {remaining.toLocaleString("fr-FR")} {currency}
      </p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField label={`Montant reçu (${currency})`} name="amount" type="number" required />
        </div>
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
