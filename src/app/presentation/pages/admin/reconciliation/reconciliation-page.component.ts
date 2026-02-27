/**
 * ReconciliationPageComponent
 *
 * Modulo de reconciliacion de transferencias SPEI.
 * Muestra discrepancias entre el libro interno y los registros del proveedor,
 * permitiendo resolver cada caso individualmente.
 * EP-SP-008 US-SP-033
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

type DiscrepancyStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
type DiscrepancyType = 'AMOUNT_MISMATCH' | 'MISSING_CREDIT' | 'DUPLICATE' | 'TIMING_DIFF';

interface Discrepancy {
  id: string;
  date: string;
  provider: string;
  txn_id_internal: string;
  txn_id_provider: string;
  internal_amount: number;
  provider_amount: number;
  difference: number;
  type: DiscrepancyType;
  description: string;
  status: DiscrepancyStatus;
}

const TYPE_LABELS: Record<DiscrepancyType, string> = {
  AMOUNT_MISMATCH: 'Diferencia de monto',
  MISSING_CREDIT:  'Credito faltante',
  DUPLICATE:       'Duplicado',
  TIMING_DIFF:     'Diferencia de fecha',
};

const STATUS_CONFIG: Record<DiscrepancyStatus, { label: string; bg: string; color: string }> = {
  OPEN:      { label: 'Abierta',     bg: '#fed7d7', color: '#742a2a' },
  IN_REVIEW: { label: 'En revision', bg: '#fefcbf', color: '#744210' },
  RESOLVED:  { label: 'Resuelta',   bg: '#c6f6d5', color: '#276749' },
  DISMISSED: { label: 'Descartada', bg: '#e2e8f0', color: '#718096' },
};

@Component({
  selector: 'sp-admin-reconciliation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-admin-reconciliation">

      <!-- Header -->
      <div class="sp-admin-reconciliation__header">
        <div>
          <h1 class="sp-admin-reconciliation__title">Reconciliacion</h1>
          <p class="sp-admin-reconciliation__subtitle">
            Discrepancias detectadas entre registros internos y proveedores SPEI
          </p>
        </div>
        <div class="sp-admin-reconciliation__header-actions">
          <button class="sp-admin-reconciliation__btn-secondary" (click)="runReconciliation()">
            ▶ Ejecutar reconciliacion
          </button>
          <button class="sp-admin-reconciliation__btn-primary">
            Exportar reporte
          </button>
        </div>
      </div>

      <!-- Resumen de estado -->
      <div class="sp-admin-reconciliation__summary">
        <div class="sp-admin-reconciliation__summary-card sp-admin-reconciliation__summary-card--danger">
          <span class="sp-admin-reconciliation__summary-count">{{ openCount() }}</span>
          <span class="sp-admin-reconciliation__summary-label">Abiertas</span>
        </div>
        <div class="sp-admin-reconciliation__summary-card sp-admin-reconciliation__summary-card--warning">
          <span class="sp-admin-reconciliation__summary-count">{{ reviewCount() }}</span>
          <span class="sp-admin-reconciliation__summary-label">En revision</span>
        </div>
        <div class="sp-admin-reconciliation__summary-card sp-admin-reconciliation__summary-card--success">
          <span class="sp-admin-reconciliation__summary-count">{{ resolvedCount() }}</span>
          <span class="sp-admin-reconciliation__summary-label">Resueltas hoy</span>
        </div>
        <div class="sp-admin-reconciliation__summary-card">
          <span class="sp-admin-reconciliation__summary-count">
            {{ totalDifference() | currency:'MXN':'symbol':'1.2-2' }}
          </span>
          <span class="sp-admin-reconciliation__summary-label">Diferencia total</span>
        </div>
      </div>

      <!-- Tabla de discrepancias -->
      <div class="sp-admin-reconciliation__table-wrap">
        <div class="sp-admin-reconciliation__table-header">
          <span class="sp-admin-reconciliation__table-title">
            Discrepancias ({{ discrepancies().length }})
          </span>
          <select class="sp-admin-reconciliation__filter-select"
                  (change)="onFilterStatus($event)">
            <option value="">Todos los estados</option>
            <option value="OPEN">Abiertas</option>
            <option value="IN_REVIEW">En revision</option>
            <option value="RESOLVED">Resueltas</option>
            <option value="DISMISSED">Descartadas</option>
          </select>
        </div>

        <table class="sp-admin-reconciliation__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Tipo</th>
              <th>Monto interno</th>
              <th>Monto proveedor</th>
              <th>Diferencia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (filteredDiscrepancies().length === 0) {
              <tr>
                <td colspan="9" class="sp-admin-reconciliation__empty">
                  No hay discrepancias con los filtros actuales.
                </td>
              </tr>
            }
            @for (item of filteredDiscrepancies(); track item.id) {
              <tr class="sp-admin-reconciliation__row">
                <td class="sp-admin-reconciliation__cell--mono">{{ item.id }}</td>
                <td class="sp-admin-reconciliation__cell--date">
                  {{ item.date | date:'dd/MM/yyyy' }}
                </td>
                <td>{{ item.provider }}</td>
                <td>
                  <span class="sp-admin-reconciliation__type-badge">
                    {{ typeLabel(item.type) }}
                  </span>
                </td>
                <td class="sp-admin-reconciliation__cell--amount">
                  {{ item.internal_amount | currency:'MXN':'symbol':'1.2-2' }}
                </td>
                <td class="sp-admin-reconciliation__cell--amount">
                  {{ item.provider_amount | currency:'MXN':'symbol':'1.2-2' }}
                </td>
                <td class="sp-admin-reconciliation__cell--diff"
                    [class.sp-admin-reconciliation__cell--diff-neg]="item.difference < 0">
                  {{ item.difference | currency:'MXN':'symbol':'1.2-2' }}
                </td>
                <td>
                  <span
                    class="sp-admin-reconciliation__status-badge"
                    [style.background]="statusCfg(item.status).bg"
                    [style.color]="statusCfg(item.status).color">
                    {{ statusCfg(item.status).label }}
                  </span>
                </td>
                <td>
                  <div class="sp-admin-reconciliation__actions">
                    @if (item.status === 'OPEN' || item.status === 'IN_REVIEW') {
                      <button
                        class="sp-admin-reconciliation__action-btn sp-admin-reconciliation__action-btn--resolve"
                        (click)="resolve(item)">
                        Resolver
                      </button>
                      <button
                        class="sp-admin-reconciliation__action-btn"
                        (click)="dismiss(item)">
                        Descartar
                      </button>
                    } @else {
                      <span class="sp-admin-reconciliation__action-done">
                        {{ item.status === 'RESOLVED' ? 'Resuelta' : 'Descartada' }}
                      </span>
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
    .sp-admin-reconciliation {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-reconciliation__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .sp-admin-reconciliation__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-reconciliation__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }
    .sp-admin-reconciliation__header-actions { display: flex; gap: 8px; }
    .sp-admin-reconciliation__btn-primary {
      padding: 8px 16px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-reconciliation__btn-primary:hover { background: #2b6cb0; }
    .sp-admin-reconciliation__btn-secondary {
      padding: 8px 16px;
      background: white;
      color: #4a5568;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .sp-admin-reconciliation__btn-secondary:hover { background: #f7fafc; }

    /* Summary */
    .sp-admin-reconciliation__summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .sp-admin-reconciliation__summary-card {
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
    .sp-admin-reconciliation__summary-card--danger { border-left: 4px solid #e53e3e; }
    .sp-admin-reconciliation__summary-card--warning { border-left: 4px solid #d69e2e; }
    .sp-admin-reconciliation__summary-card--success { border-left: 4px solid #38a169; }
    .sp-admin-reconciliation__summary-count {
      font-size: 26px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-reconciliation__summary-label { font-size: 12px; color: #718096; }

    /* Table */
    .sp-admin-reconciliation__table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-reconciliation__table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-admin-reconciliation__table-title { font-size: 15px; font-weight: 600; color: #2d3748; }
    .sp-admin-reconciliation__filter-select {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
    .sp-admin-reconciliation__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-reconciliation__table thead tr { background: #f7fafc; }
    .sp-admin-reconciliation__table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-reconciliation__table td {
      padding: 12px 14px;
      border-top: 1px solid #f0f4f8;
      color: #2d3748;
      vertical-align: middle;
    }
    .sp-admin-reconciliation__row:hover { background: #f7fafc; }
    .sp-admin-reconciliation__empty {
      text-align: center;
      padding: 32px !important;
      color: #a0aec0;
    }

    /* Cell variants */
    .sp-admin-reconciliation__cell--mono { font-family: monospace; font-size: 11px; color: #718096; }
    .sp-admin-reconciliation__cell--date { white-space: nowrap; color: #718096; }
    .sp-admin-reconciliation__cell--amount { font-weight: 600; }
    .sp-admin-reconciliation__cell--diff { font-weight: 700; color: #38a169; }
    .sp-admin-reconciliation__cell--diff-neg { color: #e53e3e; }

    /* Badges */
    .sp-admin-reconciliation__type-badge {
      font-size: 11px;
      background: #ebf8ff;
      color: #2b6cb0;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }
    .sp-admin-reconciliation__status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Actions */
    .sp-admin-reconciliation__actions { display: flex; gap: 4px; }
    .sp-admin-reconciliation__action-btn {
      padding: 4px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 11px;
      color: #4a5568;
      white-space: nowrap;
    }
    .sp-admin-reconciliation__action-btn:hover { background: #f7fafc; }
    .sp-admin-reconciliation__action-btn--resolve {
      background: #ebf8ff;
      border-color: #bee3f8;
      color: #2b6cb0;
      font-weight: 600;
    }
    .sp-admin-reconciliation__action-btn--resolve:hover { background: #bee3f8; }
    .sp-admin-reconciliation__action-done { font-size: 11px; color: #a0aec0; }
  `],
})
export class ReconciliationPageComponent {

  readonly filterStatus = signal<DiscrepancyStatus | ''>('');

  readonly discrepancies = signal<Discrepancy[]>([
    {
      id: 'DISC-2026-001',
      date: '2026-02-26T08:00:00Z',
      provider: 'STP',
      txn_id_internal: 'INT-20260226-0012',
      txn_id_provider: 'STP-20260226-9841',
      internal_amount: 50_000,
      provider_amount: 49_850,
      difference: 150,
      type: 'AMOUNT_MISMATCH',
      description: 'Diferencia de $150 entre registro interno y confirmacion STP',
      status: 'OPEN',
    },
    {
      id: 'DISC-2026-002',
      date: '2026-02-25T14:30:00Z',
      provider: 'FINCH',
      txn_id_internal: 'INT-20260225-0087',
      txn_id_provider: '',
      internal_amount: 120_000,
      provider_amount: 0,
      difference: -120_000,
      type: 'MISSING_CREDIT',
      description: 'Credito registrado internamente sin confirmacion FINCH',
      status: 'IN_REVIEW',
    },
    {
      id: 'DISC-2026-003',
      date: '2026-02-25T10:15:00Z',
      provider: 'STP',
      txn_id_internal: 'INT-20260225-0045',
      txn_id_provider: 'STP-20260225-7623',
      internal_amount: 8_500,
      provider_amount: 8_500,
      difference: 0,
      type: 'TIMING_DIFF',
      description: 'Operacion registrada con 3 minutos de diferencia',
      status: 'RESOLVED',
    },
    {
      id: 'DISC-2026-004',
      date: '2026-02-24T16:00:00Z',
      provider: 'OPENPAY',
      txn_id_internal: 'INT-20260224-0203',
      txn_id_provider: 'OP-20260224-5541',
      internal_amount: 25_000,
      provider_amount: 25_000,
      difference: 0,
      type: 'DUPLICATE',
      description: 'Posible doble registro en sistema Openpay',
      status: 'DISMISSED',
    },
  ]);

  readonly filteredDiscrepancies = computed(() => {
    const status = this.filterStatus();
    if (!status) return this.discrepancies();
    return this.discrepancies().filter((d) => d.status === status);
  });

  readonly openCount = computed(() =>
    this.discrepancies().filter((d) => d.status === 'OPEN').length,
  );
  readonly reviewCount = computed(() =>
    this.discrepancies().filter((d) => d.status === 'IN_REVIEW').length,
  );
  readonly resolvedCount = computed(() =>
    this.discrepancies().filter((d) => d.status === 'RESOLVED').length,
  );
  readonly totalDifference = computed(() =>
    this.discrepancies()
      .filter((d) => d.status === 'OPEN' || d.status === 'IN_REVIEW')
      .reduce((sum, d) => sum + Math.abs(d.difference), 0),
  );

  typeLabel(type: DiscrepancyType): string {
    return TYPE_LABELS[type] ?? type;
  }

  statusCfg(status: DiscrepancyStatus) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG['OPEN'];
  }

  onFilterStatus(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as DiscrepancyStatus | '';
    this.filterStatus.set(val);
  }

  resolve(item: Discrepancy): void {
    this.discrepancies.update((items) =>
      items.map((d) => d.id === item.id ? { ...d, status: 'RESOLVED' as DiscrepancyStatus } : d),
    );
  }

  dismiss(item: Discrepancy): void {
    this.discrepancies.update((items) =>
      items.map((d) => d.id === item.id ? { ...d, status: 'DISMISSED' as DiscrepancyStatus } : d),
    );
  }

  runReconciliation(): void {
    console.log('[Reconciliation] Ejecutando reconciliacion manual...');
  }
}
