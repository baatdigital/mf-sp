/**
 * BusinessReportsComponent - Reportes y analitica para el portal B2B
 *
 * Muestra resumen mensual de creditos vs debitos (grafica CSS),
 * top 5 destinos SPEI y gastos por categoria BillPay.
 * Selector de periodo: este mes, mes pasado, ultimos 3 meses.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { BusinessService, ReportPeriod } from '../../services/business.service';
import { LedgerEntry } from '../../../../domain/models/ledger-entry.model';

interface MonthBar {
  label: string;
  credits: number;
  debits: number;
  maxValue: number;
}

interface TopDestination {
  name: string;
  count: number;
  total: number;
}

interface CategorySummary {
  category: string;
  label: string;
  total: number;
}

@Component({
  selector: 'sp-business-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="reports-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Dashboard</a>
        <div class="header-row">
          <h1 class="page-title">Reportes Empresariales</h1>
          <div class="period-selector">
            @for (opt of periodOptions; track opt.value) {
              <button
                class="period-btn"
                [class.period-active]="selectedPeriod() === opt.value"
                (click)="selectPeriod(opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
      </header>

      @if (isLoading()) {
        <div class="page-loading" role="status">
          <div class="spinner"></div>
          <span>Cargando reporte...</span>
        </div>
      } @else if (error()) {
        <div class="page-error" role="alert">{{ error() }}</div>
      } @else {
        <!-- Resumen rapido -->
        <section class="summary-cards" aria-label="Resumen del periodo">
          <div class="summary-card">
            <span class="summary-label">Total creditos</span>
            <span class="summary-value credit">
              {{ totalCredits() | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Total debitos</span>
            <span class="summary-value debit">
              {{ totalDebits() | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Balance neto</span>
            <span class="summary-value" [class.credit]="netBalance() >= 0" [class.debit]="netBalance() < 0">
              {{ netBalance() | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Total movimientos</span>
            <span class="summary-value">{{ totalMovements() }}</span>
          </div>
        </section>

        <!-- Grafica de barras CSS -->
        <section class="chart-section" aria-label="Grafica creditos vs debitos por mes">
          <h2 class="section-title">Creditos vs Debitos por Mes</h2>
          <div class="bar-chart">
            @for (bar of monthBars(); track bar.label) {
              <div class="bar-group">
                <div class="bar-pair">
                  <!-- Barra de creditos -->
                  <div
                    class="bar bar-credit"
                    [style.height.%]="getBarHeight(bar.credits, bar.maxValue)"
                    [title]="'Creditos: ' + (bar.credits | currency:'MXN':'symbol':'1.2-2')"
                    role="img"
                    [attr.aria-label]="'Creditos ' + bar.label + ': ' + bar.credits"
                  ></div>
                  <!-- Barra de debitos -->
                  <div
                    class="bar bar-debit"
                    [style.height.%]="getBarHeight(bar.debits, bar.maxValue)"
                    [title]="'Debitos: ' + (bar.debits | currency:'MXN':'symbol':'1.2-2')"
                    role="img"
                    [attr.aria-label]="'Debitos ' + bar.label + ': ' + bar.debits"
                  ></div>
                </div>
                <span class="bar-label">{{ bar.label }}</span>
              </div>
            }
          </div>
          <div class="chart-legend">
            <span class="legend-dot legend-credit"></span><span>Creditos</span>
            <span class="legend-dot legend-debit"></span><span>Debitos</span>
          </div>
        </section>

        <!-- Grid de tablas -->
        <div class="reports-grid">
          <!-- Top 5 destinos SPEI -->
          <section class="report-card" aria-label="Top destinos SPEI">
            <h2 class="section-title">Top 5 Destinos SPEI</h2>
            @if (topDestinations().length === 0) {
              <p class="empty-text">Sin transferencias SPEI en el periodo.</p>
            } @else {
              <div class="top-list">
                @for (dest of topDestinations(); track dest.name; let i = $index) {
                  <div class="top-item">
                    <span class="top-rank">{{ i + 1 }}</span>
                    <div class="top-info">
                      <span class="top-name">{{ dest.name }}</span>
                      <span class="top-count">{{ dest.count }} transferencia(s)</span>
                    </div>
                    <span class="top-amount">
                      {{ dest.total | currency:'MXN':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Gastos por categoria -->
          <section class="report-card" aria-label="Gastos por categoria">
            <h2 class="section-title">Gastos por Categoria</h2>
            @if (categorySummary().length === 0) {
              <p class="empty-text">Sin movimientos en el periodo.</p>
            } @else {
              <div class="category-list">
                @for (cat of categorySummary(); track cat.category) {
                  <div class="category-item">
                    <span class="category-label">{{ cat.label }}</span>
                    <div class="category-bar-wrap">
                      <div
                        class="category-bar-fill"
                        [style.width.%]="getCategoryPercent(cat.total)"
                      ></div>
                    </div>
                    <span class="category-amount">
                      {{ cat.total | currency:'MXN':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      display: inline-block;
      color: #6b7280;
      font-size: 13px;
      text-decoration: none;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #374151; }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    /* Period selector */
    .period-selector {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
    }

    .period-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s;
    }

    .period-active {
      background: #ffffff;
      color: #111827;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* Loading / error */
    .page-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 64px 24px;
      color: #6b7280;
      font-size: 14px;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .page-error {
      padding: 14px 18px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 14px;
    }

    /* Summary cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }

    .summary-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .summary-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      font-variant-numeric: tabular-nums;
    }

    .credit { color: #059669; }
    .debit  { color: #dc2626; }

    /* Bar chart */
    .chart-section {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 16px;
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 20px;
      height: 160px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .bar-pair {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 140px;
      width: 100%;
      justify-content: center;
    }

    .bar {
      width: 28px;
      min-height: 4px;
      border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
    }

    .bar-credit { background: #10b981; }
    .bar-debit  { background: #ef4444; }

    .bar-label {
      font-size: 11px;
      color: #6b7280;
      white-space: nowrap;
    }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
      font-size: 13px;
      color: #374151;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .legend-credit { background: #10b981; }
    .legend-debit  { background: #ef4444; }

    /* Reports grid */
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }

    .report-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 24px;
    }

    .empty-text {
      color: #9ca3af;
      font-size: 14px;
    }

    /* Top list */
    .top-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .top-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .top-rank {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .top-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .top-name {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }

    .top-count {
      font-size: 12px;
      color: #9ca3af;
    }

    .top-amount {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      font-variant-numeric: tabular-nums;
    }

    /* Category list */
    .category-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .category-label {
      font-size: 13px;
      color: #374151;
      min-width: 120px;
    }

    .category-bar-wrap {
      flex: 1;
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }

    .category-bar-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .category-amount {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      font-variant-numeric: tabular-nums;
      min-width: 90px;
      text-align: right;
    }
  `],
})
export class BusinessReportsComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly businessSvc = inject(BusinessService);

  readonly periodOptions: { value: ReportPeriod; label: string }[] = [
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_month', label: 'Mes pasado' },
    { value: 'last_3_months', label: 'Ultimos 3 meses' },
  ];

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedPeriod = signal<ReportPeriod>('this_month');

  readonly allEntries = signal<LedgerEntry[]>([]);

  readonly totalCredits = computed(() =>
    this.allEntries()
      .filter((e) => e.entry_type === 'CREDIT')
      .reduce((s, e) => s + e.amount, 0)
  );

  readonly totalDebits = computed(() =>
    this.allEntries()
      .filter((e) => e.entry_type === 'DEBIT')
      .reduce((s, e) => s + e.amount, 0)
  );

  readonly netBalance = computed(() => this.totalCredits() - this.totalDebits());
  readonly totalMovements = computed(() => this.allEntries().length);

  readonly monthBars = computed<MonthBar[]>(() => this.buildMonthBars());
  readonly topDestinations = computed<TopDestination[]>(() => this.buildTopDestinations());
  readonly categorySummary = computed<CategorySummary[]>(() => this.buildCategorySummary());

  ngOnInit(): void {
    this.loadReportData();
  }

  selectPeriod(period: ReportPeriod): void {
    this.selectedPeriod.set(period);
    this.loadReportData();
  }

  getBarHeight(value: number, maxValue: number): number {
    if (maxValue === 0) return 0;
    return Math.max(2, Math.round((value / maxValue) * 100));
  }

  getCategoryPercent(value: number): number {
    const summary = this.categorySummary();
    const max = summary.reduce((m, c) => Math.max(m, c.total), 0);
    if (max === 0) return 0;
    return Math.round((value / max) * 100);
  }

  private loadReportData(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      this.error.set('No se encontro organizacion activa.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Primero intentamos el endpoint de reportes; si falla usamos ledger directamente
    this.businessSvc.getReports(orgId, this.selectedPeriod()).subscribe({
      next: (res) => {
        const entries: LedgerEntry[] = res.data?.entries ?? res.data ?? [];
        this.allEntries.set(entries);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback: cargar ledger de la primera cuenta activa
        this.loadFallbackLedger(orgId);
      },
    });
  }

  private loadFallbackLedger(orgId: string): void {
    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        const firstActive = (res.data ?? []).find(
          (a: { status: string }) => a.status === 'ACTIVE'
        );
        if (!firstActive) {
          this.allEntries.set([]);
          this.isLoading.set(false);
          return;
        }
        this.accountsAdapter.getLedgerEntries(orgId, firstActive.account_id, 1, 100).subscribe({
          next: (ledgerRes) => {
            const filtered = this.filterByPeriod(ledgerRes.data ?? []);
            this.allEntries.set(filtered);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
            this.error.set('Error al cargar los datos del reporte.');
          },
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Error al cargar los datos del reporte.');
      },
    });
  }

  private filterByPeriod(entries: LedgerEntry[]): LedgerEntry[] {
    const now = new Date();
    let from: Date;
    const period = this.selectedPeriod();

    if (period === 'this_month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'last_month') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return entries.filter((e) => {
        const d = new Date(e.created_at);
        return d >= from && d <= to;
      });
    } else {
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    return entries.filter((e) => new Date(e.created_at) >= from);
  }

  private buildMonthBars(): MonthBar[] {
    const period = this.selectedPeriod();
    const entries = this.allEntries();

    const monthCount = period === 'last_3_months' ? 3 : 1;
    const now = new Date();
    const bars: MonthBar[] = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('es-MX', { month: 'short', year: '2-digit' });
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const monthEntries = entries.filter((e) => e.created_at.startsWith(monthStr));
      const credits = monthEntries
        .filter((e) => e.entry_type === 'CREDIT')
        .reduce((s, e) => s + e.amount, 0);
      const debits = monthEntries
        .filter((e) => e.entry_type === 'DEBIT')
        .reduce((s, e) => s + e.amount, 0);

      bars.push({ label, credits, debits, maxValue: 0 });
    }

    const maxValue = bars.reduce((m, b) => Math.max(m, b.credits, b.debits), 0);
    return bars.map((b) => ({ ...b, maxValue }));
  }

  private buildTopDestinations(): TopDestination[] {
    const speiOuts = this.allEntries().filter(
      (e) => e.category === 'SPEI_OUT' && e.entry_type === 'DEBIT'
    );

    const map = new Map<string, { count: number; total: number }>();
    for (const entry of speiOuts) {
      const key = entry.concept ?? 'Sin nombre';
      const existing = map.get(key) ?? { count: 0, total: 0 };
      map.set(key, { count: existing.count + 1, total: existing.total + entry.amount });
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  private buildCategorySummary(): CategorySummary[] {
    const categoryLabels: Record<string, string> = {
      SPEI_OUT: 'SPEI Enviado',
      SPEI_IN: 'SPEI Recibido',
      FEE: 'Comisiones',
      REVERSAL: 'Reversas',
      ADJUSTMENT: 'Ajustes',
      INITIAL_DEPOSIT: 'Dep. Inicial',
      INTERNAL_TRANSFER: 'Transferencia Int.',
    };

    const debitEntries = this.allEntries().filter((e) => e.entry_type === 'DEBIT');
    const map = new Map<string, number>();

    for (const entry of debitEntries) {
      const existing = map.get(entry.category) ?? 0;
      map.set(entry.category, existing + entry.amount);
    }

    return Array.from(map.entries())
      .map(([category, total]) => ({
        category,
        label: categoryLabels[category] ?? category,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }
}
