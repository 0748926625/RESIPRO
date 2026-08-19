export type TimeRange = { start: Date; end: Date };

export function isConsecutive(a: TimeRange, b: TimeRange): boolean {
  return a.end.getTime() === b.start.getTime() || b.end.getTime() === a.start.getTime();
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

export type SharedBookingValidationError = "invalid_range" | "not_consecutive" | "overlapping";

// Mirrors the invariants enforced in supabase/migrations/0008 (EXCLUDE constraint,
// trg_check_max_segments) and 0014 (join_shared_booking_request). This lets the UI/API
// layer surface a fast, friendly error before round-tripping to Postgres — the database
// remains the sole authority that actually prevents race conditions (§33, §41).
export function validateSharedBookingSegments(
  initiator: TimeRange,
  joiner: TimeRange,
): SharedBookingValidationError | null {
  if (initiator.start >= initiator.end || joiner.start >= joiner.end) {
    return "invalid_range";
  }
  if (overlaps(initiator, joiner)) {
    return "overlapping";
  }
  if (!isConsecutive(initiator, joiner)) {
    return "not_consecutive";
  }
  return null;
}
