import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockForm } from "@/components/calendar/block-form";
import { DayDetail } from "@/components/calendar/day-detail";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { RuleForm } from "@/components/calendar/rule-form";
import { addDays, startOfDay } from "@/lib/services/calendar.service";
import { createClient } from "@/lib/supabase/server";
import { AVAILABILITY_BLOCK_REASON_LABELS, DAY_OF_WEEK_LABELS } from "@/lib/validations/availability.schema";

import { createBlock, createRule, deleteBlock, deleteRule, setQuickBlocks } from "./actions";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function PropertyAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; month?: string; date?: string }>;
}) {
  const { id } = await params;
  const { view = "month", month: monthParam, date: dateParam } = await searchParams;

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id, name").eq("id", id).single();

  if (!property) {
    notFound();
  }

  const [{ data: ruleRows }, { data: blockRows }] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("id, day_of_week, open_time, close_time, min_duration_minutes")
      .eq("property_id", id)
      .order("day_of_week")
      .order("open_time"),
    supabase
      .from("availability_blocks")
      .select("id, starts_at, ends_at, reason, note")
      .eq("property_id", id)
      .order("starts_at"),
  ]);

  const rules = (ruleRows ?? []).map((rule) => ({
    dayOfWeek: rule.day_of_week,
    openTime: rule.open_time,
    closeTime: rule.close_time,
    isActive: true,
  }));

  const blocks = (blockRows ?? []).map((block) => ({
    id: block.id,
    start: new Date(block.starts_at),
    end: new Date(block.ends_at),
    reason: block.reason,
    note: block.note,
  }));

  const basePath = `/owner/properties/${id}/availability`;
  const monthDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : startOfDay(new Date());
  const selectedDate = dateParam ? new Date(`${dateParam}T00:00:00`) : startOfDay(new Date());

  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const prevMonthParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  const boundCreateRule = createRule.bind(null, id);
  const boundCreateBlock = createBlock.bind(null, id);
  const boundSetQuickBlocks = setQuickBlocks.bind(null, id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <Link href={`/owner/properties/${id}`} className="text-xs text-foreground/60 underline">
          ← {property.name}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Calendrier &amp; disponibilités</h1>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <Link
          href={`${basePath}?view=month&month=${monthParam ?? ""}`}
          className={view === "month" ? "font-medium text-foreground underline" : "text-foreground/60"}
        >
          Mois
        </Link>
        <Link
          href={`${basePath}?view=day&date=${dateParam ?? ""}`}
          className={view === "day" ? "font-medium text-foreground underline" : "text-foreground/60"}
        >
          Jour
        </Link>
        <div className="ml-auto flex items-center gap-3 text-xs text-foreground/60">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" /> disponible
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/40" /> bloqué
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" /> fermé
          </span>
        </div>
      </div>

      {view === "day" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <Link href={`${basePath}?view=day&date=${addDays(selectedDate, -1).toISOString().slice(0, 10)}`}>
              ← Veille
            </Link>
            <Link href={`${basePath}?view=day&date=${addDays(selectedDate, 1).toISOString().slice(0, 10)}`}>
              Lendemain →
            </Link>
          </div>
          <DayDetail
            date={selectedDate}
            rules={rules}
            blocks={blocks}
            renderDeleteBlock={(block) => (
              <form action={deleteBlock.bind(null, id, block.id)}>
                <button type="submit" className="text-xs text-red-600 underline">
                  Supprimer
                </button>
              </form>
            )}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <Link href={`${basePath}?view=month&month=${prevMonthParam}`}>← Mois précédent</Link>
            <span className="font-medium text-foreground">
              {monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <Link href={`${basePath}?view=month&month=${nextMonthParam}`}>Mois suivant →</Link>
          </div>
          <MonthCalendar
            month={monthDate}
            rules={rules}
            blocks={blocks}
            basePath={basePath}
            onToggleQuickBlocks={boundSetQuickBlocks}
          />
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Horaires d&apos;ouverture récurrents</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucun horaire défini — la résidence apparaît fermée tous les jours.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
            {(ruleRows ?? []).map((rule) => (
              <li key={rule.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {DAY_OF_WEEK_LABELS[rule.day_of_week]} · {rule.open_time.slice(0, 5)} – {rule.close_time.slice(0, 5)}
                </span>
                <form action={deleteRule.bind(null, id, rule.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <RuleForm action={boundCreateRule} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Blocages (maintenance, nettoyage, manuel)</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucun blocage.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {AVAILABILITY_BLOCK_REASON_LABELS[
                    block.reason as keyof typeof AVAILABILITY_BLOCK_REASON_LABELS
                  ] ?? block.reason}{" "}
                  · {block.start.toLocaleDateString("fr-FR")} {timeFormatter.format(block.start)}–
                  {timeFormatter.format(block.end)}
                  {block.note ? ` · ${block.note}` : ""}
                </span>
                <form action={deleteBlock.bind(null, id, block.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <BlockForm action={boundCreateBlock} />
      </section>
    </div>
  );
}
