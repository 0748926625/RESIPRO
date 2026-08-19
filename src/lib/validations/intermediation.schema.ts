import { z } from "zod";

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalNumber = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? Number(value) : undefined))
  .pipe(z.number().min(0).optional());

export const intermediationRequestSchema = z.object({
  fullName: z.string().min(2, "Le nom est requis."),
  phone: z.string().min(8, "Le téléphone est requis."),
  requestedCity: optionalText,
  requestedNeighborhood: optionalText,
  requestedDate: optionalText,
  requestedStart: optionalText,
  requestedEnd: optionalText,
  budget: optionalNumber,
  partySize: optionalNumber,
  preferences: optionalText,
  comments: optionalText,
});

export type IntermediationRequestInput = z.infer<typeof intermediationRequestSchema>;

export function intermediationFormDataToInput(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    requestedCity: formData.get("requestedCity"),
    requestedNeighborhood: formData.get("requestedNeighborhood"),
    requestedDate: formData.get("requestedDate"),
    requestedStart: formData.get("requestedStart"),
    requestedEnd: formData.get("requestedEnd"),
    budget: formData.get("budget"),
    partySize: formData.get("partySize"),
    preferences: formData.get("preferences"),
    comments: formData.get("comments"),
  };
}
