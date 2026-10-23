import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';
import { categoryTotals, monthlySeries, sum } from '../core/analytics';
import { BackupService } from '../core/backup.service';
import { DataService } from '../core/data.service';
import { monthLabel } from '../core/dates';
import { Category, Expense } from '../core/models';
import { ToastService } from '../core/ui';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  thisYear = new Date().getFullYear();
  year$ = new BehaviorSubject<number>(this.thisYear);
  storage: { persisted: boolean | null; usage?: number; quota?: number } = { persisted: null };
  importing = false;

  vm$ = combineLatest([this.year$, this.data.categories$(true), this.data.setting$<string | null>('lastBackupAt', null)]).pipe(
    switchMap(([year, categories, lastBackupAt]) => {
      const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
      return combineLatest([
        this.data.expenses$({ start: `${year}-01-01`, end: `${year}-12-31` }),
        this.data.income$(`${year}-01-01`, `${year}-12-31`),
      ]).pipe(
        map(([expenses, income]) => {
          const spent = monthlySeries(expenses, months);
          const earned = monthlySeries(income, months);
          const total = sum(expenses);
          const activeMonths = spent.filter(v => v > 0).length;
          return {
            year, categories, expenses, lastBackupAt, total,
            incomeTotal: sum(income),
            avgMonth: activeMonths ? total / activeMonths : 0,
            rows: months.map((m, i) => ({ month: m, spent: spent[i], income: earned[i], saved: earned[i] - spent[i] })).filter(r => r.spent || r.income),
            byCategory: categoryTotals(expenses, categories).filter(t => t.total > 0),
            chart: {
              labels: months.map(m => monthLabel(m, 'short').split(' ')[0]),
              datasets: [
                { label: 'Spent', data: spent, backgroundColor: '#2563eb', borderRadius: 4, maxBarThickness: 22 },
                { label: 'Income', data: earned, backgroundColor: '#16a34a88', borderRadius: 4, maxBarThickness: 22 },
              ],
            },
          };
        }),
      );
    }),
  );

  constructor(private data: DataService, private backup: BackupService, private toast: ToastService) {}

  async ngOnInit() {
    this.storage = await this.backup.storageStatus();
  }

  async persist() {
    const ok = await this.backup.requestPersistence();
    this.storage = await this.backup.storageStatus();
    this.toast.show(ok ? 'Storage is now protected from automatic cleanup.' : 'The browser declined. Keep regular backups.');
  }

  exportJson() { this.backup.exportJson(); }

  exportCsv(expenses: Expense[], categories: Category[], year: number) {
    this.backup.exportCsv(expenses, categories, `spendsense-${year}.csv`);
  }

  print() { window.print(); }

  async importFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!confirm('Restoring replaces all data currently in SpendSense on this device. Continue?')) return;
    this.importing = true;
    try {
      const r = await this.backup.importJson(file);
      this.toast.show(`Restored ${r.expenses} expenses, ${r.categories} categories and ${r.income} income entries.`);
    } catch (e) {
      this.toast.show((e as Error).message || 'Could not read that file.', undefined, 7000);
    } finally {
      this.importing = false;
    }
  }

  mb(bytes?: number) {
    return bytes == null ? '—' : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
