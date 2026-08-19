// Permanent regression coverage for the highest-priority items in §39 (disponibilité,
// réservation, réservation partagée, max 2 participants, chevauchement, paiement,
// permissions, RLS) against the REAL linked Supabase project — everything up to now was
// verified with one-off scripts that were deleted after each phase, leaving zero
// protection against a future migration silently reintroducing a bug (exactly what
// happened with the anon function-access issue this suite's first test guards against).
//
// Requires NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY (see .env.local) and creates/deletes real, isolated test
// users + a property for the duration of the run. Skipped entirely if those env vars
// are not set, so `npm test` stays usable without a live project (e.g. in CI without
// secrets configured). Run explicitly with `npm run test:integration`.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.skipIf(!hasCredentials)("RLS and RPC integration (live Supabase project)", () => {
  const stamp = Date.now();
  const password = "TestPassword123!";
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let owner: { id: string; client: SupabaseClient };
  let otherOwner: { id: string; client: SupabaseClient };
  let clientA: { id: string; client: SupabaseClient };
  let clientB: { id: string; client: SupabaseClient };
  let adminUser: { id: string; client: SupabaseClient };
  let propertyId: string;
  const userIds: string[] = [];

  async function makeUser(tag: string, role: "owner" | "client") {
    const email = `resipro.integration.${tag}.${stamp}@gmail.com`;
    const { data } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Integration ${tag}`, phone: "+2250700000000", role },
    });
    const client = createClient(SUPABASE_URL!, ANON_KEY!);
    await client.auth.signInWithPassword({ email, password });
    userIds.push(data.user!.id);
    return { id: data.user!.id, client };
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anon = createClient(SUPABASE_URL!, ANON_KEY!);

    owner = await makeUser("owner", "owner");
    otherOwner = await makeUser("otherowner", "owner");
    clientA = await makeUser("clienta", "client");
    clientB = await makeUser("clientb", "client");
    adminUser = await makeUser("admin", "client");
    await admin.from("profiles").update({ role: "super_admin" }).eq("id", adminUser.id);

    const { data: ownerRow } = await owner.client.from("owners").select("id").single();
    const slug = `test-integration-${stamp}`;
    await owner.client.from("properties").insert({
      owner_id: ownerRow!.id,
      slug,
      name: "Integration Test Property",
      city: "Abidjan",
      capacity: 2,
      bedrooms: 1,
      base_price: 20000,
    });
    const { data: property } = await owner.client.from("properties").select("id").eq("slug", slug).single();
    propertyId = property!.id;

    await owner.client.from("properties").update({ status: "pending_review" }).eq("id", propertyId);
    await adminUser.client.rpc("set_property_status", {
      p_property_id: propertyId,
      p_new_status: "approved",
      p_allowed_from: ["pending_review"],
    });
    await owner.client.from("availability_rules").insert({
      property_id: propertyId,
      day_of_week: 3, // Wednesday
      open_time: "13:00",
      close_time: "21:00",
      min_duration_minutes: 60,
    });
  }, 30000);

  afterAll(async () => {
    await admin.from("notifications").delete().in("profile_id", userIds);
    await admin.from("audit_logs").delete().in("actor_profile_id", userIds);
    await admin.from("shared_booking_requests").delete().eq("property_id", propertyId);
    const { data: bookings } = await admin.from("bookings").select("id").eq("property_id", propertyId);
    const bookingIds = (bookings ?? []).map((b) => b.id);
    if (bookingIds.length > 0) {
      await admin.from("audit_logs").delete().in("entity_id", bookingIds);
      await admin.from("payments").delete().in("booking_id", bookingIds);
      await admin.from("income_transactions").delete().in("booking_id", bookingIds);
      await admin.from("bookings").delete().eq("property_id", propertyId);
    }
    await admin.from("availability_rules").delete().eq("property_id", propertyId);
    await admin.from("properties").delete().eq("id", propertyId);
    for (const id of userIds) {
      await admin.auth.admin.deleteUser(id);
    }
  }, 30000);

  describe("anon function access (regression guard for the Phase 16 finding)", () => {
    it("rejects an unauthenticated caller with a permission error, not the function's own logic", async () => {
      const { error } = await anon.rpc("cancel_booking", {
        p_booking_id: "00000000-0000-0000-0000-000000000000",
      });
      expect(error?.code).toBe("42501");
    });

    it("still allows anon to call the RLS helper functions policies depend on", async () => {
      const { error } = await anon.rpc("is_admin");
      expect(error).toBeNull();
    });
  });

  describe("classic booking engine", () => {
    it("creates a booking with a server-computed price and rejects an exact duplicate slot", async () => {
      const start = "2026-01-14T14:00:00+00:00";
      const end = "2026-01-14T16:00:00+00:00";

      const { data: bookingId, error } = await clientA.client.rpc("create_classic_booking", {
        p_property_id: propertyId,
        p_starts_at: start,
        p_ends_at: end,
      });
      expect(error).toBeNull();

      const { data: booking } = await admin.from("bookings").select("total_price").eq("id", bookingId).single();
      expect(booking?.total_price).toBe(20000);

      const { error: duplicateError } = await clientB.client.rpc("create_classic_booking", {
        p_property_id: propertyId,
        p_starts_at: start,
        p_ends_at: end,
      });
      expect(duplicateError?.message).toContain("vient d'être réservée");

      await clientA.client.rpc("cancel_booking", { p_booking_id: bookingId });
    });

    it("rejects a request outside the property's opening hours", async () => {
      const { error } = await clientA.client.rpc("create_classic_booking", {
        p_property_id: propertyId,
        p_starts_at: "2026-01-14T08:00:00+00:00",
        p_ends_at: "2026-01-14T09:00:00+00:00",
      });
      expect(error?.message).toContain("horaires autorisés");
    });
  });

  describe("shared booking: max 2 participants", () => {
    it("cannot be exceeded even by inserting a third segment directly, bypassing the RPC", async () => {
      const { data: requestId } = await clientA.client.rpc("create_shared_booking_request", {
        p_property_id: propertyId,
        p_starts_at: "2026-01-21T13:00:00+00:00",
        p_ends_at: "2026-01-21T17:00:00+00:00",
      });

      const { data: bookingId, error: joinError } = await clientB.client.rpc("join_shared_booking_request", {
        p_request_id: requestId,
        p_starts_at: "2026-01-21T17:00:00+00:00",
        p_ends_at: "2026-01-21T21:00:00+00:00",
      });
      expect(joinError).toBeNull();

      const { error: thirdSegmentError } = await admin.from("booking_segments").insert({
        booking_id: bookingId,
        property_id: propertyId,
        participant_profile_id: adminUser.id,
        segment_order: 1,
        starts_at: "2026-01-22T13:00:00+00:00",
        ends_at: "2026-01-22T14:00:00+00:00",
        status: "pending",
        price_share: 1000,
      });
      expect(thirdSegmentError?.message).toContain("cannot have more than 2");

      await clientA.client.rpc("cancel_booking", { p_booking_id: bookingId });
    });
  });

  describe("payments: permissions", () => {
    it("lets a client submit their own payment but not confirm it", async () => {
      const { data: bookingId } = await clientA.client.rpc("create_classic_booking", {
        p_property_id: propertyId,
        p_starts_at: "2026-01-28T14:00:00+00:00",
        p_ends_at: "2026-01-28T16:00:00+00:00",
      });
      const { data: payment } = await admin.from("payments").select("id").eq("booking_id", bookingId).single();

      const { error: submitError } = await clientA.client.rpc("submit_payment", { p_payment_id: payment!.id });
      expect(submitError).toBeNull();

      const { error: selfConfirmError } = await clientA.client.rpc("confirm_payment", { p_payment_id: payment!.id });
      expect(selfConfirmError?.message).toBe("not authorized");

      const { error: adminConfirmError } = await adminUser.client.rpc("confirm_payment", { p_payment_id: payment!.id });
      expect(adminConfirmError).toBeNull();

      await clientA.client.rpc("cancel_booking", { p_booking_id: bookingId });
    });
  });

  describe("RLS isolation between owners", () => {
    it("hides one owner's property data from another owner", async () => {
      const { data } = await otherOwner.client.from("expenses").select("id").eq("property_id", propertyId);
      expect(data).toEqual([]);
    });

    it("blocks a cross-owner cash reversal attempt", async () => {
      await owner.client.from("cash_transactions").insert({
        property_id: propertyId,
        type: "in",
        amount: 1000,
        reason: "Integration test entry",
        performed_by: owner.id,
      });
      const { data: entry } = await owner.client
        .from("cash_transactions")
        .select("id")
        .eq("property_id", propertyId)
        .eq("reason", "Integration test entry")
        .single();

      const { error } = await otherOwner.client.rpc("reverse_cash_transaction", {
        p_transaction_id: entry!.id,
      });
      expect(error?.message).toBe("not authorized");
    });
  });
});
