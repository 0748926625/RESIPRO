import { z } from "zod";

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const expenseSchema = z.object({
  categoryId: optionalText,
  amount: z.coerce.number().min(0, "Le montant doit être positif."),
  description: optionalText,
  expenseDate: z.string().min(1, "Date requise."),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const incomeSchema = z.object({
  amount: z.coerce.number().min(0, "Le montant doit être positif."),
  incomeDate: z.string().min(1, "Date requise."),
});
export type IncomeInput = z.infer<typeof incomeSchema>;

export const RECURRING_CHARGE_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export const RECURRING_CHARGE_FREQUENCY_LABELS: Record<(typeof RECURRING_CHARGE_FREQUENCIES)[number], string> = {
  daily: "Quotidienne",
  weekly: "Hebdomadaire",
  monthly: "Mensuelle",
  yearly: "Annuelle",
};

export const recurringChargeSchema = z.object({
  label: z.string().min(2, "Le libellé est requis."),
  amount: z.coerce.number().min(0, "Le montant doit être positif."),
  frequency: z.enum(RECURRING_CHARGE_FREQUENCIES),
  nextDueDate: z.string().min(1, "Date requise."),
});
export type RecurringChargeInput = z.infer<typeof recurringChargeSchema>;

export const cashTransactionSchema = z.object({
  type: z.enum(["in", "out"]),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  reason: z.string().min(2, "Le motif est requis."),
});
export type CashTransactionInput = z.infer<typeof cashTransactionSchema>;
