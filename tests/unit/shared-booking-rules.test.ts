import { describe, expect, it } from "vitest";

import { validateSharedBookingSegments } from "@/lib/services/shared-booking-rules";

// Fixed reference date so hour-only helpers below stay readable.
const at = (h: number) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);

describe("validateSharedBookingSegments", () => {
  // Cases taken directly from the cahier des charges (§39).
  it("accepts consecutive, non-overlapping segments (13→17 / 17→21)", () => {
    expect(
      validateSharedBookingSegments({ start: at(13), end: at(17) }, { start: at(17), end: at(21) }),
    ).toBeNull();
  });

  it("rejects overlapping segments (13→18 / 17→21)", () => {
    expect(
      validateSharedBookingSegments({ start: at(13), end: at(18) }, { start: at(17), end: at(21) }),
    ).toBe("overlapping");
  });

  it("rejects segments separated by a gap (13→17 / 18→21) as non-consecutive", () => {
    expect(
      validateSharedBookingSegments({ start: at(13), end: at(17) }, { start: at(18), end: at(21) }),
    ).toBe("not_consecutive");
  });

  it("rejects full containment (13→21 / 13→17) as overlapping", () => {
    expect(
      validateSharedBookingSegments({ start: at(13), end: at(21) }, { start: at(13), end: at(17) }),
    ).toBe("overlapping");
  });

  it("accepts the initiator joining after the joiner's earlier slot (17→21 / 13→17)", () => {
    expect(
      validateSharedBookingSegments({ start: at(17), end: at(21) }, { start: at(13), end: at(17) }),
    ).toBeNull();
  });
});

// The "maximum 2 participants" rule (a third participant must never be added) is enforced
// by the database (trg_check_max_segments in 0008_shared_booking_requests.sql) since it is
// a constraint over *all* segments of a booking, not a property of a single pair — see
// Phase 16 for the integration test exercising that trigger against a real database.
