import Link from "next/link";

import { computeOccupancyRate } from "@/lib/services/dashboard.service";
import { computeCashBalance, computeFinancialSummary, resolveDateRange } from "@/lib/services/finance.service";
import { totalMinutes, windowsFromRules, type AvailabilityRule } from "@/lib/services/availability.service";
import { addDays, isSameDay } from "@/lib/services/calendar.service";
import { BOOKING_STATUS_LABELS } from "@/lib/constants/statuses";
import type { BookingStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owner } = await supabase.from("owners").select("id").eq("profile_id", user!.id).single();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, currency")
    .eq("owner_id", owner?.id ?? "");

  const propertyIds = (properties ?? []).map((p) => p.id);
  const currency = properties?.[0]?.currency ?? "XOF";

  if (propertyIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-xl font-semibold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-foreground/60">
          Créez votre première résidence pour voir vos indicateurs ici.
        </p>
        <Link href="/owner/properties/new" className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Nouvelle résidence
        </Link>
      </div>
    );
  }

  const now = new Date();
  const today = resolveDateRange("today", now);
  const month = resolveDateRange("month", now);

  const [
    { data: incomeRows },
    { data: expenseRows },
    { data: chargeRows },
    { data: cashRows },
    { data: bookingsThisMonth },
    { data: upcomingBookings },
    { data: rulesRows },
    { data: monthSegments },
  ] = await Promise.all([
    supabase.from("income_transactions").select("amount, income_date, property_id").in("property_id", propertyIds),
    supabase.from("expenses").select("amount, expense_date").in("property_id", propertyIds),
    supabase.from("recurring_charges").select("amount").in("property_id", propertyIds).eq("is_active", true),
    supabase.from("cash_transactions").select("type, amount").in("property_id", propertyIds),
    supabase
      .from("bookings")
      .select("id, status")
      .in("property_id", propertyIds)
      .gte("starts_at", month.from.toISOString())
      .lte("starts_at", month.to.toISOString()),
    supabase
      .from("bookings")
      .select("id, booking_code, starts_at, ends_at, status, properties(name)")
      .in("property_id", propertyIds)
      .gte("starts_at", now.toISOString())
      .not("status", "in", "(cancelled,rejected,completed,expired)")
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase.from("availability_rules").select("property_id, day_of_week, open_time, close_time").in("property_id", propertyIds).eq("is_active", true),
    supabase
      .from("booking_segments")
      .select("property_id, starts_at, ends_at")
      .in("property_id", propertyIds)
      .neq("status", "cancelled")
      .gte("starts_at", month.from.toISOString())
      .lte("starts_at", month.to.toISOString()),
  ]);

  const incomeToday = (incomeRows ?? [])
    .filter((row) => new Date(row.income_date) >= today.from && new Date(row.income_date) <= today.to)
    .reduce((sum, row) => sum + row.amount, 0);
  const incomeMonth = (incomeRows ?? [])
    .filter((row) => new Date(row.income_date) >= month.from && new Date(row.income_date) <= month.to)
    .reduce((sum, row) => sum + row.amount, 0);
  const revenueAllTime = (incomeRows ?? []).reduce((sum, row) => sum + row.amount, 0);

  const expensesMonth = (expenseRows ?? [])
    .filter((row) => new Date(row.expense_date) >= month.from && new Date(row.expense_date) <= month.to)
    .reduce((sum, row) => sum + row.amount, 0);
  const chargesTotal = (chargeRows ?? []).reduce((sum, row) => sum + row.amount, 0);
  const summary = computeFinancialSummary({ incomeTotal: incomeMonth, expensesTotal: expensesMonth, chargesTotal });
  const cashBalance = computeCashBalance(cashRows ?? []);

  // Occupancy over the current month: bookable minutes (from opening-hours rules, day by
  // day) vs. booked minutes (non-cancelled segments) — same pure functions Phase 6/7 use
  // to actually validate bookings, not a separate ad-hoc estimate.
  const rulesByProperty = new Map<string, AvailabilityRule[]>();
  for (const row of rulesRows ?? []) {
    const list = rulesByProperty.get(row.property_id) ?? [];
    list.push({ dayOfWeek: row.day_of_week, openTime: row.open_time, closeTime: row.close_time, isActive: true });
    rulesByProperty.set(row.property_id, list);
  }

  let availableMinutes = 0;
  for (const propertyId of propertyIds) {
    const rules = rulesByProperty.get(propertyId) ?? [];
    if (rules.length === 0) continue;
    for (let day = month.from; !isSameDay(day, addDays(month.to, 1)); day = addDays(day, 1)) {
      availableMinutes += totalMinutes(windowsFromRules(rules, day));
      if (day > month.to) break;
    }
  }

  const bookedMinutes = (monthSegments ?? []).reduce(
    (sum, segment) => sum + (new Date(segment.ends_at).getTime() - new Date(segment.starts_at).getTime()) / 60000,
    0,
  );
  const occupancyRate = computeOccupancyRate(bookedMinutes, availableMinutes);

  const cards = [
    { label: "Chiffre d'affaires", value: revenueAllTime },
    { label: "Revenus du jour", value: incomeToday },
    { label: "Revenus du mois", value: incomeMonth },
    { label: "Dépenses du mois", value: expensesMonth },
    { label: "Charges (actives)", value: chargesTotal },
    { label: "Bénéfice estimé (mois)", value: summary.profit },
    { label: "Caisse (solde)", value: cashBalance },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-foreground/10 p-3">
            <p className="text-xs text-foreground/60">{card.label}</p>
            <p className="text-lg font-semibold text-foreground">
              {card.value.toLocaleString("fr-FR")} {currency}
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-foreground/10 p-3">
          <p className="text-xs text-foreground/60">Réservations (mois)</p>
          <p className="text-lg font-semibold text-foreground">{(bookingsThisMonth ?? []).length}</p>
        </div>
        <div className="rounded-lg border border-foreground/10 p-3">
          <p className="text-xs text-foreground/60">Taux d&apos;occupation (mois)</p>
          <p className="text-lg font-semibold text-foreground">{occupancyRate.toFixed(0)}%</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Réservations à venir</h2>
        {!upcomingBookings || upcomingBookings.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucune réservation à venir.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {upcomingBookings.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {(booking.properties as { name: string } | null)?.name ?? "Résidence"} — {booking.booking_code} ·{" "}
                  {new Date(booking.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span className="text-xs text-foreground/50">
                  {BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/owner/bookings" className="w-fit text-sm underline">
          Voir toutes les réservations
        </Link>
      </section>
    </div>
  );
}
