import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CashTransactionForm,
  ExpenseForm,
  IncomeForm,
  RecurringChargeForm,
} from "@/components/finance/finance-forms";
import { computeCashBalance, computeFinancialSummary, resolveDateRange } from "@/lib/services/finance.service";
import { createClient } from "@/lib/supabase/server";
import { RECURRING_CHARGE_FREQUENCY_LABELS } from "@/lib/validations/finance.schema";

import {
  createCashTransaction,
  createExpense,
  createIncome,
  createRecurringCharge,
  deactivateRecurringCharge,
  reverseCashTransaction,
} from "./actions";

const PERIOD_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  last_month: "Mois précédent",
  year: "Cette année",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function PropertyFinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { period = "month", from, to } = await searchParams;

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id, name, currency").eq("id", id).single();
  if (!property) {
    notFound();
  }

  const range =
    period === "custom" && from && to
      ? resolveDateRange("custom", new Date(), { from, to })
      : resolveDateRange((period as "today" | "week" | "month" | "last_month" | "year") ?? "month", new Date());

  const fromDate = range.from.toISOString().slice(0, 10);
  const toDate = range.to.toISOString().slice(0, 10);

  const [
    { data: categories },
    { data: expenses },
    { data: incomes },
    { data: charges },
    { data: allCashTransactions },
  ] = await Promise.all([
    supabase.from("expense_categories").select("id, label").order("label"),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date, expense_categories(label)")
      .eq("property_id", id)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .order("expense_date", { ascending: false }),
    supabase
      .from("income_transactions")
      .select("id, amount, source, income_date, bookings(booking_code)")
      .eq("property_id", id)
      .gte("income_date", fromDate)
      .lte("income_date", toDate)
      .order("income_date", { ascending: false }),
    supabase
      .from("recurring_charges")
      .select("id, label, amount, frequency, next_due_date, is_active")
      .eq("property_id", id)
      .eq("is_active", true)
      .order("next_due_date"),
    supabase
      .from("cash_transactions")
      .select("id, type, amount, reason, created_at, reversal_of")
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const expensesRows = expenses ?? [];
  const incomesRows = incomes ?? [];
  const chargesRows = charges ?? [];
  const cashRows = allCashTransactions ?? [];

  const expensesTotal = expensesRows.reduce((sum, row) => sum + row.amount, 0);
  const incomeTotal = incomesRows.reduce((sum, row) => sum + row.amount, 0);
  const chargesTotal = chargesRows.reduce((sum, row) => sum + row.amount, 0);
  const summary = computeFinancialSummary({ incomeTotal, expensesTotal, chargesTotal });
  const cashBalance = computeCashBalance(cashRows);

  const boundCreateExpense = createExpense.bind(null, id);
  const boundCreateIncome = createIncome.bind(null, id);
  const boundCreateCharge = createRecurringCharge.bind(null, id);
  const boundCreateCash = createCashTransaction.bind(null, id);

  const basePath = `/owner/properties/${id}/finance`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <Link href={`/owner/properties/${id}`} className="text-xs text-foreground/60 underline">
          ← {property.name}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">États financiers</h1>
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
          <input type="date" name="from" defaultValue={period === "custom" ? from : undefined} className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs" />
          <span className="text-xs text-foreground/50">→</span>
          <input type="date" name="to" defaultValue={period === "custom" ? to : undefined} className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs" />
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
              {card.value.toLocaleString("fr-FR")} {property.currency}
            </p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Revenus</h2>
        {incomesRows.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucun revenu sur cette période.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {incomesRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {dateFormatter.format(new Date(row.income_date))} ·{" "}
                  {row.source === "booking" ? `Réservation ${row.bookings?.booking_code ?? ""}` : "Autre revenu"}
                </span>
                <span className="font-medium text-foreground">{row.amount.toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        )}
        <IncomeForm action={boundCreateIncome} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Dépenses</h2>
        {expensesRows.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucune dépense sur cette période.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {expensesRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {dateFormatter.format(new Date(row.expense_date))} · {row.expense_categories?.label ?? "Autre"}
                  {row.description ? ` — ${row.description}` : ""}
                </span>
                <span className="font-medium text-foreground">{row.amount.toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        )}
        <ExpenseForm action={boundCreateExpense} categories={categories ?? []} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Charges récurrentes</h2>
        {chargesRows.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucune charge récurrente active.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {chargesRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {row.label} · {RECURRING_CHARGE_FREQUENCY_LABELS[row.frequency as keyof typeof RECURRING_CHARGE_FREQUENCY_LABELS] ?? row.frequency} ·
                  prochaine échéance {dateFormatter.format(new Date(row.next_due_date))}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{row.amount.toLocaleString("fr-FR")}</span>
                  <form action={deactivateRecurringCharge.bind(null, id, row.id)}>
                    <button type="submit" className="text-xs text-red-600 underline">
                      Désactiver
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <RecurringChargeForm action={boundCreateCharge} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Caisse</h2>
        {cashRows.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucune opération de caisse.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
            {cashRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-3 py-2">
                <span>
                  {dateFormatter.format(new Date(row.created_at))} · {row.reason}
                  {row.reversal_of ? " (annulation)" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${row.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                    {row.type === "in" ? "+" : "-"}
                    {row.amount.toLocaleString("fr-FR")}
                  </span>
                  {!row.reversal_of ? (
                    <form action={reverseCashTransaction.bind(null, id, row.id)}>
                      <button type="submit" className="text-xs text-foreground/60 underline">
                        Annuler
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <CashTransactionForm action={boundCreateCash} />
        <p className="text-xs text-foreground/50">
          Aucune opération n&apos;est jamais supprimée : une annulation crée une opération inverse (§19).
        </p>
      </section>
    </div>
  );
}
