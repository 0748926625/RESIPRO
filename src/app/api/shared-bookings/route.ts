import { NextResponse } from "next/server";

// Wired to src/lib/services/shared-booking.service.ts in Phase 8
// (create_shared_booking_request / join_shared_booking_request RPCs).
export async function POST() {
  return NextResponse.json({ error: "Not implemented yet." }, { status: 501 });
}
