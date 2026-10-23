import { Component, ElementRef, ViewChild } from '@angular/core';
import { map } from 'rxjs';
import { monthlySeries, sum } from '../core/analytics';
import { DataService } from '../core/data.service';
import { currentMonth, lastNMonths, monthLabel, today } from '../core/dates';
import { Profit } from '../core/models';
import { ToastService } from '../core/ui';

interface Draft { id?: number; kind: 'profit' | 'loss'; amount: number | null; date: string; source: string; note: string; }

@Component({
  selector: 'app-profits',
  templateUrl: './profits.component.html',
})
export class ProfitsComponent {
  @ViewChild('formCard') formCard?: ElementRef<HTMLElement>;

  maxDate = today();
  draft: Draft = this.blank();
  editing?: Profit;
  error = '';

  vm$ = this.data.profits$().pipe(
    map(rows => {
      const month = currentMonth();
      const year = month.slice(0, 4);
      const months = lastNMonths(month, 12);
      const series = monthlySeries(rows, months);

      // Running total in chronological order, shown next to each entry.
      const chrono = [...rows].reverse();
      const running = new Map<number, number>();
      let acc = 0;
      for (const r of chrono) { acc = Math.round((acc + r.amount) * 100) / 100; running.set(r.id!, acc); }

      const bySource = new Map<string, { source: string; total: number; count: number }>();
      for (const r of rows) {
        const key = (r.source || 'Unlabelled').toLowerCase();
        const s = bySource.get(key) ?? { source: r.source || 'Unlabelled', total: 0, count: 0 };
        s.total += r.amount; s.count++;
        bySource.set(key, s);
      }

      return {
        rows, running,
        total: sum(rows),
        monthTotal: sum(rows.filter(r => r.date.startsWith(month))),
        yearTotal: sum(rows.filter(r => r.date.startsWith(year))),
        best: rows.reduce<Profit | undefined>((b, r) => (!b || r.amount > b.amount ? r : b), undefined),
        sources: [...bySource.values()].sort((a, b) => b.total - a.total),
        sourceNames: [...new Set(rows.map(r => r.source).filter(Boolean))].sort(),
        chart: {
          labels: months.map(m => monthLabel(m, 'short').replace(' 20', " '")),
          datasets: [{
            label: 'Profit',
            data: series,
            backgroundColor: series.map(v => (v < 0 ? '#dc2626' : '#16a34a')),
            borderRadius: 4,
            maxBarThickness: 28,
          }],
        },
      };
    }),
  );

  constructor(private data: DataService, private toast: ToastService) {}

  blank(): Draft {
    return { kind: 'profit', amount: null, date: today(), source: this.draft?.source ?? '', note: '' };
  }

  edit(p: Profit) {
    this.error = '';
    this.editing = p;
    this.draft = { id: p.id, kind: p.amount < 0 ? 'loss' : 'profit', amount: Math.abs(p.amount), date: p.date, source: p.source, note: p.note };
    this.formCard?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancel() {
    this.error = '';
    this.editing = undefined;
    this.draft = this.blank();
  }

  async save() {
    this.error = '';
    const d = this.draft;
    if (!d.amount || d.amount <= 0) { this.error = 'Enter an amount greater than zero.'; return; }
    if (!d.date) { this.error = 'Choose a date.'; return; }
    const amount = d.kind === 'loss' ? -Number(d.amount) : Number(d.amount);
    const payload = { amount, date: d.date, source: d.source.trim(), note: d.note.trim() };
    if (d.id) {
      await this.data.updateProfit(d.id, payload);
      this.toast.show('Entry updated');
    } else {
      await this.data.addProfit(payload);
      this.toast.show(d.kind === 'loss' ? 'Loss recorded' : 'Profit added');
    }
    this.editing = undefined;
    this.draft = this.blank();
  }

  async remove(p: Profit) {
    await this.data.deleteProfit(p.id!);
    if (this.editing?.id === p.id) this.cancel();
    this.toast.show('Entry deleted', { label: 'Undo', run: () => this.data.restoreProfit(p) });
  }

  track(_: number, p: Profit) { return p.id; }
}
