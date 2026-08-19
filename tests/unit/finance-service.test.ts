import { describe, expect, it } from "vitest";

import {
  computeCashBalance,
  computeFinancialSummary,
  resolveDateRange,
} from "@/lib/services/finance.service";

describe("computeCashBalance", () => {
  it("sums entries with in adding and out subtracting", () => {
    expect(
      computeCashBalance([
        { type: "in", amount: 10000 },
        { type: "out", amount: 3000 },
        { type: "in", amount: 2000 },
      ]),
    ).toBe(9000);
  });

  it("nets out a reversal (opposite-direction entry of the same amount)", () => {
    expect(
      computeCashBalance([
        { type: "in", amount: 5000 },
        { type: "out", amount: 5000 }, // reversal of the entry above
      ]),
    ).toBe(0);
  });

  it("returns 0 for no entries", () => {
    expect(computeCashBalance([])).toBe(0);
  });
});

describe("computeFinancialSummary", () => {
  it("computes profit as revenue minus expenses minus charges", () => {
    expect(computeFinancialSummary({ incomeTotal: 100000, expensesTotal: 20000, chargesTotal: 15000 })).toEqual({
      revenue: 100000,
      expenses: 20000,
      charges: 15000,
      profit: 65000,
    });
  });

  it("allows a negative profit", () => {
    expect(computeFinancialSummary({ incomeTotal: 1000, expensesTotal: 2000, chargesTotal: 500 }).profit).toBe(-1500);
  });
});

describe("resolveDateRange", () => {
  const wednesday = new Date(2026, 0, 14, 15, 30);

  it("today spans just the reference day", () => {
    const { from, to } = resolveDateRange("today", wednesday);
    expect(from.getDate()).toBe(14);
    expect(to.getDate()).toBe(14);
    expect(from.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
  });

  it("week starts on Monday and ends on Sunday", () => {
    const { from, to } = resolveDateRange("week", wednesday);
    expect(from.getDay()).toBe(1);
    expect(from.getDate()).toBe(12);
    expect(to.getDay()).toBe(0);
    expect(to.getDate()).toBe(18);
  });

  it("month spans the full calendar month", () => {
    const { from, to } = resolveDateRange("month", wednesday);
    expect(from.getDate()).toBe(1);
    expect(from.getMonth()).toBe(0);
    expect(to.getMonth()).toBe(0);
    expect(to.getDate()).toBe(31);
  });

  it("last_month spans the previous calendar month", () => {
    const { from, to } = resolveDateRange("last_month", wednesday);
    expect(from.getMonth()).toBe(11);
    expect(from.getFullYear()).toBe(2025);
    expect(to.getMonth()).toBe(11);
    expect(to.getDate()).toBe(31);
  });

  it("year spans the full calendar year", () => {
    const { from, to } = resolveDateRange("year", wednesday);
    expect(from.getMonth()).toBe(0);
    expect(from.getDate()).toBe(1);
    expect(to.getMonth()).toBe(11);
    expect(to.getDate()).toBe(31);
  });

  it("custom uses the provided from/to", () => {
    const { from, to } = resolveDateRange("custom", wednesday, { from: "2026-02-01", to: "2026-02-10" });
    expect(from.getMonth()).toBe(1);
    expect(from.getDate()).toBe(1);
    expect(to.getDate()).toBe(10);
  });

  it("throws for custom without a range", () => {
    expect(() => resolveDateRange("custom", wednesday)).toThrow();
  });
});
