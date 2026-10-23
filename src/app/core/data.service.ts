import { Injectable, NgZone } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable } from 'rxjs';
import { db } from './db';
import { Category, Expense, Income } from './models';

export interface ExpenseFilter {
  start?: string;
  end?: string;
  categoryId?: number | null;
  paymentMethod?: string | null;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private zone: NgZone) {}

  /** Wraps a Dexie liveQuery so components re-render whenever the underlying tables change. */
  live<T>(query: () => Promise<T>): Observable<T> {
    return new Observable<T>(subscriber => {
      const sub = liveQuery(query).subscribe({
        next: v => this.zone.run(() => subscriber.next(v)),
        error: e => this.zone.run(() => subscriber.error(e)),
      });
      return () => sub.unsubscribe();
    });
  }

  // ---------- Categories ----------

  categories$(includeArchived = false): Observable<Category[]> {
    return this.live(async () => {
      const all = await db.categories.orderBy('name').toArray();
      return includeArchived ? all : all.filter(c => !c.archived);
    });
  }

  category$(id: number): Observable<Category | undefined> {
    return this.live(() => db.categories.get(id));
  }

  addCategory(c: Omit<Category, 'id' | 'createdAt' | 'archived'>): Promise<number> {
    return db.categories.add({ ...c, name: c.name.trim(), archived: 0, createdAt: new Date().toISOString() });
  }

  updateCategory(id: number, changes: Partial<Category>): Promise<number> {
    return db.categories.update(id, changes);
  }

  /** Deletes a category if it has no expenses; otherwise archives it so history stays intact. */
  async removeCategory(id: number): Promise<'deleted' | 'archived'> {
    const used = await db.expenses.where('categoryId').equals(id).count();
    if (used > 0) {
      await db.categories.update(id, { archived: 1 });
      return 'archived';
    }
    await db.categories.delete(id);
    return 'deleted';
  }

  // ---------- Expenses ----------

  expenses$(filter: ExpenseFilter = {}): Observable<Expense[]> {
    return this.live(() => this.queryExpenses(filter));
  }

  async queryExpenses(f: ExpenseFilter): Promise<Expense[]> {
    let rows: Expense[];
    if (f.categoryId != null) {
      rows = await db.expenses
        .where('[categoryId+date]')
        .between([f.categoryId, f.start ?? '0000-00-00'], [f.categoryId, f.end ?? '9999-99-99'], true, true)
        .toArray();
    } else if (f.start || f.end) {
      rows = await db.expenses.where('date').between(f.start ?? '0000-00-00', f.end ?? '9999-99-99', true, true).toArray();
    } else {
      rows = await db.expenses.toArray();
    }
    if (f.paymentMethod) rows = rows.filter(e => e.paymentMethod === f.paymentMethod);
    if (f.search?.trim()) {
      const q = f.search.trim().toLowerCase();
      rows = rows.filter(e => e.description.toLowerCase().includes(q));
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  }

  expense(id: number): Promise<Expense | undefined> {
    return db.expenses.get(id);
  }

  addExpense(e: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date().toISOString();
    return db.expenses.add({ ...e, amount: round2(e.amount), createdAt: now, updatedAt: now });
  }

  updateExpense(id: number, e: Partial<Expense>): Promise<number> {
    const changes = { ...e, updatedAt: new Date().toISOString() };
    if (changes.amount != null) changes.amount = round2(changes.amount);
    return db.expenses.update(id, changes);
  }

  deleteExpense(id: number): Promise<void> {
    return db.expenses.delete(id);
  }

  restoreExpense(e: Expense): Promise<number> {
    return db.expenses.put(e);
  }

  // ---------- Income ----------

  income$(start?: string, end?: string): Observable<Income[]> {
    return this.live(async () => {
      const rows = start || end
        ? await db.income.where('date').between(start ?? '0000-00-00', end ?? '9999-99-99', true, true).toArray()
        : await db.income.toArray();
      return rows.sort((a, b) => b.date.localeCompare(a.date));
    });
  }

  addIncome(i: Omit<Income, 'id' | 'createdAt'>): Promise<number> {
    return db.income.add({ ...i, amount: round2(i.amount), createdAt: new Date().toISOString() });
  }

  deleteIncome(id: number): Promise<void> {
    return db.income.delete(id);
  }

  // ---------- Settings ----------

  setting$<T>(key: string, fallback: T): Observable<T> {
    return this.live(async () => ((await db.settings.get(key))?.value as T) ?? fallback);
  }

  setSetting(key: string, value: unknown): Promise<string> {
    return db.settings.put({ key, value });
  }
}

export function round2(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}
