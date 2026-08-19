import { NextResponse } from "next/server";

// Wired to src/lib/services/payment.service.ts in Phase 9 (submit_payment / confirm_payment RPCs).
export async function POST() {
  return NextResponse.json({ error: "Not implemented yet." }, { status: 501 });
}
