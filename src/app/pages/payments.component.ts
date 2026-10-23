import { Component, ElementRef, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';
import { sum } from '../core/analytics';
import { DataService } from '../core/data.service';
import { monthRange, today } from '../core/dates';
import { Payment, PAYMENT_METHODS } from '../core/models';
import { MonthService, ToastService } from '../core/ui';

type Dir = 'in' | 'out';
interface Draft {
  id?: number;
  direction: Dir;
  amount: number | null;
  party: string;
  date: string;
  status: 'pending' | 'done';
  method: string;
  note: string;
}

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
})
export class PaymentsComponent {
  @ViewChild('formCard') formCard?: ElementRef<HTMLElement>;

  methods = PAYMENT_METHODS;
  maxDate = today();
  draft: Draft = this.blank('in');
  editing?: Payment;
  error = '';
  view$ = new BehaviorSubject<'all' | Dir>('all');

  vm$ = combineLatest([this.ms.month$, this.view$]).pipe(
    switchMap(([month, view]) => {
      const r = monthRange(month);
      return combineLatest([this.data.payments$({ status: 'pending' }), this.data.payments$({ ...r, status: 'done' }), this.data.payments$()]).pipe(
        map(([pending, done, all]) => {
          const pendingIn = pending.filter(p => p.direction === 'in');
          const pendingOut = pending.filter(p => p.direction === 'out');
          const byParty = new Map<string, { party: string; receive: number; pay: number }>();
          for (const p of pending) {
            const key = p.party.toLowerCase();
            const row = byParty.get(key) ?? { party: p.party, receive: 0, pay: 0 };
            p.direction === 'in' ? (row.receive += p.amount) : (row.pay += p.amount);
            byParty.set(key, row);
          }
          const received = sum(done.filter(p => p.direction === 'in'));
          const paid = sum(done.filter(p => p.direction === 'out'));
          return {
            month, view,
            received, paid, net: received - paid,
            toReceive: sum(pendingIn), toReceiveCount: pendingIn.length,
            toPay: sum(pendingOut), toPayCount: pendingOut.length,
            pending: view === 'all' ? pending : pending.filter(p => p.direction === view),
            done: view === 'all' ? done : done.filter(p => p.direction === view),
            people: [...byParty.values()].map(r => ({ ...r, net: r.receive - r.pay })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
            parties: [...new Set(all.map(p => p.party).filter(Boolean))].sort(),
          };
        }),
      );
    }),
  );

  constructor(private data: DataService, private ms: MonthService, private toast: ToastService) {}

  blank(direction: Dir): Draft {
    return { direction, amount: null, party: '', date: today(), status: 'done', method: 'UPI', note: '' };
  }

  doneLabel(d: Dir) { return d === 'in' ? 'Received' : 'Paid'; }

  edit(p: Payment) {
    this.error = '';
    this.editing = p;
    this.draft = { id: p.id, direction: p.direction, amount: p.amount, party: p.party, date: p.date, status: p.status, method: p.method, note: p.note };
    this.formCard?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancel() {
    this.error = '';
    this.editing = undefined;
    this.draft = this.blank(this.draft.direction);
  }

  async save() {
    this.error = '';
    const d = this.draft;
    if (!d.amount || d.amount <= 0) { this.error = 'Enter an amount greater than zero.'; return; }
    if (!d.party.trim()) { this.error = d.direction === 'in' ? 'Who is paying you?' : 'Who are you paying?'; return; }
    if (!d.date) { this.error = 'Choose a date.'; return; }
    const payload = { direction: d.direction, amount: Number(d.amount), party: d.party.trim(), date: d.date, status: d.status, method: d.method, note: d.note.trim() };
    if (d.id) {
      await this.data.updatePayment(d.id, payload);
      this.toast.show('Payment updated');
    } else {
      await this.data.addPayment(payload);
      if (d.status === 'done') this.ms.set(d.date.slice(0, 7));
      this.toast.show(d.status === 'pending'
        ? `Pending: ${d.direction === 'in' ? 'to receive from' : 'to pay'} ${payload.party}`
        : `${this.doneLabel(d.direction)} saved`);
    }
    this.editing = undefined;
    this.draft = this.blank(d.direction);
  }

  async settle(p: Payment) {
    await this.data.updatePayment(p.id!, { status: 'done', date: today() });
    this.toast.show(`Marked ${this.doneLabel(p.direction).toLowerCase()}`, {
      label: 'Undo', run: () => this.data.updatePayment(p.id!, { status: 'pending', date: p.date }),
    });
  }

  async remove(p: Payment) {
    await this.data.deletePayment(p.id!);
    if (this.draft.id === p.id) this.cancel();
    this.toast.show('Payment deleted', { label: 'Undo', run: () => this.data.restorePayment(p) });
  }

  track(_: number, p: Payment) { return p.id; }
}
