import { computeAvailableWindows, type AvailabilityBlock, type AvailabilityRule } from "@/lib/services/availability.service";
import { AVAILABILITY_BLOCK_REASON_LABELS } from "@/lib/validations/availability.schema";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function DayDetail({
  date,
  rules,
  blocks,
  renderDeleteBlock,
}: {
  date: Date;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  renderDeleteBlock: (
    block: AvailabilityBlock & { id: string; reason: string; note: string | null; clientName?: string | null },
  ) => React.ReactNode;
}) {
  const windows = computeAvailableWindows(rules, blocks, date);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayBlocks = blocks.filter(
    (block): block is AvailabilityBlock & { id: string; reason: string; note: string | null; clientName?: string | null } =>
      block.start < dayEnd && block.end > dayStart,
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-4">
      <h3 className="text-sm font-medium text-foreground">
        {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </h3>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-foreground/60">Créneaux disponibles</p>
        {windows.length === 0 ? (
          <p className="text-sm text-foreground/50">Aucune disponibilité ce jour-là.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {windows.map((window) => (
              <li
                key={window.start.toISOString()}
                className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300"
              >
                {timeFormatter.format(window.start)} – {timeFormatter.format(window.end)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-foreground/60">Blocages</p>
        {dayBlocks.length === 0 ? (
          <p className="text-sm text-foreground/50">Aucun blocage ce jour-là.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayBlocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {block.clientName ??
                      AVAILABILITY_BLOCK_REASON_LABELS[
                        block.reason as keyof typeof AVAILABILITY_BLOCK_REASON_LABELS
                      ] ??
                      block.reason}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {timeFormatter.format(block.start)} – {timeFormatter.format(block.end)}
                    {block.note ? ` · ${block.note}` : ""}
                  </p>
                </div>
                {renderDeleteBlock(block)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
