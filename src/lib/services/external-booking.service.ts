export function computeNights(startsAt: string | Date, endsAt: string | Date): number {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export type InvoiceTotals = { nights: number; total: number; remaining: number };

export function computeInvoiceTotals(input: {
  startsAt: string | Date;
  endsAt: string | Date;
  nightlyRate: number;
  amountPaid: number;
}): InvoiceTotals {
  const nights = computeNights(input.startsAt, input.endsAt);
  const total = nights * input.nightlyRate;
  const remaining = total - input.amountPaid;
  return { nights, total, remaining };
}
