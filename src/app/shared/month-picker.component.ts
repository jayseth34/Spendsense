import { Component } from '@angular/core';
import { addMonths, currentMonth } from '../core/dates';
import { MonthService } from '../core/ui';

@Component({
  selector: 'app-month-picker',
  template: `
    <div class="month-picker" *ngIf="ms.month$ | async as m">
      <button class="icon-btn" type="button" (click)="ms.set(prev(m))" aria-label="Previous month">‹</button>
      <label class="month-label">
        <span>{{ m | monthLabel }}</span>
        <input type="month" [value]="m" [max]="max" (change)="pick($event)" aria-label="Choose month" />
      </label>
      <button class="icon-btn" type="button" (click)="ms.set(next(m))" [disabled]="m >= max" aria-label="Next month">›</button>
    </div>
  `,
})
export class MonthPickerComponent {
  max = currentMonth();
  constructor(public ms: MonthService) {}
  prev(m: string) { return addMonths(m, -1); }
  next(m: string) { return addMonths(m, 1); }
  pick(ev: Event) { this.ms.set((ev.target as HTMLInputElement).value); }
}
