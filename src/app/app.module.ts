import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DayLabelPipe, InrPipe, MonthLabelPipe, PctPipe } from './core/ui';
import { CategoriesComponent } from './pages/categories.component';
import { CategoryDetailComponent } from './pages/category-detail.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ExpenseFormComponent } from './pages/expense-form.component';
import { IncomeComponent } from './pages/income.component';
import { ReportsComponent } from './pages/reports.component';
import { TransactionsComponent } from './pages/transactions.component';
import { ChartComponent } from './shared/chart.component';
import { ExpenseListComponent } from './shared/expense-list.component';
import { MonthPickerComponent } from './shared/month-picker.component';

@NgModule({
  declarations: [
    AppComponent,
    InrPipe, DayLabelPipe, MonthLabelPipe, PctPipe,
    ChartComponent, MonthPickerComponent, ExpenseListComponent,
    DashboardComponent, ExpenseFormComponent, CategoriesComponent, CategoryDetailComponent,
    TransactionsComponent, IncomeComponent, ReportsComponent,
  ],
  imports: [BrowserModule, FormsModule, AppRoutingModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
