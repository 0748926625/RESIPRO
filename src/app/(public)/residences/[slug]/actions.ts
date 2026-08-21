"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { classicBookingRequestSchema, sharedBookingRequestSchema } from "@/lib/validations/booking.schema";

export type BookingFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function requestClassicBooking(
  propertyId: string,
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = classicBookingRequestSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookingId, error } = await supabase.rpc("create_classic_booking", {
    p_property_id: propertyId,
    p_starts_at: parsed.data.startsAt,
    p_ends_at: parsed.data.endsAt,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/client/bookings?created=${bookingId}`);
}

export async function requestSharedBooking(
  propertyId: string,
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = sharedBookingRequestSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_shared_booking_request", {
    p_property_id: propertyId,
    p_starts_at: parsed.data.startsAt,
    p_ends_at: parsed.data.endsAt,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/client/shared-bookings`);
}

export async function joinSharedBooking(requestId: string, startsAtIso: string, endsAtIso: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("join_shared_booking_request", {
    p_request_id: requestId,
    p_starts_at: startsAtIso,
    p_ends_at: endsAtIso,
  });

  if (error) {
    redirect(`/client/shared-bookings?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/client/bookings`);
}
