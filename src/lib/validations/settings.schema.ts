import { z } from "zod";

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const platformSettingsSchema = z.object({
  platformName: z.string().min(1, "Le nom de la plateforme est requis."),
  contactEmail: optionalText,
  contactPhone: optionalText,
  paymentOperator: z.string().min(1, "Opérateur Mobile Money requis."),
  paymentPhone: z.string().min(1, "Numéro Mobile Money requis."),
  paymentRecipientName: z.string().min(1, "Nom du bénéficiaire requis."),
  paymentInstructions: optionalText,
  commissionType: z.enum(["fixed", "percentage"]),
  commissionValue: z.coerce.number().min(0, "La commission doit être positive."),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;

export const profileSchema = z.object({
  fullName: z.string().min(2, "Le nom complet est requis."),
  phone: optionalText,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const ownerProfileSchema = profileSchema.extend({
  businessName: optionalText,
});

export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;
