import { z } from "zod";

export const externalBookingSchema = z.object({
  clientName: z.string().min(2, "Le nom du client est requis."),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  nightlyRate: z.coerce.number().min(0, "Le prix par nuit doit être positif."),
  amountPaid: z.coerce.number().min(0, "Le montant avancé doit être positif ou nul."),
});

export type ExternalBookingInput = z.infer<typeof externalBookingSchema>;

export const invoicePaymentSchema = z.object({
  amount: z.coerce.number().positive("Le montant doit être supérieur à zéro."),
});

export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>;
