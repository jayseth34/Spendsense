import { Component } from '@angular/core';
import { combineLatest, map, switchMap } from 'rxjs';
import { categoryTotals, dailySeries, pctChange, sum } from '../core/analytics';
import { DataService } from '../core/data.service';
import { addMonths, currentMonth, monthRange, today, weekRange } from '../core/dates';
import { MonthService } from '../core/ui';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  vm$ = combineLatest([this.ms.month$, this.data.categories$(true), this.data.setting$<number>('overallBudget', 0)]).pipe(
    switchMap(([month, categories, overallBudget]) => {
      const r = monthRange(month);
      const p = monthRange(addMonths(month, -1));
      const w = weekRange(today());
      return combineLatest([
        this.data.expenses$({ start: r.start, end: r.end }),
        this.data.expenses$({ start: p.start, end: p.end }),
        this.data.expenses$({ start: w.start, end: w.end }),
        this.data.payments$({ start: r.start, end: r.end, status: 'done' }),
        this.data.payments$({ status: 'pending' }),
      ]).pipe(
        map(([expenses, prevExpenses, weekExpenses, payments, pending]) => {
          const total = sum(expenses);
          const prevTotal = sum(prevExpenses);
          const totals = categoryTotals(expenses, categories);
          const budget = overallBudget || categories.filter(c => !c.archived).reduce((s, c) => s + c.monthlyBudget, 0);
          const used = totals.filter(t => t.total > 0);
          const daily = dailySeries(expenses, month);
          const isCurrent = month === currentMonth();
          const moneyIn = sum(payments.filter(p => p.direction === 'in'));
          const moneyOut = sum(payments.filter(p => p.direction === 'out'));
          return {
            month, isCurrent, categories, expenses, total, prevTotal,
            change: pctChange(total, prevTotal),
            count: expenses.length,
            todayTotal: sum(weekExpenses.filter(e => e.date === today())),
            weekTotal: sum(weekExpenses),
            budget,
            budgetUsed: budget ? total / budget : 0,
            moneyIn, moneyOut,
            net: moneyIn - moneyOut - total,
            toReceive: sum(pending.filter(p => p.direction === 'in')),
            toPay: sum(pending.filter(p => p.direction === 'out')),
            totals,
            used,
            avgPerDay: total / (isCurrent ? Number(today().slice(8, 10)) : r.days),
            donut: {
              labels: used.map(t => t.category.name),
              datasets: [{ data: used.map(t => t.total), backgroundColor: used.map(t => t.category.color), borderWidth: 0 }],
            },
            daily: {
              labels: daily.map((_, i) => String(i + 1)),
              datasets: [{ label: 'Spent', data: daily, backgroundColor: '#2563eb', borderRadius: 4, maxBarThickness: 18 }],
            },
          };
        }),
      );
    }),
  );

  constructor(private data: DataService, private ms: MonthService) {}

  min(a: number, b: number) { return Math.min(a, b); }
}
