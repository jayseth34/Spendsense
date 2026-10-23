import Dexie, { Table } from 'dexie';
import { Category, CATEGORY_COLORS, Expense, Income, Setting } from './models';

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
  income!: Table<Income, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('spendsense');

    this.version(1).stores({
      categories: '++id, name, archived',
      expenses: '++id, categoryId, date, paymentMethod, [categoryId+date]',
      income: '++id, date',
      settings: 'key',
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
export const SCHEMA_VERSION = 1;
