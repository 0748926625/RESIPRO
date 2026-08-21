import Link from "next/link";

import { computeCashBalance, computeFinancialSummary, resolveDateRange } from "@/lib/services/finance.service";
import { createClient } from "@/lib/supabase/server";

const PERIOD_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  last_month: "Mois précédent",
  year: "Cette année",
};

export default async function OwnerFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period = "month", from, to } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owner } = await supabase.from("owners").select("id").eq("profile_id", user!.id).single();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, currency")
    .eq("owner_id", owner?.id ?? "")
    .order("name");

  if (!properties || properties.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-xl font-semibold text-foreground">Finances</h1>
        <p className="text-sm text-foreground/60">Créez d&apos;abord une résidence pour voir vos finances ici.</p>
      </div>
    );
  }

  const propertyIds = properties.map((p) => p.id);
  const currencies = [...new Set(properties.map((p) => p.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;

  const range =
    period === "custom" && from && to
      ? resolveDateRange("custom", new Date(), { from, to })
      : resolveDateRange((period as "today" | "week" | "month" | "last_month" | "year") ?? "month", new Date());

  const fromDate = range.from.toISOString().slice(0, 10);
  const toDate = range.to.toISOString().slice(0, 10);

  const [{ data: expenses }, { data: incomes }, { data: charges }, { data: cashRows }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, property_id, expense_categories(label)")
      .in("property_id", propertyIds)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate),
    supabase
      .from("income_transactions")
      .select("id, amount, property_id")
      .in("property_id", propertyIds)
      .gte("income_date", fromDate)
      .lte("income_date", toDate),
    supabase.from("recurring_charges").select("amount").in("property_id", propertyIds).eq("is_active", true),
    supabase.from("cash_transactions").select("type, amount").in("property_id", propertyIds),
  ]);

  const expensesRows = expenses ?? [];
  const incomesRows = incomes ?? [];
  const chargesRows = charges ?? [];

  const expensesTotal = expensesRows.reduce((sum, row) => sum + row.amount, 0);
  const incomeTotal = incomesRows.reduce((sum, row) => sum + row.amount, 0);
  const chargesTotal = chargesRows.reduce((sum, row) => sum + row.amount, 0);
  const summary = computeFinancialSummary({ incomeTotal, expensesTotal, chargesTotal });
  const cashBalance = computeCashBalance(cashRows ?? []);

  const revenueByProperty = new Map<string, number>();
  for (const row of incomesRows) {
    revenueByProperty.set(row.property_id, (revenueByProperty.get(row.property_id) ?? 0) + row.amount);
  }

  const expensesByCategory = new Map<string, number>();
  for (const row of expensesRows) {
    const label = (row.expense_categories as { label: string } | null)?.label ?? "Autre";
    expensesByCategory.set(label, (expensesByCategory.get(label) ?? 0) + row.amount);
  }

  const basePath = "/owner/finance";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Finances</h1>
        <p className="text-sm text-foreground/60">Vue consolidée sur les {properties.length} résidence(s).</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {Object.entries(PERIOD_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`${basePath}?period=${value}`}
            className={`rounded-full px-3 py-1 ${
              period === value ? "bg-primary text-primary-foreground" : "border border-foreground/15 text-foreground/70"
            }`}
          >
            {label}
          </Link>
        ))}
        <form action={basePath} method="GET" className="flex items-center gap-1">
          <input type="hidden" name="period" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={period === "custom" ? from : undefined}
            className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs"
          />
          <span className="text-xs text-foreground/50">→</span>
          <input
            type="date"
            name="to"
            defaultValue={period === "custom" ? to : undefined}
            className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs"
          />
          <button type="submit" className="rounded-full border border-foreground/15 px-3 py-1 text-xs">
            Période personnalisée
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Chiffre d'affaires", value: summary.revenue },
          { label: "Dépenses", value: summary.expenses },
          { label: "Charges", value: summary.charges },
          { label: "Bénéfice", value: summary.profit },
          { label: "Trésorerie (solde)", value: cashBalance },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-foreground/10 p-3">
            <p className="text-xs text-foreground/60">{card.label}</p>
            <p className="text-lg font-semibold text-foreground">
              {card.value.toLocaleString("fr-FR")} {currency ?? ""}
            </p>
          </div>
        ))}
      </div>
      {!currency ? (
        <p className="text-xs text-foreground/50">
          Vos résidences utilisent des devises différentes ({currencies.join(", ")}) — les totaux ci-dessus mélangent
          ces devises. Consultez les états par résidence pour des montants dans une devise unique.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Revenus par résidence</h2>
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
          {properties.map((property) => (
            <li key={property.id} className="flex items-center justify-between px-3 py-2">
              <Link href={`/owner/properties/${property.id}/finance`} className="hover:underline">
                {property.name}
              </Link>
              <span className="font-medium text-foreground">
                {(revenueByProperty.get(property.id) ?? 0).toLocaleString("fr-FR")} {property.currency}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Dépenses par catégorie</h2>
        {expensesByCategory.size === 0 ? (
          <p className="text-sm text-foreground/60">Aucune dépense sur cette période.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {[...expensesByCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([label, amount]) => (
                <li key={label} className="flex items-center justify-between px-3 py-2">
                  <span>{label}</span>
                  <span className="font-medium text-foreground">
                    {amount.toLocaleString("fr-FR")} {currency ?? ""}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Détail par résidence</h2>
        <p className="text-xs text-foreground/60">
          Pour enregistrer un revenu, une dépense, une charge ou une opération de caisse, ouvrez la résidence
          concernée — chaque résidence garde ses propres écritures (§18, §19).
        </p>
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/owner/properties/${property.id}/finance`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-foreground/5"
              >
                <span className="font-medium text-foreground">{property.name}</span>
                <span className="text-foreground/60">Voir le détail →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
