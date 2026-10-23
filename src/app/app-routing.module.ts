import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoriesComponent } from './pages/categories.component';
import { CategoryDetailComponent } from './pages/category-detail.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ExpenseFormComponent } from './pages/expense-form.component';
import { IncomeComponent } from './pages/income.component';
import { ReportsComponent } from './pages/reports.component';
import { TransactionsComponent } from './pages/transactions.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent, title: 'SpendSense' },
  { path: 'expense/new', component: ExpenseFormComponent, title: 'Add expense · SpendSense' },
  { path: 'expense/:id', component: ExpenseFormComponent, title: 'Edit expense · SpendSense' },
  { path: 'categories', component: CategoriesComponent, title: 'Categories · SpendSense' },
  { path: 'categories/:id', component: CategoryDetailComponent, title: 'Category · SpendSense' },
  { path: 'transactions', component: TransactionsComponent, title: 'Transactions · SpendSense' },
  { path: 'income', component: IncomeComponent, title: 'Income · SpendSense' },
  { path: 'reports', component: ReportsComponent, title: 'Reports · SpendSense' },
  { path: '**', redirectTo: 'dashboard' },
];

// Hash routing so deep links work on GitHub Pages (which has no SPA fallback).
@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true, scrollPositionRestoration: 'top' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
