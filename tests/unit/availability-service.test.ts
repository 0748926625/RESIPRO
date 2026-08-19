import { describe, expect, it } from "vitest";

import {
  classifyDay,
  computeAvailableWindows,
  hasAvailability,
  subtractBlocks,
  windowsFromRules,
  type AvailabilityRule,
} from "@/lib/services/availability.service";

// A Wednesday.
const DATE = new Date("2026-01-14T00:00:00");
const at = (h: number, m = 0) => new Date(2026, 0, 14, h, m, 0, 0);

const wednesdayRule: AvailabilityRule = {
  dayOfWeek: 3,
  openTime: "13:00",
  closeTime: "21:00",
  isActive: true,
};

describe("windowsFromRules", () => {
  it("returns no windows when no rule matches the weekday", () => {
    const mondayRule: AvailabilityRule = { ...wednesdayRule, dayOfWeek: 1 };
    expect(windowsFromRules([mondayRule], DATE)).toEqual([]);
  });

  it("returns no windows for an inactive rule", () => {
    expect(windowsFromRules([{ ...wednesdayRule, isActive: false }], DATE)).toEqual([]);
  });

  it("builds a concrete window for a matching active rule", () => {
    expect(windowsFromRules([wednesdayRule], DATE)).toEqual([{ start: at(13), end: at(21) }]);
  });

  it("supports multiple non-contiguous rules on the same day", () => {
    const morning: AvailabilityRule = { ...wednesdayRule, openTime: "08:00", closeTime: "11:00" };
    expect(windowsFromRules([morning, wednesdayRule], DATE)).toEqual([
      { start: at(8), end: at(11) },
      { start: at(13), end: at(21) },
    ]);
  });
});

describe("subtractBlocks", () => {
  const window = { start: at(13), end: at(21) };

  it("returns the window unchanged when no block overlaps", () => {
    expect(subtractBlocks([window], [{ start: at(9), end: at(11) }])).toEqual([window]);
  });

  it("splits the window in two when a block is in the middle", () => {
    expect(subtractBlocks([window], [{ start: at(16), end: at(17) }])).toEqual([
      { start: at(13), end: at(16) },
      { start: at(17), end: at(21) },
    ]);
  });

  it("clips the start when a block overlaps the beginning", () => {
    expect(subtractBlocks([window], [{ start: at(12), end: at(15) }])).toEqual([{ start: at(15), end: at(21) }]);
  });

  it("clips the end when a block overlaps the end", () => {
    expect(subtractBlocks([window], [{ start: at(19), end: at(22) }])).toEqual([{ start: at(13), end: at(19) }]);
  });

  it("removes the window entirely when fully covered", () => {
    expect(subtractBlocks([window], [{ start: at(10), end: at(22) }])).toEqual([]);
  });

  it("applies multiple blocks cumulatively", () => {
    expect(
      subtractBlocks([window], [
        { start: at(14), end: at(15) },
        { start: at(18), end: at(19) },
      ]),
    ).toEqual([
      { start: at(13), end: at(14) },
      { start: at(15), end: at(18) },
      { start: at(19), end: at(21) },
    ]);
  });
});

describe("computeAvailableWindows / hasAvailability", () => {
  it("combines rules and blocks end to end", () => {
    const blocks = [{ start: at(15), end: at(17) }];
    expect(computeAvailableWindows([wednesdayRule], blocks, DATE)).toEqual([
      { start: at(13), end: at(15) },
      { start: at(17), end: at(21) },
    ]);
  });

  it("reports no availability once every window is blocked", () => {
    const blocks = [{ start: at(0), end: at(23, 59) }];
    expect(hasAvailability([wednesdayRule], blocks, DATE)).toBe(false);
  });

  it("reports availability when at least one window remains", () => {
    expect(hasAvailability([wednesdayRule], [], DATE)).toBe(true);
  });
});

describe("classifyDay", () => {
  it("flags a day with no matching rule as closed, not blocked", () => {
    const monday = new Date(2026, 0, 12);
    const result = classifyDay([wednesdayRule], [], monday);
    expect(result).toEqual({ hasRule: false, isAvailable: false, blocksOnDay: [] });
  });

  it("flags an open day with no blocks as available", () => {
    const result = classifyDay([wednesdayRule], [], DATE);
    expect(result.hasRule).toBe(true);
    expect(result.isAvailable).toBe(true);
    expect(result.blocksOnDay).toEqual([]);
  });

  it("flags an open day fully covered by a block as unavailable, and lists the block", () => {
    const block = { start: at(0), end: at(23, 59) };
    const result = classifyDay([wednesdayRule], [block], DATE);
    expect(result.hasRule).toBe(true);
    expect(result.isAvailable).toBe(false);
    expect(result.blocksOnDay).toEqual([block]);
  });

  it("ignores blocks that fall on a different day", () => {
    const otherDayBlock = { start: new Date(2026, 0, 15, 10), end: new Date(2026, 0, 15, 12) };
    const result = classifyDay([wednesdayRule], [otherDayBlock], DATE);
    expect(result.blocksOnDay).toEqual([]);
    expect(result.isAvailable).toBe(true);
  });
});
