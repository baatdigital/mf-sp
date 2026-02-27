/**
 * AccountsPageComponent
 *
 * Lista de cuentas de la organizacion con balance y estado.
 * EP-SP-011: US-SP-037
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PENDING';
export type AccountType = 'MASTER' | 'SUB' | 'WALLET' | 'VIRTUAL';

interface OrgAccount {
  id: string;
  label: string;
  clabe: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  type: AccountType;
  parent_id?: string;
  children_count: number;
}

const STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: 'Activa',
  FROZEN: 'Congelada',
  CLOSED: 'Cerrada',
  PENDING: 'Pendiente',
};

const STATUS_STYLES: Record<AccountStatus, string> = {
  ACTIVE: 'background:#c6f6d5;color:#276749',
  FROZEN: 'background:#bee3f8;color:#2a4365',
  CLOSED: 'background:#fed7d7;color:#742a2a',
  PENDING: 'background:#fefcbf;color:#744210',
};

const TYPE_LABELS: Record<AccountType, string> = {
  MASTER: 'Maestra',
  SUB: 'Subcuenta',
  WALLET: 'Wallet',
  VIRTUAL: 'Virtual',
};

@Component({
  selector: 'sp-business-accounts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <div class="sp-business-accounts">

      <!-- Header -->
      <div class="sp-business-accounts__header">
        <div>
          <h1 class="sp-business-accounts__title">Cuentas</h1>
          <p class="sp-business-accounts__subtitle">{{ totalAccounts() }} cuentas · Saldo total: {{ totalBalance() | currency:'MXN':'symbol':'1.2-2' }}</p>
        </div>
        <div class="sp-business-accounts__header-actions">
          <a routerLink="/sp/business/accounts/tree" class="sp-business-accounts__btn sp-business-accounts__btn--secondary">
            Ver arbol
          </a>
          <a routerLink="/sp/business/accounts/new" class="sp-business-accounts__btn sp-business-accounts__btn--primary">
            + Nueva Cuenta
          </a>
        </div>
      </div>

      <!-- Filtros de estado -->
      <div class="sp-business-accounts__filters">
        <button
          [class]="'sp-business-accounts__filter-btn' + (activeFilter() === null ? ' active' : '')"
          (click)="activeFilter.set(null)">
          Todas ({{ accounts().length }})
        </button>
        @for (status of statuses; track status) {
          <button
            [class]="'sp-business-accounts__filter-btn' + (activeFilter() === status ? ' active' : '')"
            (click)="activeFilter.set(status)">
            {{ statusLabel(status) }}
          </button>
        }
      </div>

      <!-- Grid de cuentas -->
      @if (filteredAccounts().length === 0) {
        <div class="sp-business-accounts__empty">
          <p>No hay cuentas con el filtro seleccionado</p>
        </div>
      } @else {
        <div class="sp-business-accounts__grid">
          @for (account of filteredAccounts(); track account.id) {
            <a
              [routerLink]="['/sp/business/accounts', account.id]"
              class="sp-business-accounts__card">
              <div class="sp-business-accounts__card-top">
                <div>
                  <span class="sp-business-accounts__account-label">{{ account.label }}</span>
                  <span class="sp-business-accounts__account-type">{{ typeLabel(account.type) }}</span>
                </div>
                <span [style]="statusStyle(account.status)" class="sp-business-accounts__status-badge">
                  {{ statusLabel(account.status) }}
                </span>
              </div>
              <div class="sp-business-accounts__card-clabe">{{ account.clabe }}</div>
              <div class="sp-business-accounts__card-balance">
                {{ account.balance | currency:account.currency:'symbol':'1.2-2' }}
              </div>
              @if (account.children_count > 0) {
                <div class="sp-business-accounts__card-children">
                  {{ account.children_count }} subcuenta{{ account.children_count !== 1 ? 's' : '' }}
                </div>
              }
            </a>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-business-accounts { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-business-accounts__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .sp-business-accounts__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-business-accounts__subtitle { font-size: 13px; color: #718096; margin: 0; }
    .sp-business-accounts__header-actions { display: flex; gap: 10px; }

    /* Buttons */
    .sp-business-accounts__btn {
      padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; text-decoration: none; border: none; display: inline-flex; align-items: center;
    }
    .sp-business-accounts__btn--primary { background: #3182ce; color: white; }
    .sp-business-accounts__btn--primary:hover { background: #2b6cb0; }
    .sp-business-accounts__btn--secondary { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-business-accounts__btn--secondary:hover { background: #f7fafc; }

    /* Filters */
    .sp-business-accounts__filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .sp-business-accounts__filter-btn {
      padding: 5px 14px; border: 1px solid #e2e8f0; border-radius: 20px;
      font-size: 12px; cursor: pointer; background: white; color: #4a5568;
    }
    .sp-business-accounts__filter-btn.active { background: #3182ce; color: white; border-color: #3182ce; }

    /* Grid */
    .sp-business-accounts__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }

    /* Card */
    .sp-business-accounts__card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 18px; display: flex; flex-direction: column; gap: 8px;
      text-decoration: none; cursor: pointer; transition: all 0.15s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-business-accounts__card:hover { border-color: #90cdf4; box-shadow: 0 4px 12px rgba(49,130,206,0.1); transform: translateY(-1px); }
    .sp-business-accounts__card-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .sp-business-accounts__account-label { font-size: 14px; font-weight: 700; color: #2d3748; display: block; }
    .sp-business-accounts__account-type { font-size: 11px; color: #a0aec0; }
    .sp-business-accounts__status-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
    .sp-business-accounts__card-clabe { font-size: 11px; color: #a0aec0; font-family: monospace; }
    .sp-business-accounts__card-balance { font-size: 20px; font-weight: 700; color: #1a202c; }
    .sp-business-accounts__card-children { font-size: 11px; color: #718096; }

    /* Empty */
    .sp-business-accounts__empty { text-align: center; padding: 48px; color: #a0aec0; }
  `],
})
export class AccountsPageComponent {
  readonly statuses: AccountStatus[] = ['ACTIVE', 'FROZEN', 'CLOSED', 'PENDING'];
  readonly activeFilter = signal<AccountStatus | null>(null);

  readonly accounts = signal<OrgAccount[]>([
    {
      id: 'acc-master-001',
      label: 'Cuenta Maestra Principal',
      clabe: '646180110400000001',
      balance: 3_120_500.00,
      currency: 'MXN',
      status: 'ACTIVE',
      type: 'MASTER',
      children_count: 3,
    },
    {
      id: 'acc-sub-001',
      label: 'Subcuenta Operaciones',
      clabe: '646180110400000002',
      balance: 854_200.50,
      currency: 'MXN',
      status: 'ACTIVE',
      type: 'SUB',
      parent_id: 'acc-master-001',
      children_count: 0,
    },
    {
      id: 'acc-sub-002',
      label: 'Subcuenta Nomina',
      clabe: '646180110400000003',
      balance: 420_000.00,
      currency: 'MXN',
      status: 'ACTIVE',
      type: 'SUB',
      parent_id: 'acc-master-001',
      children_count: 0,
    },
    {
      id: 'acc-wallet-001',
      label: 'Wallet Proveedores',
      clabe: '646180110400000004',
      balance: 75_650.25,
      currency: 'MXN',
      status: 'FROZEN',
      type: 'WALLET',
      parent_id: 'acc-master-001',
      children_count: 0,
    },
  ]);

  readonly filteredAccounts = computed(() => {
    const filter = this.activeFilter();
    if (!filter) return this.accounts();
    return this.accounts().filter((a) => a.status === filter);
  });

  readonly totalAccounts = computed(() => this.accounts().length);

  readonly totalBalance = computed(() =>
    this.accounts()
      .filter((a) => a.status === 'ACTIVE')
      .reduce((sum, a) => sum + a.balance, 0)
  );

  statusLabel(status: AccountStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusStyle(status: AccountStatus): string {
    return STATUS_STYLES[status] ?? '';
  }

  typeLabel(type: AccountType): string {
    return TYPE_LABELS[type] ?? type;
  }
}
