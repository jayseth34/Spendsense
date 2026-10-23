import Dexie, { Table } from 'dexie';
import { Category, CATEGORY_COLORS, Expense, Income, Payment, Profit, Setting } from './models';

/**
 * Local-first database. All user data lives in this browser's IndexedDB.
 *
 * Schema changes: NEVER edit an existing version block. Add a new
 * `this.version(n + 1).stores({...}).upgrade(tx => ...)` so existing users'
 * data is migrated in place instead of being wiped.
 */
export class SpendSenseDb extends Dexie {
  categories!: Table<Category, number>;
  expenses!: Table<Expense, number>;
  /** Legacy (v1). Rows are copied into `payments` by the v2 upgrade; kept so nothing is lost. */
  income!: Table<Income, number>;
  payments!: Table<Payment, number>;
  profits!: Table<Profit, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('spendsense');

    this.version(1).stores({
      categories: '++id, name, archived',
      expenses: '++id, categoryId, date, paymentMethod, [categoryId+date]',
      income: '++id, date',
      settings: 'key',
    });

    // v2: incoming/outgoing payments ledger + profits. Existing income becomes received payments.
    this.version(2).stores({
      payments: '++id, direction, status, date',
      profits: '++id, date, source',
    }).upgrade(async tx => {
      const income = await tx.table('income').toArray() as Income[];
      if (!income.length) return;
      await tx.table('payments').bulkAdd(income.map(i => ({
        direction: 'in', amount: i.amount, party: i.source, date: i.date, status: 'done',
        method: '', note: i.note, createdAt: i.createdAt, updatedAt: i.createdAt,
      } as Payment)));
    });

    this.on('populate', tx => {
      const now = new Date().toISOString();
      const defaults: [string, string, number][] = [
        ['Food & Dining', '🍽️', 6000],
        ['Groceries', '🛒', 5000],
        ['Transport', '🚕', 3000],
        ['Clothes', '👕', 5000],
        ['Shopping', '🛍️', 0],
        ['Bills & Utilities', '💡', 4000],
        ['Rent', '🏠', 0],
        ['Health', '💊', 0],
        ['Entertainment', '🎬', 2000],
        ['Travel', '✈️', 0],
        ['Education', '📚', 0],
        ['Other', '📦', 0],
      ];
      tx.table('categories').bulkAdd(
        defaults.map(([name, icon, monthlyBudget], i) => ({
          name, icon, monthlyBudget,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          archived: 0,
          createdAt: now,
        })),
      );
    });
  }
}

export const db = new SpendSenseDb();
export const SCHEMA_VERSION = 2;
