export interface Category {
  id?: number;
  name: string;
  icon: string;          // emoji
  color: string;         // hex
  monthlyBudget: number; // 0 = no budget
  archived: 0 | 1;
  createdAt: string;
}

export interface Expense {
  id?: number;
  amount: number;
  categoryId: number;
  date: string;          // YYYY-MM-DD (local)
  description: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id?: number;
  amount: number;
  source: string;
  date: string;          // YYYY-MM-DD
  note: string;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallet', 'Other'];

export const CATEGORY_COLORS = [
  '#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2',
  '#ca8a04', '#dc2626', '#4f46e5', '#059669', '#9333ea', '#64748b',
];

export const CATEGORY_ICONS = [
  '🍽️', '🛒', '🚕', '👕', '🛍️', '💡', '🏠', '💊', '🎬', '✈️', '📚', '📦',
  '☕', '⛽', '📱', '🎁', '💇', '🐾', '🏋️', '🧾', '🍺', '🧸', '🔧', '💳',
];

export interface BackupFile {
  app: 'SpendSense';
  schemaVersion: number;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
  income: Income[];
  settings: Setting[];
}
