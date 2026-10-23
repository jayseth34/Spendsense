import { Category, Expense } from './models';
import { monthRange } from './dates';

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  share: number;      // 0..1 of month total
  budget: number;
  budgetUsed: number; // 0..n (1 = 100%)
}

export function sum(rows: { amount: number }[]): number {
  return Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;
}

export function categoryTotals(expenses: Expense[], categories: Category[]): CategoryTotal[] {
  const total = sum(expenses);
  const byCat = new Map<number, { total: number; count: number }>();
  for (const e of expenses) {
    const t = byCat.get(e.categoryId) ?? { total: 0, count: 0 };
    t.total += e.amount;
    t.count++;
    byCat.set(e.categoryId, t);
  }
  return categories
    .filter(c => !c.archived || byCat.has(c.id!))
    .map(c => {
      const t = byCat.get(c.id!) ?? { total: 0, count: 0 };
      return {
        category: c,
        total: Math.round(t.total * 100) / 100,
        count: t.count,
        share: total ? t.total / total : 0,
        budget: c.monthlyBudget,
        budgetUsed: c.monthlyBudget ? t.total / c.monthlyBudget : 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.category.name.localeCompare(b.category.name));
}

/** Spending per day of the month: index 0 = day 1. */
export function dailySeries(expenses: Expense[], month: string): number[] {
  const { days } = monthRange(month);
  const out = new Array(days).fill(0);
  for (const e of expenses) {
    if (e.date.startsWith(month)) out[Number(e.date.slice(8, 10)) - 1] += e.amount;
  }
  return out.map(v => Math.round(v * 100) / 100);
}

export function monthlySeries(expenses: { amount: number; date: string }[], months: string[]): number[] {
  const idx = new Map(months.map((m, i) => [m, i]));
  const out = new Array(months.length).fill(0);
  for (const e of expenses) {
    const i = idx.get(e.date.slice(0, 7));
    if (i != null) out[i] += e.amount;
  }
  return out.map(v => Math.round(v * 100) / 100);
}

export function groupBy(expenses: Expense[], key: (e: Expense) => string): { key: string; total: number; count: number }[] {
  const m = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const k = key(e);
    const t = m.get(k) ?? { total: 0, count: 0 };
    t.total += e.amount;
    t.count++;
    m.set(k, t);
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.total - a.total);
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
