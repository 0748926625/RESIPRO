"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// "Nouvelle résidence" creates an empty draft immediately — name/city are the only columns
// with neither a default nor null allowed — and lands the owner straight on its detail
// page (/owner/properties/[id]), the one place informations, photos, logo and signature are
// all editable together, instead of a separate name+info-only form the owner had to submit
// before being taken to a different page to add photos.
export async function createDraftProperty() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: owner } = await supabase.from("owners").select("id").eq("profile_id", user.id).single();
  if (!owner) {
    redirect("/owner/properties");
  }

  const base = "nouvelle-residence";
  let slug = base;
  let propertyId: string | null = null;

  for (let attempt = 0; attempt < 3 && !propertyId; attempt++) {
    // No .select() chained on the insert: with RLS enabled, INSERT ... RETURNING reliably
    // 42501s the moment the SELECT policy consults another table (here,
    // properties_select_public_approved's ownership check against "owners") — a plain
    // insert plus a follow-up select is the reliable pattern (see also
    // owner/properties/[id]/availability/actions.ts and .../invoices/actions.ts).
    const { error } = await supabase.from("properties").insert({
      owner_id: owner.id,
      slug,
      name: "Nouvelle résidence",
      city: "",
    });

    if (error) {
      // Unique violation on the slug — retry once with a random suffix.
      if (error.code === "23505") {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      redirect("/owner/properties");
    }

    const { data: created } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", slug)
      .eq("owner_id", owner.id)
      .single();

    propertyId = created?.id ?? null;
  }

  if (!propertyId) {
    redirect("/owner/properties");
  }

  redirect(`/owner/properties/${propertyId}?created=1`);
}
