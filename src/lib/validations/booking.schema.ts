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

// Same shape as a classic request: the initiator's own slot. What makes it "shared" is
// which RPC it's sent to (create_shared_booking_request vs create_classic_booking).
export const sharedBookingRequestSchema = classicBookingRequestSchema;
export type SharedBookingRequestInput = z.infer<typeof sharedBookingRequestSchema>;
