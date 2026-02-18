import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { LedgerEntry, EntryType } from '../../../domain/models/ledger-entry.model';

@Component({
  selector: 'sp-movements-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="movements-table-container">

      <!-- Loading skeleton -->
      <ng-container *ngIf="isLoading">
        <table class="movements-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th *ngIf="showAccountColumn">Cuenta</th>
              <th>Monto</th>
              <th>Saldo tras mov.</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let i of skeletonRows" class="skeleton-row">
              <td><div class="skeleton-cell"></div></td>
              <td><div class="skeleton-cell skeleton-badge"></div></td>
              <td><div class="skeleton-cell skeleton-wide"></div></td>
              <td *ngIf="showAccountColumn"><div class="skeleton-cell"></div></td>
              <td><div class="skeleton-cell skeleton-amount"></div></td>
              <td><div class="skeleton-cell skeleton-amount"></div></td>
            </tr>
          </tbody>
        </table>
      </ng-container>

      <!-- Empty state -->
      <ng-container *ngIf="!isLoading && entries.length === 0">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p class="empty-title">Sin movimientos</p>
          <p class="empty-subtitle">No hay movimientos registrados para esta cuenta.</p>
        </div>
      </ng-container>

      <!-- Data table -->
      <ng-container *ngIf="!isLoading && entries.length > 0">
        <table class="movements-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th *ngIf="showAccountColumn">Cuenta</th>
              <th class="text-right">Monto</th>
              <th class="text-right">Saldo tras mov.</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of pagedEntries; trackBy: trackById">
              <td class="date-cell">
                {{ entry.created_at | date:'dd/MM/yyyy HH:mm' }}
              </td>
              <td>
                <span [class]="getBadgeClass(entry.entry_type)">
                  {{ entry.entry_type === 'CREDIT' ? 'Crédito' : 'Débito' }}
                </span>
              </td>
              <td class="description-cell">
                <span class="concept">{{ entry.concept }}</span>
                <span class="category">{{ entry.category }}</span>
              </td>
              <td *ngIf="showAccountColumn" class="account-cell">
                {{ entry.account_id | slice:0:8 }}...
              </td>
              <td class="amount-cell" [class]="getAmountClass(entry.entry_type)">
                {{ getAmountPrefix(entry.entry_type) }}{{ entry.amount | currency:'MXN':'symbol':'1.2-2' }}
              </td>
              <td class="amount-cell balance-after">
                {{ entry.balance_after | currency:'MXN':'symbol':'1.2-2' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination info -->
        <div class="pagination-info" *ngIf="entries.length > pageSize">
          <span>Mostrando {{ pagedEntries.length }} de {{ entries.length }} movimientos</span>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .movements-table-container {
      width: 100%;
      overflow-x: auto;
    }

    .movements-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .movements-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: #374151;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
      white-space: nowrap;
    }

    .movements-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: middle;
    }

    .movements-table tbody tr:hover {
      background: #F9FAFB;
    }

    .text-right { text-align: right; }

    /* Type badges */
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-credit {
      background: #D1FAE5;
      color: #065F46;
    }

    .badge-debit {
      background: #FEE2E2;
      color: #991B1B;
    }

    /* Amount colors */
    .amount-cell { text-align: right; font-variant-numeric: tabular-nums; }
    .amount-credit { color: #059669; font-weight: 600; }
    .amount-debit  { color: #DC2626; font-weight: 600; }

    .balance-after { color: #374151; font-weight: 500; }

    /* Description */
    .description-cell { max-width: 240px; }
    .concept { display: block; color: #111827; }
    .category {
      display: block;
      font-size: 0.75rem;
      color: #6B7280;
      text-transform: uppercase;
    }

    .date-cell { white-space: nowrap; color: #6B7280; }
    .account-cell { font-family: monospace; font-size: 0.8rem; color: #6B7280; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      color: #9CA3AF;
    }

    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-title { font-size: 1rem; font-weight: 600; color: #374151; margin: 0; }
    .empty-subtitle { font-size: 0.875rem; margin: 0.25rem 0 0; text-align: center; }

    /* Skeleton */
    .skeleton-row td { padding: 0.85rem 1rem; }
    .skeleton-cell {
      height: 1rem;
      background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 4px;
      width: 80px;
    }
    .skeleton-badge { width: 60px; height: 1.25rem; border-radius: 9999px; }
    .skeleton-wide  { width: 200px; }
    .skeleton-amount { width: 90px; margin-left: auto; }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .pagination-info {
      padding: 0.75rem 1rem;
      font-size: 0.8125rem;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
      text-align: right;
    }
  `],
})
export class MovementsTableComponent {
  @Input() entries: LedgerEntry[] = [];
  @Input() isLoading = false;
  @Input() showAccountColumn = false;
  @Input() pageSize = 10;

  readonly skeletonRows = [1, 2, 3];

  get pagedEntries(): LedgerEntry[] {
    return this.entries.slice(0, this.pageSize);
  }

  getBadgeClass(type: EntryType): string {
    return type === 'CREDIT' ? 'badge badge-credit' : 'badge badge-debit';
  }

  getAmountClass(type: EntryType): string {
    return type === 'CREDIT' ? 'amount-cell amount-credit' : 'amount-cell amount-debit';
  }

  getAmountPrefix(type: EntryType): string {
    return type === 'CREDIT' ? '+' : '-';
  }

  trackById(_index: number, entry: LedgerEntry): string {
    return entry.entry_id;
  }
}
