import { describe, expect, it } from "vitest";

import { buildMonthGrid, buildWeekDays, isSameDay, startOfWeek } from "@/lib/services/calendar.service";

describe("startOfWeek", () => {
  it("returns the same date for a Monday", () => {
    const monday = new Date(2026, 0, 12); // 2026-01-12 is a Monday
    expect(isSameDay(startOfWeek(monday), monday)).toBe(true);
  });

  it("rolls a Sunday back to the preceding Monday", () => {
    const sunday = new Date(2026, 0, 18); // 2026-01-18 is a Sunday
    expect(isSameDay(startOfWeek(sunday), new Date(2026, 0, 12))).toBe(true);
  });

  it("rolls a mid-week date back to that week's Monday", () => {
    const wednesday = new Date(2026, 0, 14);
    expect(isSameDay(startOfWeek(wednesday), new Date(2026, 0, 12))).toBe(true);
  });
});

describe("buildWeekDays", () => {
  it("returns exactly 7 consecutive days starting on Monday", () => {
    const days = buildWeekDays(new Date(2026, 0, 14));
    expect(days).toHaveLength(7);
    expect(isSameDay(days[0], new Date(2026, 0, 12))).toBe(true);
    expect(isSameDay(days[6], new Date(2026, 0, 18))).toBe(true);
  });
});

describe("buildMonthGrid", () => {
  it("returns a 42-day grid that includes the whole month", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15)); // February 2026
    expect(grid).toHaveLength(42);
    const feb1 = grid.find((d) => isSameDay(d, new Date(2026, 1, 1)));
    const feb28 = grid.find((d) => isSameDay(d, new Date(2026, 1, 28)));
    expect(feb1).toBeDefined();
    expect(feb28).toBeDefined();
  });

  it("starts the grid on a Monday", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15));
    expect(grid[0].getDay()).toBe(1);
  });
});
