import Link from "next/link";

import {
  classifyDay,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/services/availability.service";
import { buildMonthGrid, isSameDay } from "@/lib/services/calendar.service";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function MonthCalendar({
  month,
  rules,
  blocks,
  basePath,
}: {
  month: Date;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  basePath: string;
}) {
  const grid = buildMonthGrid(month);
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-lg border border-foreground/10">
      <div className="grid grid-cols-7 border-b border-foreground/10 bg-foreground/5 text-xs font-medium text-foreground/60">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-1.5 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((date) => {
          const inMonth = date.getMonth() === month.getMonth();
          const { hasRule, isAvailable, blocksOnDay } = classifyDay(rules, blocks, date);
          const dateParam = date.toISOString().slice(0, 10);

          let cellClass = "bg-transparent";
          if (inMonth) {
            if (!hasRule) cellClass = "bg-foreground/5";
            else if (isAvailable) cellClass = "bg-emerald-500/10";
            else cellClass = "bg-red-500/10";
          }

          return (
            <Link
              key={date.toISOString()}
              href={`${basePath}?view=day&date=${dateParam}`}
              className={`flex min-h-20 flex-col gap-1 border-b border-r border-foreground/5 p-1.5 text-xs ${cellClass} ${
                inMonth ? "text-foreground" : "text-foreground/30"
              }`}
            >
              <span className={isSameDay(date, today) ? "font-semibold underline" : ""}>{date.getDate()}</span>
              {blocksOnDay.length > 0 ? (
                <span className="rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-700 dark:text-red-300">
                  {blocksOnDay.length} blocage{blocksOnDay.length > 1 ? "s" : ""}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
