import { Component } from '@angular/core';
import { combineLatest, map, switchMap } from 'rxjs';
import { sum } from '../core/analytics';
import { DataService } from '../core/data.service';
import { monthRange, today } from '../core/dates';
import { Income } from '../core/models';
import { MonthService, ToastService } from '../core/ui';

@Component({
  selector: 'app-income',
  templateUrl: './income.component.html',
})
export class IncomeComponent {
  amount: number | null = null;
  source = 'Salary';
  date = today();
  maxDate = today();
  note = '';
  error = '';
  sources = ['Salary', 'Freelance', 'Business', 'Interest', 'Gift', 'Refund', 'Other'];

  vm$ = this.ms.month$.pipe(
    switchMap(month => {
      const r = monthRange(month);
      return combineLatest([this.data.income$(r.start, r.end), this.data.expenses$(r)]).pipe(
        map(([income, expenses]) => {
          const inc = sum(income);
          const spent = sum(expenses);
          return { month, income, inc, spent, saved: inc - spent, rate: inc ? (inc - spent) / inc : null };
        }),
      );
    }),
  );

  constructor(private data: DataService, private ms: MonthService, private toast: ToastService) {}

  async add() {
    this.error = '';
    if (!this.amount || this.amount <= 0) { this.error = 'Enter an amount greater than zero.'; return; }
    await this.data.addIncome({ amount: Number(this.amount), source: this.source, date: this.date, note: this.note.trim() });
    this.ms.set(this.date.slice(0, 7));
    this.toast.show('Income added');
    this.amount = null;
    this.note = '';
  }

  async remove(i: Income) {
    await this.data.deleteIncome(i.id!);
    this.toast.show('Income deleted');
  }
}
