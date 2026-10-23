import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../core/data.service';
import { today } from '../core/dates';
import { Category, CATEGORY_COLORS, CATEGORY_ICONS, Expense, PAYMENT_METHODS } from '../core/models';
import { ToastService } from '../core/ui';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
})
export class ExpenseFormComponent implements OnInit {
  @ViewChild('amountInput') amountInput?: ElementRef<HTMLInputElement>;

  categories$ = this.data.categories$();
  methods = PAYMENT_METHODS;
  icons = CATEGORY_ICONS;
  newCat: { name: string; icon: string; budget: number | null } | null = null;
  editing?: Expense;
  loaded = false;
  saving = false;
  error = '';

  amount: number | null = null;
  categoryId: number | null = null;
  date = today();
  maxDate = today();
  description = '';
  paymentMethod = 'UPI';

  constructor(private data: DataService, private route: ActivatedRoute, private router: Router, private toast: ToastService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.editing = await this.data.expense(Number(id));
      if (!this.editing) {
        this.toast.show('That expense no longer exists.');
        this.router.navigate(['/transactions']);
        return;
      }
      ({ amount: this.amount, categoryId: this.categoryId, date: this.date, description: this.description, paymentMethod: this.paymentMethod } = this.editing);
    } else {
      const cat = this.route.snapshot.queryParamMap.get('category');
      if (cat) this.categoryId = Number(cat);
      this.paymentMethod = await firstValueFrom(this.data.setting$('lastPaymentMethod', 'UPI'));
    }
    this.loaded = true;
    setTimeout(() => this.amountInput?.nativeElement.focus());
  }

  startNewCategory() {
    this.newCat = { name: '', icon: '📦', budget: null };
    setTimeout(() => (document.querySelector('input[name=ncname]') as HTMLInputElement | null)?.focus());
  }

  async createCategory() {
    const nc = this.newCat;
    if (!nc) return;
    const name = nc.name.trim();
    if (!name) { this.error = 'Give the new category a name.'; return; }
    const cats = await firstValueFrom(this.data.categories$(true));
    const existing = cats.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.archived) await this.data.updateCategory(existing.id!, { archived: 0 });
      this.categoryId = existing.id!;
    } else {
      const used = new Set(cats.map(c => c.color));
      const color = CATEGORY_COLORS.find(c => !used.has(c)) ?? CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length];
      this.categoryId = await this.data.addCategory({ name, icon: nc.icon, color, monthlyBudget: Math.max(0, Number(nc.budget) || 0) });
      this.toast.show(`${name} added`);
    }
    this.error = '';
    this.newCat = null;
  }

  categoryOf(cats: Category[]) {
    return cats.find(c => c.id === this.categoryId);
  }

  async save(addAnother = false) {
    this.error = '';
    if (!this.amount || this.amount <= 0) { this.error = 'Enter an amount greater than zero.'; return; }
    if (this.categoryId == null) { this.error = 'Choose a category.'; return; }
    if (!this.date) { this.error = 'Choose a date.'; return; }

    this.saving = true;
    const payload = {
      amount: Number(this.amount),
      categoryId: this.categoryId,
      date: this.date,
      description: this.description.trim(),
      paymentMethod: this.paymentMethod,
    };
    try {
      if (this.editing) {
        await this.data.updateExpense(this.editing.id!, payload);
        this.toast.show('Expense updated');
        history.length > 1 ? history.back() : this.router.navigate(['/']);
        return;
      }
      await this.data.addExpense(payload);
      await this.data.setSetting('lastPaymentMethod', this.paymentMethod);
      this.toast.show('Expense saved');
      if (addAnother) {
        this.amount = null;
        this.description = '';
        this.amountInput?.nativeElement.focus();
      } else {
        this.router.navigate(['/categories', this.categoryId]);
      }
    } catch (e) {
      this.error = 'Could not save. ' + (e as Error).message;
    } finally {
      this.saving = false;
    }
  }

  async remove() {
    if (!this.editing) return;
    const e = this.editing;
    await this.data.deleteExpense(e.id!);
    this.toast.show('Expense deleted', { label: 'Undo', run: () => this.data.restoreExpense(e) });
    history.length > 1 ? history.back() : this.router.navigate(['/']);
  }

  cancel() {
    history.length > 1 ? history.back() : this.router.navigate(['/']);
  }
}
