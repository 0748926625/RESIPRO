"use server";

import { revalidatePath } from "next/cache";

import { PROFILE_STATUSES } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

async function setStatus(profileId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_profile_status", {
    p_profile_id: profileId,
    p_new_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/owners");
}

export async function suspendUser(profileId: string) {
  await setStatus(profileId, PROFILE_STATUSES.SUSPENDED);
}

export async function activateUser(profileId: string) {
  await setStatus(profileId, PROFILE_STATUSES.ACTIVE);
}
