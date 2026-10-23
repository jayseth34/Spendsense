import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { currentMonth, monthLabel, parseIsoDate } from './dates';

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatInr(v: number | null | undefined, exact = false): string {
  const n = Number(v ?? 0);
  return exact && !Number.isInteger(n) ? inr2.format(n) : inr0.format(Math.round(n));
}

@Pipe({ name: 'inr' })
export class InrPipe implements PipeTransform {
  transform(v: number | null | undefined, exact = false): string {
    return formatInr(v, exact);
  }
}

@Pipe({ name: 'dayLabel' })
export class DayLabelPipe implements PipeTransform {
  transform(v: string): string {
    return parseIsoDate(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

@Pipe({ name: 'monthLabel' })
export class MonthLabelPipe implements PipeTransform {
  transform(v: string, style: 'long' | 'short' = 'long'): string {
    return monthLabel(v, style);
  }
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(v: number | null | undefined, digits = 0): string {
    return v == null ? '—' : `${(v * 100).toFixed(digits)}%`;
  }
}

/** The month currently being analysed, shared across dashboard and category pages. */
@Injectable({ providedIn: 'root' })
export class MonthService {
  readonly month$ = new BehaviorSubject<string>(currentMonth());
  get month(): string { return this.month$.value; }
  set(m: string): void { if (m && m !== this.month) this.month$.next(m); }
}

export interface Toast { id: number; text: string; action?: { label: string; run: () => void }; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts$ = new BehaviorSubject<Toast[]>([]);
  private seq = 0;

  show(text: string, action?: Toast['action'], ms = 4500): void {
    const t: Toast = { id: ++this.seq, text, action };
    this.toasts$.next([t]);
    setTimeout(() => this.dismiss(t.id), ms);
  }

  dismiss(id: number): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }
}
