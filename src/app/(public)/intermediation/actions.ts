"use server";

import { createClient } from "@/lib/supabase/server";
import { intermediationFormDataToInput, intermediationRequestSchema } from "@/lib/validations/intermediation.schema";

export type IntermediationFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function submitIntermediationRequest(
  _prevState: IntermediationFormState,
  formData: FormData,
): Promise<IntermediationFormState> {
  const parsed = intermediationRequestSchema.safeParse(intermediationFormDataToInput(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const input = parsed.data;
  const { error } = await supabase.from("intermediation_requests").insert({
    client_profile_id: user?.id ?? null,
    full_name: input.fullName,
    phone: input.phone,
    requested_city: input.requestedCity ?? null,
    requested_neighborhood: input.requestedNeighborhood ?? null,
    requested_date: input.requestedDate ?? null,
    requested_start: input.requestedStart ?? null,
    requested_end: input.requestedEnd ?? null,
    budget: input.budget ?? null,
    party_size: input.partySize ?? null,
    preferences: input.preferences ?? null,
    comments: input.comments ?? null,
    status: "new",
  });

  if (error) {
    return { error: "Impossible d'envoyer votre demande pour le moment." };
  }

  return { success: true };
}
