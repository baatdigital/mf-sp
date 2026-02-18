/**
 * BusinessDashboardComponent - Dashboard principal del portal empresarial B2B
 *
 * Vista principal del Tier 2. Muestra resumen de cuenta, stats SPEI del dia,
 * movimientos recientes y botones de accion rapida.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { AccountDetailCardComponent } from '../../../../shared/components/index';
import { MovementsTableComponent } from '../../../../shared/components/index';
import { BusinessService } from '../../services/business.service';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';
import { LedgerEntry } from '../../../../domain/models/ledger-entry.model';

@Component({
  selector: 'sp-business-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AccountDetailCardComponent,
    MovementsTableComponent,
  ],
  template: `
    <div class="biz-dashboard">
      <header class="biz-header">
        <div class="biz-header-left">
          <h1 class="biz-title">Portal Empresarial</h1>
          <p class="biz-subtitle">{{ orgName() }}</p>
        </div>
        <div class="biz-header-actions">
          <a routerLink="/sp/business/transfers/spei" class="action-btn action-primary">
            + Enviar SPEI
          </a>
          <a routerLink="/sp/business/movements" class="action-btn action-secondary">
            Ver movimientos
          </a>
        </div>
      </header>

      @if (isLoading()) {
        <div class="biz-loading" role="status" aria-label="Cargando datos">
          <div class="loading-spinner"></div>
          <span>Cargando datos de la empresa...</span>
        </div>
      } @else if (error()) {
        <div class="biz-error" role="alert">
          <span class="error-icon">!</span>
          <span>{{ error() }}</span>
        </div>
      } @else {
        <!-- Stats rapidos del dia -->
        <section class="stats-row" aria-label="Estadisticas del dia">
          <div class="stat-card">
            <span class="stat-label">SPEI Enviado hoy</span>
            <span class="stat-value stat-debit">
              {{ speiSentToday() | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">SPEI Recibido hoy</span>
            <span class="stat-value stat-credit">
              {{ speiReceivedToday() | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Cuentas activas</span>
            <span class="stat-value">{{ activeAccountsCount() }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Saldo total</span>
            <span class="stat-value">
              {{ totalBalance() | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>
        </section>

        <!-- Layout de dos columnas -->
        <div class="biz-grid">
          <!-- Columna izquierda: Detalle de cuenta -->
          <aside class="biz-sidebar">
            <div class="section-title">Cuenta principal</div>
            <sp-account-detail-card
              [account]="primaryAccount()"
              [availableBalance]="primaryAccount()?.available_balance ?? 0"
              [pendingBalance]="pendingBalance()"
              [isLoading]="accountLoading()"
              (refreshRequested)="refreshPrimaryAccount()"
            />
          </aside>

          <!-- Columna derecha: Movimientos recientes -->
          <main class="biz-main">
            <div class="section-header">
              <div class="section-title">Movimientos recientes</div>
              <a routerLink="/sp/business/movements" class="view-all-link">
                Ver historial completo
              </a>
            </div>
            <div class="movements-card">
              <sp-movements-table
                [entries]="recentMovements()"
                [isLoading]="movementsLoading()"
                [pageSize]="5"
              />
            </div>

            <!-- Acciones rapidas -->
            <div class="quick-actions">
              <div class="quick-actions-title">Acciones rapidas</div>
              <div class="quick-actions-grid">
                <a routerLink="/sp/business/transfers/spei" class="quick-action-card">
                  <span class="quick-action-icon">-></span>
                  <span class="quick-action-label">Enviar SPEI</span>
                </a>
                <a routerLink="/sp/business/movements" class="quick-action-card">
                  <span class="quick-action-icon">+</span>
                  <span class="quick-action-label">Movimientos</span>
                </a>
                <a routerLink="/sp/business/reports" class="quick-action-card">
                  <span class="quick-action-icon">=</span>
                  <span class="quick-action-label">Reportes</span>
                </a>
                <a routerLink="/sp/business/accounts" class="quick-action-card">
                  <span class="quick-action-icon">#</span>
                  <span class="quick-action-label">Cuentas</span>
                </a>
              </div>
            </div>
          </main>
        </div>
      }
    </div>
  `,
  styles: [`
    .biz-dashboard {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .biz-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .biz-title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px;
    }

    .biz-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }

    .biz-header-actions {
      display: flex;
      gap: 10px;
    }

    .action-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.15s;
    }

    .action-primary {
      background: #2563eb;
      color: #ffffff;
    }

    .action-primary:hover { background: #1d4ed8; }

    .action-secondary {
      background: #f1f5f9;
      color: #374151;
      border: 1px solid #e2e8f0;
    }

    .action-secondary:hover { background: #e2e8f0; }

    /* Loading / error */
    .biz-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 64px 24px;
      color: #6b7280;
      font-size: 14px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .biz-error {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .error-icon {
      font-weight: 700;
      font-size: 16px;
    }

    /* Stats */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      font-variant-numeric: tabular-nums;
    }

    .stat-credit { color: #059669; }
    .stat-debit  { color: #dc2626; }

    /* Grid */
    .biz-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 860px) {
      .biz-grid { grid-template-columns: 1fr; }
    }

    .biz-sidebar { display: flex; flex-direction: column; gap: 16px; }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .view-all-link {
      font-size: 13px;
      color: #2563eb;
      text-decoration: none;
    }

    .view-all-link:hover { text-decoration: underline; }

    .movements-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
    }

    /* Quick actions */
    .quick-actions-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    @media (max-width: 600px) {
      .quick-actions-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .quick-action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s;
    }

    .quick-action-card:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .quick-action-icon {
      font-size: 20px;
      color: #2563eb;
    }

    .quick-action-label {
      font-size: 12px;
      font-weight: 500;
      color: #374151;
    }
  `],
})
export class BusinessDashboardPageComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly businessSvc = inject(BusinessService);

  readonly isLoading = signal(true);
  readonly accountLoading = signal(false);
  readonly movementsLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly orgName = signal<string>('Mi Empresa');
  readonly primaryAccount = signal<FinancialAccount | null>(null);
  readonly pendingBalance = signal(0);
  readonly recentMovements = signal<LedgerEntry[]>([]);
  readonly speiSentToday = signal(0);
  readonly speiReceivedToday = signal(0);
  readonly activeAccountsCount = signal(0);
  readonly totalBalance = signal(0);

  ngOnInit(): void {
    this.orgName.set(this.sharedState.tenant().name ?? 'Mi Empresa');
    this.loadDashboard();
  }

  refreshPrimaryAccount(): void {
    const orgId = this.sharedState.currentOrganizationId();
    const account = this.primaryAccount();
    if (!orgId || !account) return;

    this.accountLoading.set(true);
    this.accountsAdapter.getBalance(orgId, account.account_id).subscribe({
      next: (res) => {
        this.primaryAccount.update((acc) =>
          acc ? { ...acc, available_balance: res.data?.available_balance ?? acc.available_balance } : acc
        );
        this.pendingBalance.set(res.data?.frozen_balance ?? 0);
        this.accountLoading.set(false);
      },
      error: () => this.accountLoading.set(false),
    });
  }

  private loadDashboard(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      this.error.set('No se encontro organizacion activa.');
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        const accounts: FinancialAccount[] = res.data ?? [];
        const active = accounts.filter((a) => a.status === 'ACTIVE');
        const primary = active[0] ?? accounts[0] ?? null;

        this.primaryAccount.set(primary);
        this.activeAccountsCount.set(active.length);
        this.totalBalance.set(accounts.reduce((sum, a) => sum + (a.available_balance ?? 0), 0));
        this.isLoading.set(false);

        if (primary) {
          this.loadRecentMovements(orgId, primary.account_id);
        } else {
          this.movementsLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Error al cargar las cuentas. Intenta de nuevo.');
      },
    });
  }

  private loadRecentMovements(orgId: string, accountId: string): void {
    this.movementsLoading.set(true);
    this.accountsAdapter.getLedgerEntries(orgId, accountId, 1, 5).subscribe({
      next: (res) => {
        const entries = res.data ?? [];
        this.recentMovements.set(entries);
        this.computeDailyStats(entries);
        this.movementsLoading.set(false);
      },
      error: () => this.movementsLoading.set(false),
    });
  }

  private computeDailyStats(entries: LedgerEntry[]): void {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = entries.filter((e) => e.created_at.startsWith(today));
    const speiOut = todayEntries
      .filter((e) => e.entry_type === 'DEBIT' && e.category === 'SPEI_OUT')
      .reduce((sum, e) => sum + e.amount, 0);
    const speiIn = todayEntries
      .filter((e) => e.entry_type === 'CREDIT' && e.category === 'SPEI_IN')
      .reduce((sum, e) => sum + e.amount, 0);

    this.speiSentToday.set(speiOut);
    this.speiReceivedToday.set(speiIn);
  }
}
