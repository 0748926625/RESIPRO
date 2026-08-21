import { z } from "zod";

const isoTimestamp = z
  .string()
  .min(1, "Créneau requis.")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide.");

// Full ISO timestamps rather than a shared date + two times: a half-day "night" slot
// (e.g. 20:00 -> 13:00 the next day) spans two calendar dates, so start and end need
// independent dates, not one date reused for both.
export const classicBookingRequestSchema = z
  .object({
    startsAt: isoTimestamp,
    endsAt: isoTimestamp,
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: "La fin doit être après le début.",
    path: ["endsAt"],
  });

export type ClassicBookingRequestInput = z.infer<typeof classicBookingRequestSchema>;

// Same shape as a classic request: the initiator's own slot. What makes it "shared" is
// which RPC it's sent to (create_shared_booking_request vs create_classic_booking).
export const sharedBookingRequestSchema = classicBookingRequestSchema;
export type SharedBookingRequestInput = z.infer<typeof sharedBookingRequestSchema>;
