"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

async function setVerified(ownerId: string, verified: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_owner_verified", {
    p_owner_id: ownerId,
    p_verified: verified,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/owners");
}

export async function verifyOwner(ownerId: string) {
  await setVerified(ownerId, true);
}

export async function unverifyOwner(ownerId: string) {
  await setVerified(ownerId, false);
}
