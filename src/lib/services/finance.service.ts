export type CashEntry = { type: "in" | "out"; amount: number };

// Balance = sum(in) - sum(out). Reversals are just ordinary opposite-direction entries
// (§19), so they net out here automatically — no special-casing needed.
export function computeCashBalance(entries: CashEntry[]): number {
  return entries.reduce((total, entry) => total + (entry.type === "in" ? entry.amount : -entry.amount), 0);
}

export type FinancialSummaryInput = {
  incomeTotal: number;
  expensesTotal: number;
  chargesTotal: number;
};

export type FinancialSummary = {
  revenue: number;
  expenses: number;
  charges: number;
  profit: number;
};

// §20: "bénéfice" = revenus - dépenses - charges. Charges (recurring commitments) are
// kept distinct from one-off expenses in the inputs, matching how the schema separates
// them, but both reduce profit the same way.
export function computeFinancialSummary(input: FinancialSummaryInput): FinancialSummary {
  return {
    revenue: input.incomeTotal,
    expenses: input.expensesTotal,
    charges: input.chargesTotal,
    profit: input.incomeTotal - input.expensesTotal - input.chargesTotal,
  };
}

export type DateRangePreset = "today" | "week" | "month" | "last_month" | "year" | "custom";

export function resolveDateRange(preset: DateRangePreset, reference: Date, custom?: { from: string; to: string }) {
  const startOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  };
  const endOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
  };

  switch (preset) {
    case "today":
      return { from: startOfDay(reference), to: endOfDay(reference) };
    case "week": {
      const day = reference.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const from = startOfDay(new Date(reference));
      from.setDate(from.getDate() + diff);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      return { from, to: endOfDay(to) };
    }
    case "month": {
      const from = startOfDay(new Date(reference.getFullYear(), reference.getMonth(), 1));
      const to = endOfDay(new Date(reference.getFullYear(), reference.getMonth() + 1, 0));
      return { from, to };
    }
    case "last_month": {
      const from = startOfDay(new Date(reference.getFullYear(), reference.getMonth() - 1, 1));
      const to = endOfDay(new Date(reference.getFullYear(), reference.getMonth(), 0));
      return { from, to };
    }
    case "year": {
      const from = startOfDay(new Date(reference.getFullYear(), 0, 1));
      const to = endOfDay(new Date(reference.getFullYear(), 11, 31));
      return { from, to };
    }
    case "custom": {
      if (!custom) {
        throw new Error("custom date range requires from/to");
      }
      return { from: startOfDay(new Date(custom.from)), to: endOfDay(new Date(custom.to)) };
    }
  }
}
