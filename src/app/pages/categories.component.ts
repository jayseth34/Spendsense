import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { categoryTotals } from '../core/analytics';
import { DataService } from '../core/data.service';
import { monthRange } from '../core/dates';
import { Category, CATEGORY_COLORS, CATEGORY_ICONS } from '../core/models';
import { MonthService, ToastService } from '../core/ui';

interface Draft { id?: number; name: string; icon: string; color: string; monthlyBudget: number | null; }

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  icons = CATEGORY_ICONS;
  colors = CATEGORY_COLORS;
  showArchived = false;
  draft: Draft | null = null;
  error = '';

  vm$ = combineLatest([this.ms.month$, this.data.categories$(true)]).pipe(
    switchMap(([month, categories]) => {
      const r = monthRange(month);
      return this.data.expenses$({ start: r.start, end: r.end }).pipe(
        map(expenses => {
          const totals = categoryTotals(expenses, categories);
          const active = categories.filter(c => !c.archived).map(c => totals.find(t => t.category.id === c.id)!)
            .sort((a, b) => b.total - a.total || a.category.name.localeCompare(b.category.name));
          return {
            month, active,
            archived: categories.filter(c => c.archived),
            budgetTotal: categories.filter(c => !c.archived).reduce((s, c) => s + c.monthlyBudget, 0),
            all: categories,
          };
        }),
      );
    }),
  );

  constructor(private data: DataService, private ms: MonthService, private toast: ToastService, private route: ActivatedRoute) {}

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('new')) this.newCategory([]);
  }

  min(a: number, b: number) { return Math.min(a, b); }

  newCategory(existing: Category[]) {
    const used = new Set(existing.map(c => c.color));
    this.error = '';
    this.draft = { name: '', icon: '📦', color: this.colors.find(c => !used.has(c)) ?? this.colors[0], monthlyBudget: null };
  }

  edit(c: Category) {
    this.error = '';
    this.draft = { id: c.id, name: c.name, icon: c.icon, color: c.color, monthlyBudget: c.monthlyBudget || null };
  }

  async save(all: Category[]) {
    const d = this.draft!;
    const name = d.name.trim();
    if (!name) { this.error = 'Give the category a name.'; return; }
    if (all.some(c => c.id !== d.id && !c.archived && c.name.toLowerCase() === name.toLowerCase())) {
      this.error = 'A category with that name already exists.'; return;
    }
    const budget = Math.max(0, Number(d.monthlyBudget) || 0);
    if (d.id) {
      await this.data.updateCategory(d.id, { name, icon: d.icon, color: d.color, monthlyBudget: budget });
      this.toast.show(`${name} updated`);
    } else {
      await this.data.addCategory({ name, icon: d.icon, color: d.color, monthlyBudget: budget });
      this.toast.show(`${name} added`);
    }
    this.draft = null;
  }

  async remove() {
    const d = this.draft!;
    const result = await this.data.removeCategory(d.id!);
    this.toast.show(result === 'archived'
      ? `${d.name} archived — its past expenses are kept.`
      : `${d.name} deleted`);
    this.draft = null;
  }

  async restore(c: Category) {
    await this.data.updateCategory(c.id!, { archived: 0 });
    this.toast.show(`${c.name} restored`);
  }
}
