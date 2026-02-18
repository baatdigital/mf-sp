/**
 * PersonalDashboardComponent - Dashboard del portal personal B2C
 *
 * Vista principal del Tier 3 (Personal / end_user).
 * Muestra saldo y movimientos del usuario final.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { FinancialAccount } from '@domain/models/financial-account.model';
import { LedgerEntry } from '@domain/models/ledger-entry.model';

@Component({
  selector: 'sp-personal-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="personal-dashboard">
      <header class="dashboard-header">
        <h1>Mi Cuenta</h1>
        <p class="welcome">Hola, {{ userName() }}</p>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando tu cuenta...</div>
      } @else if (!primaryAccount()) {
        <div class="no-account">
          <p>No tienes una cuenta activa. Contacta a soporte.</p>
        </div>
      } @else {
        <section class="balance-card">
          <p class="balance-label">Saldo Disponible</p>
          <p class="balance-amount">
            {{ primaryAccount()!.available_balance | number: '1.2-2' }} MXN
          </p>
          <p class="balance-total">
            Saldo total: {{ primaryAccount()!.balance | number: '1.2-2' }} MXN
          </p>
        </section>

        <section class="movements">
          <h2>Ultimos Movimientos</h2>
          @if (movements().length === 0) {
            <p class="empty-text">Sin movimientos recientes.</p>
          } @else {
            <div class="movements-list">
              @for (entry of movements(); track entry.entry_id) {
                <div class="movement-item">
                  <div class="movement-info">
                    <span class="movement-concept">{{ entry.concept }}</span>
                    <span class="movement-date">
                      {{ entry.created_at | date: 'dd/MM/yyyy' }}
                    </span>
                  </div>
                  <span
                    class="movement-amount"
                    [class.credit]="entry.entry_type === 'CREDIT'"
                    [class.debit]="entry.entry_type === 'DEBIT'"
                  >
                    {{ entry.entry_type === 'CREDIT' ? '+' : '-' }}
                    {{ entry.amount | number: '1.2-2' }} MXN
                  </span>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .personal-dashboard {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 24px;
    }

    .dashboard-header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .welcome {
      color: #64748b;
      margin: 0;
      font-size: 14px;
    }

    .loading, .no-account {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .balance-card {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 16px;
      padding: 24px;
      color: white;
      margin-bottom: 28px;
    }

    .balance-label {
      font-size: 13px;
      opacity: 0.8;
      margin: 0 0 8px;
    }

    .balance-amount {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .balance-total {
      font-size: 12px;
      opacity: 0.7;
      margin: 0;
    }

    .movements h2 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 14px;
    }

    .empty-text {
      color: #94a3b8;
      font-size: 14px;
    }

    .movements-list {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    }

    .movement-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .movement-item:last-child {
      border-bottom: none;
    }

    .movement-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .movement-concept {
      font-size: 14px;
      color: #1e293b;
    }

    .movement-date {
      font-size: 12px;
      color: #94a3b8;
    }

    .movement-amount {
      font-size: 15px;
      font-weight: 600;
    }

    .movement-amount.credit { color: #16a34a; }
    .movement-amount.debit  { color: #dc2626; }
  `],
})
export class PersonalDashboardComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);

  readonly isLoading = signal(true);
  readonly primaryAccount = signal<FinancialAccount | null>(null);
  readonly movements = signal<LedgerEntry[]>([]);
  readonly userName = signal<string>('');

  ngOnInit(): void {
    this.userName.set(this.sharedState.currentUser().name ?? 'Usuario');
    this.loadAccountData();
  }

  private loadAccountData(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        const accounts = response.data ?? [];
        const active = accounts.find((a) => a.status === 'ACTIVE') ?? null;
        this.primaryAccount.set(active);

        if (active) {
          this.loadMovements(orgId, active.account_id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private loadMovements(orgId: string, accountId: string): void {
    this.accountsAdapter.getLedgerEntries(orgId, accountId, 1, 10).subscribe({
      next: (response) => {
        this.movements.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
