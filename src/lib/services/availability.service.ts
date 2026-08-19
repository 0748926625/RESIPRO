export type TimeWindow = { start: Date; end: Date };

export type AvailabilityRule = {
  dayOfWeek: number; // 0 (Sunday) .. 6 (Saturday), matches JS Date#getDay()
  openTime: string; // "HH:MM" or "HH:MM:SS"
  closeTime: string;
  isActive: boolean;
};

export type AvailabilityBlock = TimeWindow;

function atTimeOfDay(date: Date, time: string): Date {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, seconds ?? 0, 0);
  return result;
}

// Recurring weekly rules -> concrete windows for one calendar date. A property can have
// more than one active rule for the same weekday (e.g. split morning/evening hours), so
// this can return multiple windows.
export function windowsFromRules(rules: AvailabilityRule[], date: Date): TimeWindow[] {
  const dayOfWeek = date.getDay();
  return rules
    .filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek)
    .map((rule) => ({ start: atTimeOfDay(date, rule.openTime), end: atTimeOfDay(date, rule.closeTime) }))
    .filter((window) => window.start < window.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  return a.start < b.end && b.start < a.end;
}

// Subtracts every block that overlaps a window from that window, splitting it into
// however many free sub-windows remain (possibly zero). This is the actual "is this
// property available" computation (§50 priority #1) — the booking engine (Phase 7/8)
// will reuse it before ever trusting a client-submitted time range.
export function subtractBlocks(windows: TimeWindow[], blocks: AvailabilityBlock[]): TimeWindow[] {
  let remaining = windows;

  for (const block of blocks) {
    const next: TimeWindow[] = [];
    for (const window of remaining) {
      if (!overlaps(window, block)) {
        next.push(window);
        continue;
      }
      if (block.start > window.start) {
        next.push({ start: window.start, end: block.start });
      }
      if (block.end < window.end) {
        next.push({ start: block.end, end: window.end });
      }
    }
    remaining = next;
  }

  return remaining.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function computeAvailableWindows(
  rules: AvailabilityRule[],
  blocks: AvailabilityBlock[],
  date: Date,
): TimeWindow[] {
  return subtractBlocks(windowsFromRules(rules, date), blocks);
}

export function hasAvailability(rules: AvailabilityRule[], blocks: AvailabilityBlock[], date: Date): boolean {
  return computeAvailableWindows(rules, blocks, date).length > 0;
}

export type DayClassification = {
  hasRule: boolean;
  isAvailable: boolean;
  blocksOnDay: AvailabilityBlock[];
};

// Drives calendar day-cell coloring (§17): "no opening hours defined" vs "open but fully
// blocked" vs "open with availability" are visually distinct states.
export function classifyDay(
  rules: AvailabilityRule[],
  blocks: AvailabilityBlock[],
  date: Date,
): DayClassification {
  const ruleWindows = windowsFromRules(rules, date);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const blocksOnDay = blocks.filter((block) => overlaps(block, { start: dayStart, end: dayEnd }));

  return {
    hasRule: ruleWindows.length > 0,
    isAvailable: subtractBlocks(ruleWindows, blocksOnDay).length > 0,
    blocksOnDay,
  };
}
