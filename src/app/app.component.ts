import { Component } from '@angular/core';
import { ToastService } from './core/ui';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  nav = [
    { path: '/dashboard', label: 'Overview', icon: '⌂' },
    { path: '/categories', label: 'Categories', icon: '▦' },
    { path: '/transactions', label: 'Transactions', icon: '≡' },
    { path: '/income', label: 'Income', icon: '₹' },
    { path: '/reports', label: 'Reports', icon: '▤' },
  ];

  constructor(public toast: ToastService) {}

  run(id: number, fn: () => void) {
    fn();
    this.toast.dismiss(id);
  }
}
