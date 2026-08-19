import { describe, expect, it } from "vitest";

import { computeOccupancyRate, computePlatformCommission } from "@/lib/services/dashboard.service";

describe("computeOccupancyRate", () => {
  it("computes a simple percentage", () => {
    expect(computeOccupancyRate(120, 480)).toBe(25);
  });

  it("returns 0 when there is no bookable time at all", () => {
    expect(computeOccupancyRate(0, 0)).toBe(0);
    expect(computeOccupancyRate(60, 0)).toBe(0);
  });

  it("caps at 100 even if booked exceeds available (shouldn't happen, but stay safe)", () => {
    expect(computeOccupancyRate(600, 480)).toBe(100);
  });

  it("returns 0 for no bookings", () => {
    expect(computeOccupancyRate(0, 480)).toBe(0);
  });
});

describe("computePlatformCommission", () => {
  it("multiplies a flat fee by the number of bookings", () => {
    expect(
      computePlatformCommission([{ totalPrice: 10000 }, { totalPrice: 25000 }], "fixed", 500),
    ).toBe(1000);
  });

  it("sums a percentage of each booking's total price", () => {
    expect(
      computePlatformCommission([{ totalPrice: 10000 }, { totalPrice: 20000 }], "percentage", 10),
    ).toBe(3000);
  });

  it("returns 0 for no bookings regardless of type", () => {
    expect(computePlatformCommission([], "percentage", 10)).toBe(0);
    expect(computePlatformCommission([], "fixed", 500)).toBe(0);
  });
});
