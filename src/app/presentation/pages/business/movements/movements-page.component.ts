/**
 * MovementsPageComponent
 *
 * Historial completo de movimientos de la organizacion con filtros de fecha.
 * EP-SP-011: US-SP-043
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MovementsTableComponent, Movement } from '../../../shared/movements-table/movements-table.component';

@Component({
  selector: 'sp-movements-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MovementsTableComponent],
  template: `
    <div class="sp-business-movements">

      <!-- Header -->
      <div class="sp-business-movements__header">
        <div>
          <h1 class="sp-business-movements__title">Movimientos</h1>
          <p class="sp-business-movements__subtitle">
            Historial de todas las cuentas de la organizacion
          </p>
        </div>
        <div class="sp-business-movements__header-actions">
          <a routerLink="/sp/business/transfers/spei" class="sp-business-movements__btn sp-business-movements__btn--primary">
            + Nueva Transferencia
          </a>
        </div>
      </div>

      <!-- Filtros de fecha -->
      <div class="sp-business-movements__filters">
        <div class="sp-business-movements__filter-group">
          <label class="sp-business-movements__filter-label">Desde</label>
          <input
            type="date"
            [value]="dateFrom()"
            (change)="onDateFromChange($event)"
            class="sp-business-movements__date-input"
          />
        </div>
        <div class="sp-business-movements__filter-group">
          <label class="sp-business-movements__filter-label">Hasta</label>
          <input
            type="date"
            [value]="dateTo()"
            (change)="onDateToChange($event)"
            class="sp-business-movements__date-input"
          />
        </div>
        <div class="sp-business-movements__filter-group">
          <label class="sp-business-movements__filter-label">Cuenta</label>
          <select
            [value]="selectedAccount()"
            (change)="onAccountChange($event)"
            class="sp-business-movements__select">
            <option value="">Todas las cuentas</option>
            @for (acc of accountOptions; track acc.id) {
              <option [value]="acc.id">{{ acc.label }}</option>
            }
          </select>
        </div>
        <div class="sp-business-movements__filter-group">
          <label class="sp-business-movements__filter-label">Tipo</label>
          <select
            [value]="selectedType()"
            (change)="onTypeChange($event)"
            class="sp-business-movements__select">
            <option value="">Todos</option>
            <option value="CREDIT">Cargos (entradas)</option>
            <option value="DEBIT">Abonos (salidas)</option>
          </select>
        </div>
        <button (click)="clearFilters()" class="sp-business-movements__clear-btn">
          Limpiar filtros
        </button>
      </div>

      <!-- Resumen de filtros activos -->
      <div class="sp-business-movements__summary-bar">
        <span class="sp-business-movements__count">
          {{ filteredMovements().length }} movimiento{{ filteredMovements().length !== 1 ? 's' : '' }}
        </span>
        <span class="sp-business-movements__total-credit">
          Entradas: ${{ totalCredit() | number:'1.2-2' }}
        </span>
        <span class="sp-business-movements__total-debit">
          Salidas: ${{ totalDebit() | number:'1.2-2' }}
        </span>
      </div>

      <!-- Tabla -->
      <div class="sp-business-movements__table-wrap">
        <sp-movements-table
          [movements]="filteredMovements()"
          tierMode="business"
          [showFilters]="true"
          [showExport]="true"
        />
      </div>

    </div>
  `,
  styles: [`
    .sp-business-movements { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-business-movements__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .sp-business-movements__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-business-movements__subtitle { font-size: 13px; color: #718096; margin: 0; }
    .sp-business-movements__header-actions { display: flex; gap: 10px; }
    .sp-business-movements__btn {
      padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; text-decoration: none; border: none;
    }
    .sp-business-movements__btn--primary { background: #3182ce; color: white; }
    .sp-business-movements__btn--primary:hover { background: #2b6cb0; }

    /* Filters */
    .sp-business-movements__filters {
      display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;
      background: white; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-business-movements__filter-group { display: flex; flex-direction: column; gap: 4px; }
    .sp-business-movements__filter-label { font-size: 11px; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
    .sp-business-movements__date-input,
    .sp-business-movements__select {
      padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 7px;
      font-size: 13px; outline: none; background: white;
    }
    .sp-business-movements__date-input:focus,
    .sp-business-movements__select:focus { border-color: #3182ce; }
    .sp-business-movements__clear-btn {
      padding: 7px 14px; border: 1px solid #e2e8f0; border-radius: 7px;
      font-size: 12px; cursor: pointer; background: white; color: #718096;
      align-self: flex-end;
    }
    .sp-business-movements__clear-btn:hover { background: #f7fafc; color: #e53e3e; border-color: #fed7d7; }

    /* Summary bar */
    .sp-business-movements__summary-bar {
      display: flex; gap: 16px; align-items: center;
      padding: 10px 16px; background: #f7fafc; border-radius: 8px; margin-bottom: 16px;
      font-size: 13px;
    }
    .sp-business-movements__count { color: #4a5568; font-weight: 600; }
    .sp-business-movements__total-credit { color: #276749; font-weight: 600; }
    .sp-business-movements__total-debit { color: #742a2a; font-weight: 600; }

    /* Table */
    .sp-business-movements__table-wrap {
      background: white; border-radius: 12px; border: 1px solid #e2e8f0;
      overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
  `],
})
export class MovementsPageComponent {
  readonly dateFrom = signal('2026-02-01');
  readonly dateTo = signal('2026-02-26');
  readonly selectedAccount = signal('');
  readonly selectedType = signal('');

  readonly accountOptions = [
    { id: 'acc-master-001', label: 'Cuenta Maestra Principal' },
    { id: 'acc-sub-001', label: 'Subcuenta Operaciones' },
    { id: 'acc-sub-002', label: 'Subcuenta Nomina' },
    { id: 'acc-wallet-001', label: 'Wallet Proveedores' },
  ];

  readonly allMovements = signal<Movement[]>([
    { id: 'm001', date: '2026-02-26T14:30:00Z', type: 'CREDIT', concept: 'Cobro cliente premium', amount: 120_500.00, balance: 3_120_500.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Cliente XYZ SA de CV', account: 'Cuenta Maestra' },
    { id: 'm002', date: '2026-02-26T11:00:00Z', type: 'DEBIT', concept: 'Pago proveedor servicio', amount: 58_000.00, balance: 3_000_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Proveedor ABC', account: 'Cuenta Maestra' },
    { id: 'm003', date: '2026-02-25T16:45:00Z', type: 'DEBIT', concept: 'Nomina quincena febrero', amount: 210_000.00, balance: 3_058_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Multiple destinatarios', account: 'Subcuenta Nomina' },
    { id: 'm004', date: '2026-02-25T09:00:00Z', type: 'CREDIT', concept: 'Deposito socio', amount: 500_000.00, balance: 3_268_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Juan Garcia Soto', account: 'Cuenta Maestra' },
    { id: 'm005', date: '2026-02-24T15:20:00Z', type: 'DEBIT', concept: 'Renta oficinas CDMX', amount: 35_000.00, balance: 2_768_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Inmobiliaria Moderna', account: 'Subcuenta Operaciones' },
    { id: 'm006', date: '2026-02-24T10:10:00Z', type: 'CREDIT', concept: 'Cobranza mensual distribuidores', amount: 280_000.00, balance: 2_803_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Distribuidor Central SA', account: 'Cuenta Maestra' },
    { id: 'm007', date: '2026-02-23T13:00:00Z', type: 'DEBIT', concept: 'Pago IVA SAT', amount: 95_000.00, balance: 2_523_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'SAT', account: 'Subcuenta Operaciones' },
    { id: 'm008', date: '2026-02-23T08:30:00Z', type: 'CREDIT', concept: 'Anticipo proyecto norte', amount: 150_000.00, balance: 2_618_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Constructora del Valle', account: 'Cuenta Maestra' },
    { id: 'm009', date: '2026-02-22T17:00:00Z', type: 'DEBIT', concept: 'Seguro flota vehicular anual', amount: 42_000.00, balance: 2_468_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'GNP Seguros', account: 'Subcuenta Operaciones' },
    { id: 'm010', date: '2026-02-22T12:00:00Z', type: 'CREDIT', concept: 'Venta producto estrella enero', amount: 375_000.00, balance: 2_510_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Cadena Retail Norte SA', account: 'Cuenta Maestra' },
  ]);

  readonly filteredMovements = computed<Movement[]>(() => {
    let result = this.allMovements();
    const type = this.selectedType();
    if (type) {
      result = result.filter((m) => m.type === type);
    }
    return result;
  });

  readonly totalCredit = computed(() =>
    this.filteredMovements()
      .filter((m) => m.type === 'CREDIT')
      .reduce((sum, m) => sum + m.amount, 0)
  );

  readonly totalDebit = computed(() =>
    this.filteredMovements()
      .filter((m) => m.type === 'DEBIT')
      .reduce((sum, m) => sum + m.amount, 0)
  );

  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  onAccountChange(event: Event): void {
    this.selectedAccount.set((event.target as HTMLSelectElement).value);
  }

  onTypeChange(event: Event): void {
    this.selectedType.set((event.target as HTMLSelectElement).value);
  }

  clearFilters(): void {
    this.dateFrom.set('2026-02-01');
    this.dateTo.set('2026-02-26');
    this.selectedAccount.set('');
    this.selectedType.set('');
  }
}
