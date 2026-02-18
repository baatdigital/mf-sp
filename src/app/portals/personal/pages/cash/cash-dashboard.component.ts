/**
 * CashDashboardComponent - Dashboard de operaciones de efectivo (Personal)
 *
 * Vista principal de Cash para el portal B2C.
 * Muestra saldo disponible, movimientos recientes y accesos rapidos.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { CashService, CashTransaction } from '../../services/cash.service';
import { FinancialAccount } from '@domain/models/financial-account.model';

@Component({
  selector: 'sp-cash-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cash-dashboard">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Efectivo</h1>
        <p class="subtitle">Deposita y retira dinero en puntos de pago</p>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando...</p>
        </div>
      } @else {

        <!-- Tarjeta de saldo disponible -->
        <section class="balance-card">
          <p class="balance-label">Saldo Disponible</p>
          <p class="balance-amount">
            {{ (account()?.available_balance ?? 0) | number: '1.2-2' }} MXN
          </p>
          @if (account()) {
            <p class="balance-total">
              Saldo total: {{ account()!.balance | number: '1.2-2' }} MXN
            </p>
          }
        </section>

        <!-- Acciones rapidas -->
        <section class="quick-actions">
          <a routerLink="/sp/personal/cash/deposit" class="action-btn action-deposit">
            <span class="action-icon">&#8595;</span>
            Depositar
          </a>
          <a routerLink="/sp/personal/cash/withdraw/request" class="action-btn action-withdraw">
            <span class="action-icon">&#8593;</span>
            Retirar
          </a>
        </section>

        <!-- Historial reciente -->
        <section class="recent-transactions">
          <h2>Transacciones Recientes</h2>

          @if (error()) {
            <div class="error-state">
              <p>{{ error() }}</p>
            </div>
          } @else if (recentTransactions().length === 0) {
            <div class="empty-state">
              <p>No hay transacciones de efectivo recientes.</p>
            </div>
          } @else {
            <div class="transactions-list">
              @for (tx of recentTransactions(); track tx.transaction_id) {
                <div class="transaction-item">
                  <div class="tx-icon" [class.deposit]="tx.type === 'DEPOSIT'" [class.withdrawal]="tx.type === 'WITHDRAWAL'">
                    {{ tx.type === 'DEPOSIT' ? '&#8595;' : '&#8593;' }}
                  </div>
                  <div class="tx-info">
                    <span class="tx-type">{{ tx.type === 'DEPOSIT' ? 'Depósito' : 'Retiro' }}</span>
                    <span class="tx-date">{{ tx.created_at | date: 'dd/MM/yyyy HH:mm' }}</span>
                    <span class="tx-point">Punto: {{ tx.point_id }}</span>
                  </div>
                  <div class="tx-right">
                    <span
                      class="tx-amount"
                      [class.positive]="tx.type === 'DEPOSIT'"
                      [class.negative]="tx.type === 'WITHDRAWAL'"
                    >
                      {{ tx.type === 'DEPOSIT' ? '+' : '-' }}{{ tx.amount | number: '1.2-2' }} MXN
                    </span>
                    <span class="tx-status" [class.completed]="tx.status === 'COMPLETED'">
                      {{ tx.status }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .cash-dashboard {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      color: #64748b;
      gap: 12px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .balance-card {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 16px;
      padding: 24px;
      color: white;
      margin-bottom: 20px;
    }

    .balance-label {
      font-size: 13px;
      opacity: 0.8;
      margin: 0 0 6px;
    }

    .balance-amount {
      font-size: 34px;
      font-weight: 700;
      margin: 0 0 6px;
    }

    .balance-total {
      font-size: 12px;
      opacity: 0.7;
      margin: 0;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 28px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.15s;
    }

    .action-btn:hover { opacity: 0.85; }

    .action-deposit {
      background: #dcfce7;
      color: #15803d;
    }

    .action-withdraw {
      background: #fee2e2;
      color: #b91c1c;
    }

    .action-icon {
      font-size: 18px;
    }

    .recent-transactions h2 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 14px;
    }

    .error-state, .empty-state {
      text-align: center;
      padding: 32px;
      color: #94a3b8;
      font-size: 14px;
      background: white;
      border-radius: 12px;
    }

    .error-state { color: #dc2626; background: #fef2f2; }

    .transactions-list {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }

    .transaction-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .transaction-item:last-child { border-bottom: none; }

    .tx-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .tx-icon.deposit { background: #dcfce7; color: #15803d; }
    .tx-icon.withdrawal { background: #fee2e2; color: #b91c1c; }

    .tx-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tx-type {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .tx-date, .tx-point {
      font-size: 11px;
      color: #94a3b8;
    }

    .tx-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .tx-amount {
      font-size: 15px;
      font-weight: 700;
    }

    .tx-amount.positive { color: #16a34a; }
    .tx-amount.negative { color: #dc2626; }

    .tx-status {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #f1f5f9;
      color: #64748b;
    }

    .tx-status.completed {
      background: #dcfce7;
      color: #15803d;
    }
  `],
})
export class CashDashboardComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly cashService = inject(CashService);

  readonly isLoading = signal(true);
  readonly account = signal<FinancialAccount | null>(null);
  readonly recentTransactions = signal<CashTransaction[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        const accounts = response.data ?? [];
        const active = accounts.find((a) => a.status === 'ACTIVE') ?? null;
        this.account.set(active);

        if (active) {
          this.loadCashHistory(orgId, active.account_id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudo cargar la cuenta. Intente de nuevo.');
      },
    });
  }

  private loadCashHistory(orgId: string, accountId: string): void {
    this.cashService.getHistory(orgId, accountId).subscribe({
      next: (response) => {
        const last5 = (response.data ?? []).slice(0, 5);
        this.recentTransactions.set(last5);
        this.isLoading.set(false);
      },
      error: () => {
        // Historial no critico - ignorar error y mostrar vacio
        this.recentTransactions.set([]);
        this.isLoading.set(false);
      },
    });
  }
}
