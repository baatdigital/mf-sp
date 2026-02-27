/**
 * MovementsTableComponent
 *
 * Tabla de movimientos reutilizable entre los 3 tiers.
 * EP-SP-013: US-SP-047
 *
 * Configurada por tier (admin=todas las columnas, personal=minimas).
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

export type TierMode = 'admin' | 'business' | 'personal';

export type MovementColumn =
  | 'date'
  | 'type'
  | 'account'
  | 'counterpart'
  | 'concept'
  | 'reference'
  | 'amount'
  | 'balance'
  | 'status'
  | 'organization';

export interface Movement {
  id: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  entry_type?: string;
  account?: string;
  account_id?: string;
  counterpart?: string;
  concept: string;
  reference?: string;
  amount: number;
  balance?: number;
  status: string;
  organization?: string;
  category?: string;
  currency: string;
}

export interface MovementsFilter {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  status?: string;
  search?: string;
  accountId?: string;
}

const COLUMNS_BY_TIER: Record<TierMode, MovementColumn[]> = {
  admin: ['date', 'type', 'account', 'counterpart', 'concept', 'reference', 'amount', 'balance', 'status', 'organization'],
  business: ['date', 'type', 'account', 'counterpart', 'concept', 'reference', 'amount', 'balance', 'status'],
  personal: ['date', 'concept', 'amount', 'status'],
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  REVERSED: 'Revertido',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d69e2e',
  CONFIRMED: '#38a169',
  COMPLETED: '#38a169',
  REVERSED: '#718096',
  PROCESSING: '#3182ce',
  FAILED: '#e53e3e',
};

@Component({
  selector: 'sp-movements-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-movements-table">
      <!-- Filtros -->
      @if (showFilters()) {
        <div class="sp-movements-table__filters">
          <input
            type="text"
            placeholder="Buscar..."
            class="sp-movements-table__search"
            (input)="onSearchChange($event)"
          />
          <select class="sp-movements-table__select" (change)="onTypeChange($event)">
            <option value="">Todos los tipos</option>
            <option value="CREDIT">Depositos</option>
            <option value="DEBIT">Retiros</option>
          </select>
          <select class="sp-movements-table__select" (change)="onStatusChange($event)">
            <option value="">Todos los estados</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="PENDING">Pendientes</option>
            <option value="FAILED">Fallidos</option>
          </select>
          @if (showExport()) {
            <button class="sp-movements-table__export-btn" (click)="exportRequest.emit('csv')">
              Exportar CSV
            </button>
          }
        </div>
      }

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="sp-movements-table__skeleton">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="sp-movements-table__skeleton-row"></div>
          }
        </div>
      } @else {
        <!-- Desktop table -->
        <div class="sp-movements-table__wrapper">
          <table class="sp-movements-table__table">
            <thead>
              <tr>
                @for (col of activeColumns(); track col) {
                  <th>{{ columnLabel(col) }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (m of movements(); track m.id) {
                <tr (click)="movementClick.emit(m)" class="sp-movements-table__row">
                  @for (col of activeColumns(); track col) {
                    <td>
                      @switch (col) {
                        @case ('date') {
                          <span class="sp-movements-table__date">
                            {{ m.date | date:'dd/MM/yy HH:mm' }}
                          </span>
                        }
                        @case ('type') {
                          <span [class]="'sp-movements-table__type sp-movements-table__type--' + m.type.toLowerCase()">
                            {{ m.type === 'CREDIT' ? '↑' : '↓' }} {{ m.type === 'CREDIT' ? 'Deposito' : 'Retiro' }}
                          </span>
                        }
                        @case ('amount') {
                          <span [class]="'sp-movements-table__amount sp-movements-table__amount--' + m.type.toLowerCase()">
                            {{ m.type === 'CREDIT' ? '+' : '-' }}{{ m.amount | currency:'MXN':'symbol':'1.2-2' }}
                          </span>
                        }
                        @case ('balance') {
                          <span class="sp-movements-table__balance">
                            {{ (m.balance ?? 0) | currency:'MXN':'symbol':'1.2-2' }}
                          </span>
                        }
                        @case ('status') {
                          <span
                            class="sp-movements-table__status"
                            [style.background]="statusBg(m.status)"
                            [style.color]="statusColor(m.status)"
                          >
                            {{ statusLabel(m.status) }}
                          </span>
                        }
                        @case ('concept') { <span>{{ m.concept }}</span> }
                        @case ('reference') { <span class="sp-movements-table__ref">{{ m.reference ?? '—' }}</span> }
                        @case ('account') { <span>{{ m.account ?? '—' }}</span> }
                        @case ('counterpart') { <span>{{ m.counterpart ?? '—' }}</span> }
                        @case ('organization') { <span>{{ m.organization ?? '—' }}</span> }
                      }
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="activeColumns().length" class="sp-movements-table__empty">
                    Sin movimientos
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Subtotales -->
        @if (showSubtotals()) {
          <div class="sp-movements-table__subtotals">
            <span>Depositos: <strong>{{ totalCredits() | currency:'MXN':'symbol':'1.2-2' }}</strong></span>
            <span>Retiros: <strong>{{ totalDebits() | currency:'MXN':'symbol':'1.2-2' }}</strong></span>
          </div>
        }

        <!-- Paginacion -->
        <div class="sp-movements-table__pagination">
          <button [disabled]="currentPage() <= 1" (click)="prevPage()">←</button>
          <span>Pag. {{ currentPage() }}</span>
          <button [disabled]="!hasMore()" (click)="nextPage()">→</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .sp-movements-table { font-family: system-ui, sans-serif; font-size: 14px; }
    .sp-movements-table__filters {
      display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;
    }
    .sp-movements-table__search, .sp-movements-table__select {
      padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 13px; outline: none;
    }
    .sp-movements-table__export-btn {
      margin-left: auto; padding: 6px 12px; background: #3182ce; color: white;
      border: none; border-radius: 6px; cursor: pointer; font-size: 13px;
    }
    .sp-movements-table__wrapper { overflow-x: auto; }
    .sp-movements-table__table { width: 100%; border-collapse: collapse; }
    .sp-movements-table__table th {
      text-align: left; padding: 8px 12px; background: #f7fafc;
      border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #4a5568; white-space: nowrap;
    }
    .sp-movements-table__table td {
      padding: 10px 12px; border-bottom: 1px solid #f0f4f8;
    }
    .sp-movements-table__row { cursor: pointer; transition: background 0.1s; }
    .sp-movements-table__row:hover { background: #f7fafc; }
    .sp-movements-table__type--credit { color: #38a169; }
    .sp-movements-table__type--debit { color: #e53e3e; }
    .sp-movements-table__amount--credit { color: #38a169; font-weight: 600; }
    .sp-movements-table__amount--debit { color: #e53e3e; font-weight: 600; }
    .sp-movements-table__status {
      display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;
    }
    .sp-movements-table__ref { color: #718096; font-size: 12px; }
    .sp-movements-table__date { color: #4a5568; }
    .sp-movements-table__empty { text-align: center; padding: 40px; color: #718096; }
    .sp-movements-table__subtotals {
      display: flex; gap: 24px; padding: 10px 12px;
      background: #f7fafc; border-top: 1px solid #e2e8f0; font-size: 13px;
    }
    .sp-movements-table__pagination {
      display: flex; align-items: center; gap: 12px; justify-content: flex-end;
      padding: 10px 12px; font-size: 13px;
    }
    .sp-movements-table__pagination button {
      padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 4px;
      background: white; cursor: pointer;
    }
    .sp-movements-table__pagination button:disabled { opacity: 0.4; cursor: default; }
    .sp-movements-table__skeleton { display: flex; flex-direction: column; gap: 8px; }
    .sp-movements-table__skeleton-row {
      height: 40px; background: linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `],
})
export class MovementsTableComponent {
  // Inputs
  movements = input<Movement[]>([]);
  columns = input<MovementColumn[]>([]);
  tierMode = input<TierMode>('business');
  showFilters = input(true);
  showExport = input(false);
  showSubtotals = input(false);
  pageSize = input(20);
  loading = input(false);

  // Outputs
  filterChange = output<MovementsFilter>();
  pageChange = output<number>();
  movementClick = output<Movement>();
  exportRequest = output<'csv' | 'pdf'>();

  // Internal state
  private _page = 1;

  readonly activeColumns = computed<MovementColumn[]>(() => {
    const custom = this.columns();
    return custom.length > 0 ? custom : COLUMNS_BY_TIER[this.tierMode()];
  });

  readonly totalCredits = computed(() =>
    this.movements()
      .filter((m) => m.type === 'CREDIT')
      .reduce((sum, m) => sum + m.amount, 0),
  );

  readonly totalDebits = computed(() =>
    this.movements()
      .filter((m) => m.type === 'DEBIT')
      .reduce((sum, m) => sum + m.amount, 0),
  );

  readonly currentPage = computed(() => this._page);
  readonly hasMore = computed(() => this.movements().length >= this.pageSize());

  columnLabel(col: MovementColumn): string {
    const labels: Record<MovementColumn, string> = {
      date: 'Fecha',
      type: 'Tipo',
      account: 'Cuenta',
      counterpart: 'Contraparte',
      concept: 'Concepto',
      reference: 'Referencia',
      amount: 'Monto',
      balance: 'Saldo',
      status: 'Estado',
      organization: 'Organizacion',
    };
    return labels[col] ?? col;
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusColor(status: string): string {
    return STATUS_COLORS[status] ?? '#718096';
  }

  statusBg(status: string): string {
    const color = STATUS_COLORS[status] ?? '#718096';
    return color + '20'; // 20% opacity as background
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterChange.emit({ search: value });
  }

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterChange.emit({ type: value || undefined });
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterChange.emit({ status: value || undefined });
  }

  prevPage(): void {
    if (this._page > 1) {
      this._page--;
      this.pageChange.emit(this._page);
    }
  }

  nextPage(): void {
    this._page++;
    this.pageChange.emit(this._page);
  }
}
