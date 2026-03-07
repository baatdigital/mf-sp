/**
 * BillPayReconciliationPageComponent
 *
 * Modulo de reconciliacion de pagos BillPay.
 * Muestra pagos con discrepancias entre el sistema interno y el proveedor,
 * permitiendo confirmar o marcar como discrepante cada caso.
 * EP-SP-026
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

type BillPayStatus = 'PENDING_CONFIRMATION' | 'DISCREPANT' | 'CONFIRMED';

interface BillPayReconciliationItem {
  payment_id: string;
  org_id: string;
  provider_name: string;
  account_number: string;
  amount: number;
  fee: number;
  provider_ref: string;
  status: BillPayStatus;
  created_at: string;
}

const STATUS_CONFIG: Record<BillPayStatus, { label: string; bg: string; color: string }> = {
  PENDING_CONFIRMATION: { label: 'Pendiente',    bg: '#fefcbf', color: '#744210' },
  DISCREPANT:           { label: 'Discrepante',  bg: '#fed7d7', color: '#742a2a' },
  CONFIRMED:            { label: 'Confirmado',   bg: '#c6f6d5', color: '#276749' },
};

const MOCK_PAYMENTS: BillPayReconciliationItem[] = [
  {
    payment_id:     'BP-2026-00412',
    org_id:         'ORG-0039',
    provider_name:  'CFE',
    account_number: '1234567890123',
    amount:         850.00,
    fee:            4.25,
    provider_ref:   'CFE-20260226-7741',
    status:         'PENDING_CONFIRMATION',
    created_at:     '2026-02-26T09:15:00Z',
  },
  {
    payment_id:     'BP-2026-00411',
    org_id:         'ORG-0012',
    provider_name:  'Telmex',
    account_number: '0445513229876',
    amount:         520.00,
    fee:            4.16,
    provider_ref:   '',
    status:         'DISCREPANT',
    created_at:     '2026-02-26T08:45:00Z',
  },
  {
    payment_id:     'BP-2026-00410',
    org_id:         'ORG-0055',
    provider_name:  'Telcel',
    account_number: '5512345678',
    amount:         300.00,
    fee:            2.40,
    provider_ref:   'TCL-20260226-0091',
    status:         'CONFIRMED',
    created_at:     '2026-02-26T08:00:00Z',
  },
  {
    payment_id:     'BP-2026-00409',
    org_id:         'ORG-0039',
    provider_name:  'IMSS',
    account_number: 'BEXT-00443-22',
    amount:         1_200.00,
    fee:            0.00,
    provider_ref:   'IMSS-20260226-3321',
    status:         'CONFIRMED',
    created_at:     '2026-02-26T07:30:00Z',
  },
  {
    payment_id:     'BP-2026-00408',
    org_id:         'ORG-0071',
    provider_name:  'IZZI',
    account_number: '8800123456',
    amount:         650.00,
    fee:            4.55,
    provider_ref:   '',
    status:         'DISCREPANT',
    created_at:     '2026-02-25T21:10:00Z',
  },
  {
    payment_id:     'BP-2026-00407',
    org_id:         'ORG-0012',
    provider_name:  'CFE',
    account_number: '9876543210321',
    amount:         1_050.00,
    fee:            5.25,
    provider_ref:   'CFE-20260225-6612',
    status:         'PENDING_CONFIRMATION',
    created_at:     '2026-02-25T20:00:00Z',
  },
];

@Component({
  selector: 'sp-admin-billpay-reconciliation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-admin-billpay-reconciliation">

      <!-- Header -->
      <div class="sp-admin-billpay-reconciliation__header">
        <div>
          <h1 class="sp-admin-billpay-reconciliation__title">Reconciliacion BillPay</h1>
          <p class="sp-admin-billpay-reconciliation__subtitle">
            Pagos de servicios con discrepancias pendientes de resolucion
          </p>
        </div>
        <div class="sp-admin-billpay-reconciliation__header-actions">
          <button class="sp-admin-billpay-reconciliation__btn-secondary" (click)="runReconciliation()">
            ▶ Ejecutar conciliacion
          </button>
          <button class="sp-admin-billpay-reconciliation__btn-primary">
            Exportar reporte
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="sp-admin-billpay-reconciliation__summary">
        <div class="sp-admin-billpay-reconciliation__summary-card sp-admin-billpay-reconciliation__summary-card--warning">
          <span class="sp-admin-billpay-reconciliation__summary-count">{{ pendingCount() }}</span>
          <span class="sp-admin-billpay-reconciliation__summary-label">Pendientes</span>
        </div>
        <div class="sp-admin-billpay-reconciliation__summary-card sp-admin-billpay-reconciliation__summary-card--danger">
          <span class="sp-admin-billpay-reconciliation__summary-count">{{ discrepantCount() }}</span>
          <span class="sp-admin-billpay-reconciliation__summary-label">Discrepantes</span>
        </div>
        <div class="sp-admin-billpay-reconciliation__summary-card sp-admin-billpay-reconciliation__summary-card--success">
          <span class="sp-admin-billpay-reconciliation__summary-count">{{ confirmedTodayCount() }}</span>
          <span class="sp-admin-billpay-reconciliation__summary-label">Confirmados hoy</span>
        </div>
        <div class="sp-admin-billpay-reconciliation__summary-card">
          <span class="sp-admin-billpay-reconciliation__summary-count">
            {{ totalPendingAmount() | currency:'MXN':'symbol':'1.2-2' }}
          </span>
          <span class="sp-admin-billpay-reconciliation__summary-label">Monto pendiente</span>
        </div>
      </div>

      <!-- Tabla -->
      <div class="sp-admin-billpay-reconciliation__table-wrap">
        <div class="sp-admin-billpay-reconciliation__table-header">
          <span class="sp-admin-billpay-reconciliation__table-title">
            Pagos ({{ filteredPayments().length }})
          </span>
          <select class="sp-admin-billpay-reconciliation__filter-select"
                  (change)="onFilterStatus($event)">
            <option value="">Todos los estados</option>
            <option value="PENDING_CONFIRMATION">Pendientes</option>
            <option value="DISCREPANT">Discrepantes</option>
            <option value="CONFIRMED">Confirmados</option>
          </select>
        </div>

        <table class="sp-admin-billpay-reconciliation__table">
          <thead>
            <tr>
              <th>ID Pago</th>
              <th>Fecha</th>
              <th>Org</th>
              <th>Proveedor</th>
              <th>Cuenta</th>
              <th>Monto</th>
              <th>Comision</th>
              <th>Ref. Proveedor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (filteredPayments().length === 0) {
              <tr>
                <td colspan="10" class="sp-admin-billpay-reconciliation__empty">
                  No hay pagos con los filtros actuales.
                </td>
              </tr>
            }
            @for (item of filteredPayments(); track item.payment_id) {
              <tr class="sp-admin-billpay-reconciliation__row">
                <td class="sp-admin-billpay-reconciliation__cell--mono">{{ item.payment_id }}</td>
                <td class="sp-admin-billpay-reconciliation__cell--date">
                  {{ item.created_at | date:'dd/MM/yy HH:mm' }}
                </td>
                <td class="sp-admin-billpay-reconciliation__cell--mono">{{ item.org_id }}</td>
                <td class="sp-admin-billpay-reconciliation__cell--name">{{ item.provider_name }}</td>
                <td class="sp-admin-billpay-reconciliation__cell--mono">{{ item.account_number }}</td>
                <td class="sp-admin-billpay-reconciliation__cell--amount">
                  {{ item.amount | currency:'MXN':'symbol':'1.2-2' }}
                </td>
                <td class="sp-admin-billpay-reconciliation__cell--fee">
                  {{ item.fee | currency:'MXN':'symbol':'1.2-2' }}
                </td>
                <td class="sp-admin-billpay-reconciliation__cell--ref">
                  {{ item.provider_ref || '—' }}
                </td>
                <td>
                  <span class="sp-admin-billpay-reconciliation__status-badge"
                        [style.background]="statusCfg(item.status).bg"
                        [style.color]="statusCfg(item.status).color">
                    {{ statusCfg(item.status).label }}
                  </span>
                </td>
                <td>
                  <div class="sp-admin-billpay-reconciliation__actions">
                    @if (item.status !== 'CONFIRMED') {
                      <button
                        class="sp-admin-billpay-reconciliation__action-btn sp-admin-billpay-reconciliation__action-btn--confirm"
                        (click)="confirm(item)">
                        Confirmar
                      </button>
                    }
                    @if (item.status !== 'DISCREPANT') {
                      <button
                        class="sp-admin-billpay-reconciliation__action-btn sp-admin-billpay-reconciliation__action-btn--discrepant"
                        (click)="markDiscrepant(item)">
                        Discrepante
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .sp-admin-billpay-reconciliation {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1400px;
    }

    /* Header */
    .sp-admin-billpay-reconciliation__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .sp-admin-billpay-reconciliation__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-billpay-reconciliation__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }
    .sp-admin-billpay-reconciliation__header-actions { display: flex; gap: 8px; }
    .sp-admin-billpay-reconciliation__btn-primary {
      padding: 8px 16px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-billpay-reconciliation__btn-primary:hover { background: #2b6cb0; }
    .sp-admin-billpay-reconciliation__btn-secondary {
      padding: 8px 16px;
      background: white;
      color: #4a5568;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .sp-admin-billpay-reconciliation__btn-secondary:hover { background: #f7fafc; }

    /* Summary */
    .sp-admin-billpay-reconciliation__summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .sp-admin-billpay-reconciliation__summary-card {
      flex: 1;
      min-width: 140px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .sp-admin-billpay-reconciliation__summary-card--warning { border-left: 4px solid #d69e2e; }
    .sp-admin-billpay-reconciliation__summary-card--danger  { border-left: 4px solid #e53e3e; }
    .sp-admin-billpay-reconciliation__summary-card--success { border-left: 4px solid #38a169; }
    .sp-admin-billpay-reconciliation__summary-count {
      font-size: 26px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-billpay-reconciliation__summary-label { font-size: 12px; color: #718096; }

    /* Table */
    .sp-admin-billpay-reconciliation__table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-billpay-reconciliation__table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-admin-billpay-reconciliation__table-title { font-size: 15px; font-weight: 600; color: #2d3748; }
    .sp-admin-billpay-reconciliation__filter-select {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
    .sp-admin-billpay-reconciliation__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-billpay-reconciliation__table thead tr { background: #f7fafc; }
    .sp-admin-billpay-reconciliation__table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .sp-admin-billpay-reconciliation__table td {
      padding: 12px 14px;
      border-top: 1px solid #f0f4f8;
      color: #2d3748;
      vertical-align: middle;
    }
    .sp-admin-billpay-reconciliation__row:hover { background: #f7fafc; }
    .sp-admin-billpay-reconciliation__empty {
      text-align: center;
      padding: 32px !important;
      color: #a0aec0;
    }

    /* Cells */
    .sp-admin-billpay-reconciliation__cell--mono   { font-family: monospace; font-size: 11px; color: #718096; }
    .sp-admin-billpay-reconciliation__cell--date   { white-space: nowrap; color: #718096; font-size: 12px; }
    .sp-admin-billpay-reconciliation__cell--name   { font-weight: 600; }
    .sp-admin-billpay-reconciliation__cell--amount { font-weight: 700; }
    .sp-admin-billpay-reconciliation__cell--fee    { color: #718096; }
    .sp-admin-billpay-reconciliation__cell--ref    { font-family: monospace; font-size: 11px; }

    /* Status badge */
    .sp-admin-billpay-reconciliation__status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Actions */
    .sp-admin-billpay-reconciliation__actions { display: flex; gap: 4px; }
    .sp-admin-billpay-reconciliation__action-btn {
      padding: 4px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 11px;
      color: #4a5568;
      white-space: nowrap;
    }
    .sp-admin-billpay-reconciliation__action-btn:hover { background: #f7fafc; }
    .sp-admin-billpay-reconciliation__action-btn--confirm {
      background: #f0fff4;
      border-color: #9ae6b4;
      color: #276749;
      font-weight: 600;
    }
    .sp-admin-billpay-reconciliation__action-btn--confirm:hover { background: #c6f6d5; }
    .sp-admin-billpay-reconciliation__action-btn--discrepant {
      background: #fff5f5;
      border-color: #feb2b2;
      color: #742a2a;
      font-weight: 600;
    }
    .sp-admin-billpay-reconciliation__action-btn--discrepant:hover { background: #fed7d7; }
  `],
})
export class BillPayReconciliationPageComponent {

  readonly filterStatus = signal<BillPayStatus | ''>('');

  readonly payments = signal<BillPayReconciliationItem[]>(MOCK_PAYMENTS);

  readonly filteredPayments = computed(() => {
    const status = this.filterStatus();
    if (!status) return this.payments();
    return this.payments().filter((p) => p.status === status);
  });

  readonly pendingCount = computed(() =>
    this.payments().filter((p) => p.status === 'PENDING_CONFIRMATION').length,
  );

  readonly discrepantCount = computed(() =>
    this.payments().filter((p) => p.status === 'DISCREPANT').length,
  );

  readonly confirmedTodayCount = computed(() =>
    this.payments().filter((p) => p.status === 'CONFIRMED').length,
  );

  readonly totalPendingAmount = computed(() =>
    this.payments()
      .filter((p) => p.status === 'PENDING_CONFIRMATION' || p.status === 'DISCREPANT')
      .reduce((sum, p) => sum + p.amount, 0),
  );

  statusCfg(status: BillPayStatus) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING_CONFIRMATION'];
  }

  onFilterStatus(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as BillPayStatus | '';
    this.filterStatus.set(val);
  }

  confirm(item: BillPayReconciliationItem): void {
    this.payments.update((items) =>
      items.map((p) =>
        p.payment_id === item.payment_id
          ? { ...p, status: 'CONFIRMED' as BillPayStatus }
          : p,
      ),
    );
    console.log('[BillPayReconciliation] Pago confirmado:', item.payment_id);
  }

  markDiscrepant(item: BillPayReconciliationItem): void {
    this.payments.update((items) =>
      items.map((p) =>
        p.payment_id === item.payment_id
          ? { ...p, status: 'DISCREPANT' as BillPayStatus }
          : p,
      ),
    );
    console.log('[BillPayReconciliation] Pago marcado como discrepante:', item.payment_id);
  }

  runReconciliation(): void {
    console.log('[BillPayReconciliation] Ejecutando conciliacion de pagos BillPay...');
  }
}
