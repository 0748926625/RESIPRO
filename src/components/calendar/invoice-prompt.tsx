"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { computeInvoiceTotals } from "@/lib/services/external-booking.service";
import type { CreateInvoiceResult } from "@/app/owner/properties/[id]/invoices/actions";

function addOneDay(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function InvoicePrompt({
  propertyId,
  dates,
  currency,
  createAction,
  onClose,
}: {
  propertyId: string;
  dates: string[];
  currency: string;
  createAction: (input: {
    clientName: string;
    startsAt: string;
    endsAt: string;
    nightlyRate: number;
    amountPaid: number;
  }) => Promise<CreateInvoiceResult>;
  onClose: () => void;
}) {
  const sorted = [...dates].sort();
  const startsAt = sorted[0];
  const endsAt = addOneDay(sorted[sorted.length - 1]);

  const [clientName, setClientName] = useState("");
  const [nightlyRate, setNightlyRate] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");
  const [result, setResult] = useState<CreateInvoiceResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const rateNumber = Number(nightlyRate) || 0;
  const paidNumber = Number(amountPaid) || 0;
  const totals = computeInvoiceTotals({ startsAt, endsAt, nightlyRate: rateNumber, amountPaid: paidNumber });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const res = await createAction({ clientName, startsAt, endsAt, nightlyRate: rateNumber, amountPaid: paidNumber });
      setResult(res);
    });
  }

  if (result && "id" in result) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <p className="text-foreground">Facture enregistrée pour {clientName}.</p>
        <div className="flex gap-3">
          <Link href={`/owner/properties/${propertyId}/invoices/${result.id}`} className="font-medium underline">
            Voir la facture
          </Link>
          <button type="button" onClick={onClose} className="text-foreground/60 underline">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-foreground/15 bg-foreground/5 p-4 text-sm"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">
          Générer une facture pour ce séjour ({sorted.length} nuit{sorted.length > 1 ? "s" : ""}) ?
        </p>
        <button type="button" onClick={onClose} className="text-xs text-foreground/50 underline">
          Ignorer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-client-name" className="text-xs font-medium text-foreground/70">
            Nom du client
          </label>
          <input
            id="invoice-client-name"
            required
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-nightly-rate" className="text-xs font-medium text-foreground/70">
            Prix négocié / nuit ({currency})
          </label>
          <input
            id="invoice-nightly-rate"
            type="number"
            min={0}
            step="0.01"
            required
            value={nightlyRate}
            onChange={(event) => setNightlyRate(event.target.value)}
            className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-amount-paid" className="text-xs font-medium text-foreground/70">
            Montant avancé ({currency})
          </label>
          <input
            id="invoice-amount-paid"
            type="number"
            min={0}
            step="0.01"
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5"
          />
        </div>
      </div>

      <p className="text-xs text-foreground/60">
        Total : {totals.total.toLocaleString("fr-FR")} {currency} · Reste à payer :{" "}
        <span className={totals.remaining > 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>
          {totals.remaining.toLocaleString("fr-FR")} {currency}
        </span>
      </p>

      {result && "error" in result ? <p className="text-xs text-red-600">{result.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-60"
      >
        {isPending ? "Enregistrement…" : "Enregistrer la facture"}
      </button>
    </form>
  );
}
