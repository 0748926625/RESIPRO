import { z } from "zod";

export const PROPERTY_TYPES = ["apartment", "studio", "house", "villa", "room"] as const;

export const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  apartment: "Appartement",
  studio: "Studio",
  house: "Maison",
  villa: "Villa",
  room: "Chambre",
};

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const propertyInputSchema = z.object({
  name: z.string().min(3, "Le nom est requis (3 caractères minimum)."),
  description: optionalText,
  propertyType: z.enum(PROPERTY_TYPES, { message: "Type de résidence requis." }),
  city: z.string().min(2, "La ville est requise."),
  neighborhood: optionalText,
  address: optionalText,
  capacity: z.coerce.number().int().min(1, "Capacité minimum 1."),
  bedrooms: z.coerce.number().int().min(0, "Nombre de chambres invalide."),
  basePrice: z.coerce.number().min(0, "Le tarif doit être positif."),
  currency: z.string().min(1).default("XOF"),
  checkInTime: optionalText,
  checkOutTime: optionalText,
  cleaningBufferMinutes: z.coerce.number().int().min(0).default(0),
  houseRules: optionalText,
  allowsHalfDay: z.boolean().default(true),
  amenityIds: z.array(z.string().uuid()).default([]),
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;

export function propertyFormDataToInput(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    propertyType: formData.get("propertyType"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood"),
    address: formData.get("address"),
    capacity: formData.get("capacity"),
    bedrooms: formData.get("bedrooms"),
    basePrice: formData.get("basePrice"),
    currency: formData.get("currency") || "XOF",
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
    cleaningBufferMinutes: formData.get("cleaningBufferMinutes") || 0,
    houseRules: formData.get("houseRules"),
    allowsHalfDay: formData.get("allowsHalfDay") === "on",
    amenityIds: formData.getAll("amenityIds"),
  };
}
