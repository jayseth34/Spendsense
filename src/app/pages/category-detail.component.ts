import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { groupBy, monthlySeries, pctChange, sum } from '../core/analytics';
import { DataService } from '../core/data.service';
import { addMonths, lastNMonths, monthLabel, monthRange } from '../core/dates';
import { MonthService, ToastService } from '../core/ui';

@Component({
  selector: 'app-category-detail',
  templateUrl: './category-detail.component.html',
})
export class CategoryDetailComponent {
  budgetInput: number | null = null;
  editingBudget = false;

  vm$ = combineLatest([this.route.paramMap, this.ms.month$]).pipe(
    switchMap(([params, month]) => {
      const id = Number(params.get('id'));
      const months = lastNMonths(month, 12);
      return combineLatest([
        this.data.category$(id),
        this.data.categories$(true),
        this.data.expenses$({ categoryId: id, start: monthRange(months[0]).start, end: monthRange(month).end }),
        of(months),
        of(month),
      ]);
    }),
    map(([category, categories, history, months, month]) => {
      if (!category) return { missing: true as const };
      const expenses = history.filter(e => e.date.startsWith(month));
      const prev = history.filter(e => e.date.startsWith(addMonths(month, -1)));
      const series = monthlySeries(history, months);
      const total = sum(expenses);
      const prevSix = series.slice(-7, -1);
      const activeMonths = prevSix.filter(v => v > 0);
      return {
        missing: false as const,
        category, categories, month, expenses, total,
        count: expenses.length,
        avg: expenses.length ? total / expenses.length : 0,
        largest: expenses.reduce((m, e) => (e.amount > (m?.amount ?? 0) ? e : m), expenses[0]),
        prevTotal: sum(prev),
        change: pctChange(total, sum(prev)),
        sixMonthAvg: activeMonths.length ? activeMonths.reduce((a, b) => a + b, 0) / prevSix.length : 0,
        budget: category.monthlyBudget,
        budgetUsed: category.monthlyBudget ? total / category.monthlyBudget : 0,
        methods: groupBy(expenses, e => e.paymentMethod || 'Other'),
        history: {
          labels: months.map(m => monthLabel(m, 'short').replace(' 20', " '")),
          datasets: [{
            label: category.name,
            data: series,
            backgroundColor: months.map(m => (m === month ? category.color : category.color + '55')),
            borderRadius: 4,
            maxBarThickness: 28,
          }],
        },
      };
    }),
  );

  constructor(private route: ActivatedRoute, private data: DataService, private ms: MonthService, private toast: ToastService) {}

  min(a: number, b: number) { return Math.min(a, b); }

  startBudget(current: number) {
    this.budgetInput = current || null;
    this.editingBudget = true;
  }

  async saveBudget(id: number) {
    const v = Math.max(0, Number(this.budgetInput) || 0);
    await this.data.updateCategory(id, { monthlyBudget: v });
    this.editingBudget = false;
    this.toast.show(v ? 'Budget updated' : 'Budget removed');
  }
}
