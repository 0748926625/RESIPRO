import { z } from "zod";

export const classicBookingRequestSchema = z
  .object({
    date: z.string().min(1, "Date requise."),
    startTime: z.string().min(1, "Heure de début requise."),
    endTime: z.string().min(1, "Heure de fin requise."),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  });

export type ClassicBookingRequestInput = z.infer<typeof classicBookingRequestSchema>;
