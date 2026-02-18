/**
 * AccountsOverviewComponent - Vista de cuentas de la organizacion B2B
 *
 * Muestra el arbol de cuentas usando AccountTreeComponent y el detalle
 * de la cuenta seleccionada con AccountDetailCardComponent.
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
import {
  AccountTreeComponent,
  AccountDetailCardComponent,
} from '../../../../shared/components/index';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';

@Component({
  selector: 'sp-accounts-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AccountTreeComponent,
    AccountDetailCardComponent,
  ],
  template: `
    <div class="accounts-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Dashboard</a>
        <div class="header-row">
          <h1 class="page-title">Cuentas de la Organizacion</h1>
        </div>
      </header>

      @if (isLoading()) {
        <div class="page-loading" role="status">
          <div class="spinner"></div>
          <span>Cargando cuentas...</span>
        </div>
      } @else if (error()) {
        <div class="page-error" role="alert">
          <strong>Error:</strong> {{ error() }}
        </div>
      } @else {
        <!-- Totales -->
        <section class="totals-row" aria-label="Totales por tipo de cuenta">
          @for (group of accountGroups(); track group.type) {
            <div class="total-card">
              <span class="total-type">{{ group.label }}</span>
              <span class="total-count">{{ group.count }} cuenta(s)</span>
              <span class="total-balance">
                {{ group.totalBalance | currency:'MXN':'symbol':'1.2-2' }}
              </span>
            </div>
          }
        </section>

        <!-- Layout arbol + detalle -->
        <div class="accounts-grid">
          <!-- Arbol de cuentas -->
          <div class="tree-panel">
            <sp-account-tree
              [accounts]="accounts()"
              [selectedAccountId]="selectedAccountId()"
              (accountSelected)="onAccountSelected($event)"
            />
          </div>

          <!-- Detalle de cuenta seleccionada -->
          <div class="detail-panel">
            <sp-account-detail-card
              [account]="selectedAccount()"
              [availableBalance]="selectedBalance()"
              [pendingBalance]="selectedPending()"
              [isLoading]="detailLoading()"
              (refreshRequested)="refreshSelectedAccount()"
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .accounts-page {
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
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin: 0;
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

    /* Totals */
    .totals-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .total-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .total-type {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .total-count {
      font-size: 12px;
      color: #9ca3af;
    }

    .total-balance {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      font-variant-numeric: tabular-nums;
    }

    /* Grid */
    .accounts-grid {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 800px) {
      .accounts-grid { grid-template-columns: 1fr; }
    }

    .tree-panel { min-width: 0; }
    .detail-panel { min-width: 0; }
  `],
})
export class AccountsOverviewComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);

  readonly isLoading = signal(true);
  readonly detailLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly accounts = signal<FinancialAccount[]>([]);
  readonly selectedAccountId = signal<string | null>(null);
  readonly selectedAccount = signal<FinancialAccount | null>(null);
  readonly selectedBalance = signal(0);
  readonly selectedPending = signal(0);

  readonly accountGroups = signal<{ type: string; label: string; count: number; totalBalance: number }[]>([]);

  ngOnInit(): void {
    this.loadAccounts();
  }

  onAccountSelected(account: FinancialAccount): void {
    this.selectedAccountId.set(account.account_id);
    this.selectedAccount.set(account);
    this.selectedBalance.set(account.available_balance ?? 0);
    this.refreshSelectedAccount();
  }

  refreshSelectedAccount(): void {
    const orgId = this.sharedState.currentOrganizationId();
    const accountId = this.selectedAccountId();
    if (!orgId || !accountId) return;

    this.detailLoading.set(true);
    this.accountsAdapter.getBalance(orgId, accountId).subscribe({
      next: (res) => {
        this.selectedBalance.set(res.data?.available_balance ?? this.selectedBalance());
        this.selectedPending.set(res.data?.frozen_balance ?? 0);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  private loadAccounts(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      this.error.set('No se encontro organizacion activa.');
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        const accounts: FinancialAccount[] = res.data ?? [];
        this.accounts.set(accounts);
        this.buildGroups(accounts);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Error al cargar las cuentas.');
      },
    });
  }

  private buildGroups(accounts: FinancialAccount[]): void {
    const labels: Record<string, string> = {
      CONCENTRADORA: 'Concentradora',
      CLABE_PRIVADA: 'CLABE Privada',
      RESERVADA_NOMINA: 'Nomina',
      RESERVADA_PAGOS: 'Pagos',
      RESERVADA_IMPUESTOS: 'Impuestos',
      OPERATIVA: 'Operativa',
    };

    const groupMap = new Map<string, { count: number; totalBalance: number }>();

    for (const acc of accounts) {
      const existing = groupMap.get(acc.account_type) ?? { count: 0, totalBalance: 0 };
      groupMap.set(acc.account_type, {
        count: existing.count + 1,
        totalBalance: existing.totalBalance + (acc.available_balance ?? 0),
      });
    }

    const groups = Array.from(groupMap.entries()).map(([type, data]) => ({
      type,
      label: labels[type] ?? type,
      count: data.count,
      totalBalance: data.totalBalance,
    }));

    this.accountGroups.set(groups);
  }
}
