/**
 * BusinessDashboardComponent - Dashboard del portal empresarial B2B
 *
 * Vista principal del Tier 2 (Business / org_admin).
 * Muestra resumen de cuentas y transferencias de la empresa.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { TransfersAdapter } from '@infrastructure/adapters/transfers.adapter';
import { FinancialAccount } from '@domain/models/financial-account.model';
import { SpeiTransfer } from '@domain/models/transfer.model';

@Component({
  selector: 'sp-business-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="business-dashboard">
      <header class="dashboard-header">
        <h1>Portal Empresarial</h1>
        <p class="subtitle">{{ orgName() }}</p>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando datos...</div>
      } @else {
        <section class="balance-summary">
          <h2>Resumen de Saldos</h2>
          <div class="accounts-grid">
            @for (account of accounts(); track account.account_id) {
              <div class="account-card">
                <span class="account-name">{{ account.name ?? account.account_type }}</span>
                <span class="account-balance">
                  {{ account.available_balance | number: '1.2-2' }} MXN
                </span>
                <span
                  class="account-status"
                  [class.active]="account.status === 'ACTIVE'"
                >
                  {{ account.status }}
                </span>
              </div>
            }
          </div>
        </section>

        <section class="recent-transfers">
          <div class="section-header">
            <h2>Transferencias Recientes</h2>
            <a routerLink="/sp/business/transfers" class="view-all">Ver todas</a>
          </div>
          @if (recentTransfers().length === 0) {
            <p class="empty-text">No hay transferencias recientes.</p>
          } @else {
            <div class="transfers-list">
              @for (transfer of recentTransfers(); track transfer.transfer_id) {
                <div class="transfer-item">
                  <div class="transfer-info">
                    <span class="transfer-name">{{ transfer.destination_name }}</span>
                    <span class="transfer-concept">{{ transfer.concept }}</span>
                  </div>
                  <div class="transfer-amount">
                    <span class="amount">{{ transfer.amount | number: '1.2-2' }} MXN</span>
                    <span
                      class="status"
                      [class.completed]="transfer.status === 'COMPLETED'"
                      [class.pending]="transfer.status === 'PENDING'"
                      [class.failed]="transfer.status === 'FAILED'"
                    >
                      {{ transfer.status }}
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
    .business-dashboard {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 28px;
    }

    .dashboard-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px;
    }

    .subtitle {
      color: #64748b;
      margin: 0;
      font-size: 14px;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    section {
      margin-bottom: 32px;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 16px;
    }

    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .account-card {
      background: white;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .account-name {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .account-balance {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
    }

    .account-status {
      font-size: 11px;
      padding: 2px 8px;
      background: #fee2e2;
      color: #dc2626;
      border-radius: 4px;
      width: fit-content;
    }

    .account-status.active {
      background: #dcfce7;
      color: #16a34a;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .view-all {
      color: #2563eb;
      font-size: 13px;
      text-decoration: none;
    }

    .empty-text {
      color: #94a3b8;
      font-size: 14px;
    }

    .transfers-list {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    }

    .transfer-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .transfer-item:last-child {
      border-bottom: none;
    }

    .transfer-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .transfer-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .transfer-concept {
      font-size: 12px;
      color: #94a3b8;
    }

    .transfer-amount {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
    }

    .amount {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }

    .status {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .status.completed { background: #dcfce7; color: #16a34a; }
    .status.pending { background: #fef3c7; color: #d97706; }
    .status.failed { background: #fee2e2; color: #dc2626; }
  `],
})
export class BusinessDashboardComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly transfersAdapter = inject(TransfersAdapter);

  readonly isLoading = signal(true);
  readonly accounts = signal<FinancialAccount[]>([]);
  readonly recentTransfers = signal<SpeiTransfer[]>([]);
  readonly orgName = signal<string>('');

  ngOnInit(): void {
    this.orgName.set(this.sharedState.tenant().name ?? 'Mi Empresa');
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
        this.accounts.set(response.data ?? []);
        this.loadTransfers(orgId);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private loadTransfers(orgId: string): void {
    this.transfersAdapter.getTransfers(orgId, 1, 5).subscribe({
      next: (response) => {
        this.recentTransfers.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
