import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  FinancialAccount,
  AccountStatus,
} from '../../../domain/models/financial-account.model';

@Component({
  selector: 'sp-account-detail-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="detail-card">

      <!-- Loading skeleton -->
      <ng-container *ngIf="isLoading">
        <div class="card-body">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-subtitle"></div>
          <div class="skeleton-line skeleton-balance"></div>
          <div class="balance-row">
            <div class="skeleton-line skeleton-label"></div>
            <div class="skeleton-line skeleton-label"></div>
          </div>
        </div>
      </ng-container>

      <!-- No account -->
      <ng-container *ngIf="!isLoading && account === null">
        <div class="card-empty">
          <span class="empty-icon">🏦</span>
          <p>Selecciona una cuenta para ver sus detalles.</p>
        </div>
      </ng-container>

      <!-- Account data -->
      <ng-container *ngIf="!isLoading && account !== null">

        <!-- Header -->
        <div class="card-header">
          <div class="header-left">
            <h3 class="account-name">{{ account!.name ?? account!.account_type }}</h3>
            <span class="account-type-label">{{ account!.account_type }}</span>
          </div>
          <div class="header-right">
            <span [class]="getStatusClass(account!.status)">
              {{ getStatusLabel(account!.status) }}
            </span>
            <button
              class="refresh-btn"
              (click)="onRefresh()"
              title="Actualizar saldo"
              aria-label="Actualizar saldo"
            >
              ↻
            </button>
          </div>
        </div>

        <!-- Account ID -->
        <div class="card-body">
          <div class="id-row">
            <span class="id-label">ID de Cuenta:</span>
            <span class="id-value">{{ account!.account_id }}</span>
          </div>

          <div class="id-row" *ngIf="account!.clabe">
            <span class="id-label">CLABE:</span>
            <span class="id-value clabe">{{ account!.clabe }}</span>
          </div>

          <div class="id-row" *ngIf="account!.organization_id">
            <span class="id-label">Organización:</span>
            <span class="id-value">{{ account!.organization_id | slice:0:12 }}...</span>
          </div>
        </div>

        <!-- Balances -->
        <div class="balance-section">
          <!-- Available balance (large) -->
          <div class="balance-main">
            <span class="balance-main-label">Saldo Disponible</span>
            <span class="balance-main-value">
              {{ availableBalance | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>

          <div class="balance-row">
            <!-- Pending balance -->
            <div class="balance-item">
              <span class="balance-item-label">En proceso</span>
              <span class="balance-item-value balance-pending">
                {{ pendingBalance | currency:'MXN':'symbol':'1.2-2' }}
              </span>
            </div>

            <!-- Total -->
            <div class="balance-item">
              <span class="balance-item-label">Total</span>
              <span class="balance-item-value balance-total">
                {{ totalBalance | currency:'MXN':'symbol':'1.2-2' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer" *ngIf="account!.updated_at">
          <span class="footer-text">
            Actualizado: {{ account!.updated_at | date:'dd/MM/yyyy HH:mm' }}
          </span>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .detail-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      overflow: hidden;
    }

    /* Header */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #F3F4F6;
    }

    .header-left { display: flex; flex-direction: column; gap: 0.2rem; }
    .header-right { display: flex; align-items: center; gap: 0.5rem; }

    .account-name { margin: 0; font-size: 1rem; font-weight: 600; color: #111827; }
    .account-type-label { font-size: 0.75rem; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Status badges */
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-active { background: #D1FAE5; color: #065F46; }
    .badge-frozen { background: #FEF3C7; color: #92400E; }
    .badge-closed { background: #F3F4F6; color: #6B7280; }

    /* Refresh button */
    .refresh-btn {
      background: none;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      cursor: pointer;
      color: #6B7280;
      transition: all 0.15s;
    }
    .refresh-btn:hover { background: #F3F4F6; color: #374151; }

    /* Body */
    .card-body { padding: 0.875rem 1.25rem; border-bottom: 1px solid #F3F4F6; }

    .id-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.2rem 0;
    }
    .id-label { font-size: 0.8125rem; color: #6B7280; min-width: 100px; }
    .id-value { font-size: 0.8125rem; color: #111827; font-family: monospace; word-break: break-all; }
    .clabe { letter-spacing: 0.05em; }

    /* Balance section */
    .balance-section { padding: 1rem 1.25rem; }

    .balance-main {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .balance-main-label { font-size: 0.8125rem; color: #6B7280; font-weight: 500; }
    .balance-main-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
    }

    .balance-row {
      display: flex;
      gap: 1.5rem;
    }

    .balance-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .balance-item-label { font-size: 0.75rem; color: #9CA3AF; }
    .balance-item-value { font-size: 0.875rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .balance-pending { color: #D97706; }
    .balance-total { color: #374151; }

    /* Footer */
    .card-footer {
      padding: 0.625rem 1.25rem;
      background: #F9FAFB;
      border-top: 1px solid #F3F4F6;
    }
    .footer-text { font-size: 0.75rem; color: #9CA3AF; }

    /* Empty */
    .card-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
      color: #9CA3AF;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .empty-icon { font-size: 2rem; }

    /* Skeleton */
    .skeleton-line {
      height: 1rem;
      background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }
    .skeleton-title { width: 55%; height: 1.25rem; }
    .skeleton-subtitle { width: 35%; }
    .skeleton-balance { width: 45%; height: 1.75rem; margin-top: 0.75rem; }
    .skeleton-label { width: 80px; }
    .balance-row { display: flex; gap: 1rem; }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class AccountDetailCardComponent {
  @Input() account: FinancialAccount | null = null;
  @Input() availableBalance = 0;
  @Input() pendingBalance = 0;
  @Input() isLoading = false;
  @Output() refreshRequested = new EventEmitter<void>();

  get totalBalance(): number {
    return this.availableBalance + this.pendingBalance;
  }

  onRefresh(): void {
    this.refreshRequested.emit();
  }

  getStatusClass(status: AccountStatus): string {
    const map: Record<AccountStatus, string> = {
      ACTIVE: 'badge badge-active',
      FROZEN: 'badge badge-frozen',
      CLOSED: 'badge badge-closed',
    };
    return map[status];
  }

  getStatusLabel(status: AccountStatus): string {
    const map: Record<AccountStatus, string> = {
      ACTIVE: 'Activa',
      FROZEN: 'Congelada',
      CLOSED: 'Cerrada',
    };
    return map[status];
  }
}
