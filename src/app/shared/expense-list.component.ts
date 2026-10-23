import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../core/data.service';
import { Category, Expense } from '../core/models';
import { ToastService } from '../core/ui';

@Component({
  selector: 'app-expense-list',
  template: `
    <p class="empty" *ngIf="!expenses.length">{{ emptyText }}</p>
    <ul class="tx-list" *ngIf="expenses.length">
      <li *ngFor="let e of shown; trackBy: track" class="tx">
        <span class="tx-icon" [style.background]="(cat(e)?.color || '#64748b') + '22'">{{ cat(e)?.icon || '📦' }}</span>
        <a class="tx-main" [routerLink]="['/expense', e.id]">
          <span class="tx-title">{{ e.description || cat(e)?.name || 'Expense' }}</span>
          <span class="tx-meta">
            {{ e.date | dayLabel }}
            <ng-container *ngIf="showCategory"> · {{ cat(e)?.name || 'Unknown' }}</ng-container>
            <ng-container *ngIf="e.paymentMethod"> · {{ e.paymentMethod }}</ng-container>
          </span>
        </a>
        <span class="tx-amount">{{ e.amount | inr: true }}</span>
        <button class="icon-btn subtle" type="button" (click)="remove(e)" [attr.aria-label]="'Delete ' + (e.description || 'expense')">✕</button>
      </li>
    </ul>
    <button *ngIf="limit && expenses.length > limit" class="btn ghost full" type="button" (click)="limit = 0">
      Show all {{ expenses.length }}
    </button>
  `,
})
export class ExpenseListComponent implements OnChanges {
  @Input() expenses: Expense[] = [];
  @Input() categories: Category[] = [];
  @Input() showCategory = true;
  @Input() limit = 0;
  @Input() emptyText = 'No expenses yet.';

  private map = new Map<number, Category>();

  constructor(private data: DataService, private toast: ToastService, private router: Router) {}

  get shown(): Expense[] {
    return this.limit ? this.expenses.slice(0, this.limit) : this.expenses;
  }

  ngOnChanges(): void {
    this.map = new Map(this.categories.map(c => [c.id!, c]));
  }

  cat(e: Expense) { return this.map.get(e.categoryId); }
  track(_: number, e: Expense) { return e.id; }

  async remove(e: Expense) {
    await this.data.deleteExpense(e.id!);
    this.toast.show(`Deleted ${e.description || 'expense'}`, { label: 'Undo', run: () => this.data.restoreExpense(e) });
  }
}
