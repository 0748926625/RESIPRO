"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// Shared across the client/owner/admin booking lists — authorization is enforced inside
// cancel_booking() itself (participant or admin only), not by which page calls this.
export async function cancelBooking(bookingId: string, revalidate: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("cancel_booking", { p_booking_id: bookingId });

  revalidatePath(revalidate);
}
