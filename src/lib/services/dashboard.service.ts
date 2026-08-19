// Occupancy = booked time / bookable time, both in minutes, over whatever period the
// caller already filtered to. availableMinutes of 0 (no opening hours defined at all)
// reports 0% rather than dividing by zero or claiming 100%.
export function computeOccupancyRate(bookedMinutes: number, availableMinutes: number): number {
  if (availableMinutes <= 0) return 0;
  return Math.min(100, (bookedMinutes / availableMinutes) * 100);
}

export type CommissionableBooking = { totalPrice: number };

// §32: commission is either a flat fee per booking or a percentage of its total_price —
// whichever the Super Admin configured in platform_settings, never hard-coded.
export function computePlatformCommission(
  bookings: CommissionableBooking[],
  commissionType: "fixed" | "percentage",
  commissionValue: number,
): number {
  if (commissionType === "fixed") {
    return bookings.length * commissionValue;
  }
  return bookings.reduce((total, booking) => total + (booking.totalPrice * commissionValue) / 100, 0);
}
