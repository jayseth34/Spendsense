import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, map, switchMap } from 'rxjs';
import { sum } from '../core/analytics';
import { BackupService } from '../core/backup.service';
import { DataService, ExpenseFilter } from '../core/data.service';
import { currentMonth, monthRange, today, toIsoDate } from '../core/dates';
import { Category, Expense, PAYMENT_METHODS } from '../core/models';

type Preset = 'month' | 'last30' | 'year' | 'all' | 'custom';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent {
  methods = PAYMENT_METHODS;
  preset: Preset = 'month';
  f: Required<Pick<ExpenseFilter, 'start' | 'end' | 'search'>> & { categoryId: number | null; paymentMethod: string | null } = {
    ...monthRange(currentMonth()), categoryId: null, paymentMethod: null, search: '',
  };
  private filter$ = new BehaviorSubject<ExpenseFilter>({ ...this.f });

  vm$ = combineLatest([this.filter$.pipe(debounceTime(120)), this.data.categories$(true)]).pipe(
    switchMap(([filter, categories]) =>
      this.data.expenses$(filter).pipe(map(expenses => ({ expenses, categories, total: sum(expenses) }))),
    ),
  );

  constructor(private data: DataService, private backup: BackupService) {}

  setPreset(p: Preset) {
    this.preset = p;
    const now = new Date();
    if (p === 'month') Object.assign(this.f, monthRange(currentMonth()));
    if (p === 'last30') Object.assign(this.f, { start: toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), end: today() });
    if (p === 'year') Object.assign(this.f, { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` });
    if (p === 'all') Object.assign(this.f, { start: '', end: '' });
    this.apply();
  }

  apply() {
    this.filter$.next({
      start: this.f.start || undefined,
      end: this.f.end || undefined,
      categoryId: this.f.categoryId,
      paymentMethod: this.f.paymentMethod,
      search: this.f.search,
    });
  }

  reset() {
    this.f.categoryId = null;
    this.f.paymentMethod = null;
    this.f.search = '';
    this.setPreset('month');
  }

  exportCsv(expenses: Expense[], categories: Category[]) {
    this.backup.exportCsv(expenses, categories);
  }
}
