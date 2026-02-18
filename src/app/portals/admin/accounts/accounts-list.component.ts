/**
 * AccountsListComponent - Lista de cuentas financieras (vista Admin)
 *
 * Muestra todas las cuentas de la organizacion con opciones de
 * congelamiento y detalle. Solo accesible por el tier admin.
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
import { FinancialAccount } from '@domain/models/financial-account.model';

@Component({
  selector: 'sp-accounts-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="accounts-page">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
          <h1>Cuentas Financieras</h1>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando cuentas...</div>
      } @else if (accounts().length === 0) {
        <div class="empty-state">
          <p>No hay cuentas registradas para esta organizacion.</p>
        </div>
      } @else {
        <div class="accounts-table-wrapper">
          <table class="accounts-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>CLABE</th>
                <th>Estado</th>
                <th>Saldo Disponible</th>
              </tr>
            </thead>
            <tbody>
              @for (account of accounts(); track account.account_id) {
                <tr>
                  <td>{{ account.name ?? account.account_id }}</td>
                  <td>
                    <span class="badge">{{ account.account_type }}</span>
                  </td>
                  <td class="clabe">{{ account.clabe ?? '-' }}</td>
                  <td>
                    <span
                      class="status-badge"
                      [class.active]="account.status === 'ACTIVE'"
                      [class.frozen]="account.status === 'FROZEN'"
                      [class.closed]="account.status === 'CLOSED'"
                    >
                      {{ account.status }}
                    </span>
                  </td>
                  <td class="balance">
                    {{ account.available_balance | number: '1.2-2' }} MXN
                  </td>
                </tr>
              }
            </tbody>
          </table>
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
      margin: 0;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    .accounts-table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .accounts-table {
      width: 100%;
      border-collapse: collapse;
    }

    .accounts-table th {
      background: #f8fafc;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
    }

    .accounts-table td {
      padding: 14px 16px;
      font-size: 14px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .badge {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .clabe {
      font-family: monospace;
      font-size: 12px;
      color: #64748b;
    }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge.active { background: #dcfce7; color: #16a34a; }
    .status-badge.frozen { background: #dbeafe; color: #1d4ed8; }
    .status-badge.closed { background: #fee2e2; color: #dc2626; }

    .balance {
      font-weight: 600;
      text-align: right;
    }
  `],
})
export class AccountsListComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);

  readonly isLoading = signal(true);
  readonly accounts = signal<FinancialAccount[]>([]);

  ngOnInit(): void {
    this.loadAccounts();
  }

  private loadAccounts(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        this.accounts.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
