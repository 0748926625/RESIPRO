import { z } from "zod";

export const DAY_OF_WEEK_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export const availabilityRuleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    openTime: z.string().min(1, "Heure d'ouverture requise."),
    closeTime: z.string().min(1, "Heure de fermeture requise."),
    minDurationMinutes: z.coerce.number().int().min(1).default(60),
  })
  .refine((data) => data.openTime < data.closeTime, {
    message: "L'heure de fermeture doit être après l'heure d'ouverture.",
    path: ["closeTime"],
  });

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;

export const AVAILABILITY_BLOCK_REASONS = ["maintenance", "cleaning", "manual", "other"] as const;

export const AVAILABILITY_BLOCK_REASON_LABELS: Record<(typeof AVAILABILITY_BLOCK_REASONS)[number], string> = {
  maintenance: "Maintenance",
  cleaning: "Nettoyage / préparation",
  manual: "Blocage manuel",
  other: "Autre",
};

export const availabilityBlockSchema = z
  .object({
    startsAt: z.string().min(1, "Date/heure de début requise."),
    endsAt: z.string().min(1, "Date/heure de fin requise."),
    reason: z.enum(AVAILABILITY_BLOCK_REASONS),
    note: z
      .string()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: "La fin doit être après le début.",
    path: ["endsAt"],
  });

export type AvailabilityBlockInput = z.infer<typeof availabilityBlockSchema>;

// Marker note distinguishing blocks created by the quick-mark calendar tool (tap/drag a
// whole day) from ordinary blocks — lets a repeat tap toggle exactly the blocks it made,
// without touching a maintenance/cleaning block that happens to cover the same day.
export const QUICK_BLOCK_NOTE = "Marqué occupé (calendrier rapide)";
