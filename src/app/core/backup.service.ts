import { Injectable } from '@angular/core';
import { db, SCHEMA_VERSION } from './db';
import { BackupFile, Category, Expense, Payment } from './models';

@Injectable({ providedIn: 'root' })
export class BackupService {
  async exportJson(): Promise<void> {
    const data: BackupFile = {
      app: 'SpendSense',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      categories: await db.categories.toArray(),
      expenses: await db.expenses.toArray(),
      payments: await db.payments.toArray(),
      profits: await db.profits.toArray(),
      settings: await db.settings.toArray(),
    };
    download(`spendsense-backup-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
    await db.settings.put({ key: 'lastBackupAt', value: data.exportedAt });
  }

  /** Replaces all local data with the contents of a backup file. */
  async importJson(file: File): Promise<{ expenses: number; categories: number; payments: number; profits: number }> {
    const parsed = JSON.parse(await file.text()) as BackupFile;
    if (parsed?.app !== 'SpendSense' || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.categories)) {
      throw new Error('This file is not a SpendSense backup.');
    }
    if (parsed.schemaVersion > SCHEMA_VERSION) {
      throw new Error('This backup was made by a newer version of SpendSense. Reload the app and try again.');
    }
    // v1 backups stored received money as `income`; convert it to incoming payments.
    const payments: Payment[] = [
      ...(parsed.payments ?? []),
      ...(parsed.income ?? []).map(i => ({
        direction: 'in' as const, amount: i.amount, party: i.source, date: i.date, status: 'done' as const,
        method: '', note: i.note, createdAt: i.createdAt, updatedAt: i.createdAt,
      })),
    ];
    const profits = parsed.profits ?? [];
    await db.transaction('rw', [db.categories, db.expenses, db.income, db.payments, db.profits, db.settings], async () => {
      await Promise.all([db.categories.clear(), db.expenses.clear(), db.income.clear(), db.payments.clear(), db.profits.clear(), db.settings.clear()]);
      await db.categories.bulkAdd(parsed.categories);
      await db.expenses.bulkAdd(parsed.expenses);
      await db.payments.bulkAdd(payments);
      await db.profits.bulkAdd(profits);
      await db.settings.bulkAdd(parsed.settings ?? []);
    });
    return { expenses: parsed.expenses.length, categories: parsed.categories.length, payments: payments.length, profits: profits.length };
  }

  exportCsv(expenses: Expense[], categories: Category[], filename = `spendsense-expenses-${stamp()}.csv`): void {
    const names = new Map(categories.map(c => [c.id, c.name]));
    const header = ['Date', 'Category', 'Description', 'Payment method', 'Amount (INR)'];
    const rows = expenses.map(e => [e.date, names.get(e.categoryId) ?? 'Unknown', e.description, e.paymentMethod, e.amount.toFixed(2)]);
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    download(filename, '﻿' + csv, 'text/csv;charset=utf-8');
  }

  async storageStatus(): Promise<{ persisted: boolean | null; usage?: number; quota?: number }> {
    if (!navigator.storage?.persisted) return { persisted: null };
    const persisted = await navigator.storage.persisted();
    const est = await navigator.storage.estimate?.();
    return { persisted, usage: est?.usage, quota: est?.quota };
  }

  async requestPersistence(): Promise<boolean> {
    return (await navigator.storage?.persist?.()) ?? false;
  }
}

function csvCell(v: string): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
