"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function cancelSharedBookingRequest(requestId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("cancel_shared_booking_request", { p_request_id: requestId });

  revalidatePath(revalidate);
}
