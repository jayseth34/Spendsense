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
    { path: '/payments', label: 'Payments', icon: '⇅' },
    { path: '/profits', label: 'Profits', icon: '↗' },
    { path: '/reports', label: 'Reports', icon: '▤' },
  ];
  /** Mobile bottom bar shows these; the rest go in the "More" sheet. */
  mobileMain = ['/dashboard', '/payments', '/profits'];
  moreOpen = false;

  get moreItems() { return this.nav.filter(n => !this.mobileMain.includes(n.path)); }
  item(path: string) { return this.nav.find(n => n.path === path)!; }

  constructor(public toast: ToastService) {}

  run(id: number, fn: () => void) {
    fn();
    this.toast.dismiss(id);
  }
}
