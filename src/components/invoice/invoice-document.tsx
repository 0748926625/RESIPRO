import { computeInvoiceTotals } from "@/lib/services/external-booking.service";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function InvoiceDocument({
  propertyName,
  propertyCity,
  propertyAddress,
  logoUrl,
  signatureUrl,
  ownerLabel,
  ownerPhone,
  clientName,
  startsAt,
  endsAt,
  nightlyRate,
  amountPaid,
  currency,
  note,
  createdAt,
}: {
  propertyName: string;
  propertyCity: string;
  propertyAddress: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  ownerLabel: string | null;
  ownerPhone: string | null;
  clientName: string;
  startsAt: string;
  endsAt: string;
  nightlyRate: number;
  amountPaid: number;
  currency: string;
  note: string | null;
  createdAt: string;
}) {
  const totals = computeInvoiceTotals({ startsAt, endsAt, nightlyRate, amountPaid });

  return (
    <div className="flex flex-col gap-8 rounded-lg border border-foreground/10 p-8 print:border-none print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo ${propertyName}`}
              className="h-14 w-14 rounded-md border border-foreground/10 object-contain"
            />
          ) : null}
          <div>
            <h1 className="text-lg font-semibold text-foreground">Facture — {propertyName}</h1>
            <p className="text-sm text-foreground/60">
              {propertyCity}
              {propertyAddress ? `, ${propertyAddress}` : ""}
            </p>
            {ownerLabel ? (
              <p className="text-sm text-foreground/60">
                {ownerLabel}
                {ownerPhone ? ` · ${ownerPhone}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-foreground/50">Émise le {dateFormatter.format(new Date(createdAt))}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-foreground/50">Client</p>
        <p className="text-base font-medium text-foreground">{clientName}</p>
      </div>

      <table className="w-full text-sm">
        <tbody>
          <tr className="border-t border-foreground/10">
            <td className="py-2 text-foreground/60">Période</td>
            <td className="py-2 text-right text-foreground">
              {dateFormatter.format(new Date(startsAt))} → {dateFormatter.format(new Date(endsAt))}
            </td>
          </tr>
          <tr className="border-t border-foreground/10">
            <td className="py-2 text-foreground/60">Nombre de nuits</td>
            <td className="py-2 text-right text-foreground">{totals.nights}</td>
          </tr>
          <tr className="border-t border-foreground/10">
            <td className="py-2 text-foreground/60">Prix négocié / nuit</td>
            <td className="py-2 text-right text-foreground">
              {nightlyRate.toLocaleString("fr-FR")} {currency}
            </td>
          </tr>
          <tr className="border-t border-foreground/10">
            <td className="py-2 font-medium text-foreground">Total à payer</td>
            <td className="py-2 text-right font-medium text-foreground">
              {totals.total.toLocaleString("fr-FR")} {currency}
            </td>
          </tr>
          <tr className="border-t border-foreground/10">
            <td className="py-2 text-foreground/60">Montant avancé</td>
            <td className="py-2 text-right text-foreground">
              {amountPaid.toLocaleString("fr-FR")} {currency}
            </td>
          </tr>
          <tr className="border-t border-foreground/10">
            <td className="py-2 font-medium text-foreground">Reste à payer</td>
            <td
              className={`py-2 text-right text-base font-semibold ${
                totals.remaining > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {totals.remaining.toLocaleString("fr-FR")} {currency}
            </td>
          </tr>
        </tbody>
      </table>

      {note ? <p className="text-xs text-foreground/50">{note}</p> : null}

      {signatureUrl ? (
        <div className="flex flex-col items-end gap-1 self-end">
          <p className="text-xs text-foreground/50">Signature</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signatureUrl} alt="Signature" className="h-16 w-40 object-contain" />
        </div>
      ) : null}
    </div>
  );
}
