/**
 * DlqPageComponent
 *
 * Dead Letter Queue — Mensajes fallidos que no pudieron ser procesados
 * por el sistema. Permite reintentar o descartar cada entrada.
 * EP-SP-008 US-SP-037
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

type DlqStatus = 'PENDING' | 'RETRYING' | 'DISCARDED' | 'RESOLVED';
type QueueName =
  | 'spei-transfer-queue'
  | 'reconciliation-queue'
  | 'notification-queue'
  | 'webhook-queue'
  | 'provider-sync-queue';

interface DlqEntry {
  id: string;
  queue_name: QueueName;
  error_message: string;
  error_code: string;
  payload_summary: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  last_attempt_at: string;
  status: DlqStatus;
  org?: string;
}

const QUEUE_CONFIG: Record<QueueName, { label: string; color: string }> = {
  'spei-transfer-queue':    { label: 'Transferencias SPEI',  color: '#2b6cb0' },
  'reconciliation-queue':   { label: 'Reconciliacion',       color: '#553c9a' },
  'notification-queue':     { label: 'Notificaciones',       color: '#276749' },
  'webhook-queue':          { label: 'Webhooks',             color: '#744210' },
  'provider-sync-queue':    { label: 'Sync Proveedores',     color: '#742a2a' },
};

const STATUS_CONFIG: Record<DlqStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Pendiente',  bg: '#fefcbf', color: '#744210' },
  RETRYING:  { label: 'Reintentando', bg: '#ebf8ff', color: '#2a4365' },
  DISCARDED: { label: 'Descartado', bg: '#e2e8f0', color: '#718096' },
  RESOLVED:  { label: 'Resuelto',   bg: '#c6f6d5', color: '#276749' },
};

@Component({
  selector: 'sp-admin-dlq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="sp-admin-dlq">

      <!-- Header -->
      <div class="sp-admin-dlq__header">
        <div>
          <h1 class="sp-admin-dlq__title">Dead Letter Queue</h1>
          <p class="sp-admin-dlq__subtitle">
            Mensajes fallidos que requieren atencion manual o reintento
          </p>
        </div>
        <div class="sp-admin-dlq__header-actions">
          <button class="sp-admin-dlq__btn-secondary" (click)="retryAll()">
            ↻ Reintentar todos
          </button>
          <button class="sp-admin-dlq__btn-danger" (click)="discardResolved()">
            Limpiar resueltos
          </button>
        </div>
      </div>

      <!-- Stats por cola -->
      <div class="sp-admin-dlq__queue-filter">
        <button
          class="sp-admin-dlq__queue-chip"
          [class.sp-admin-dlq__queue-chip--active]="!selectedQueue()"
          (click)="selectedQueue.set(null)">
          Todas las colas ({{ pendingEntries().length }} pendientes)
        </button>
        @for (q of queueOptions; track q.value) {
          <button
            class="sp-admin-dlq__queue-chip"
            [class.sp-admin-dlq__queue-chip--active]="selectedQueue() === q.value"
            (click)="selectedQueue.set(q.value)">
            <span [style.color]="q.color">■</span> {{ q.label }}
            <span class="sp-admin-dlq__queue-badge">
              {{ countByQueue(q.value) }}
            </span>
          </button>
        }
      </div>

      <!-- Resumen numerado -->
      <div class="sp-admin-dlq__summary">
        <div class="sp-admin-dlq__summary-stat">
          <span class="sp-admin-dlq__summary-value sp-admin-dlq__summary-value--warning">
            {{ pendingCount() }}
          </span>
          <span class="sp-admin-dlq__summary-label">Pendientes</span>
        </div>
        <div class="sp-admin-dlq__summary-stat">
          <span class="sp-admin-dlq__summary-value sp-admin-dlq__summary-value--info">
            {{ retryingCount() }}
          </span>
          <span class="sp-admin-dlq__summary-label">Reintentando</span>
        </div>
        <div class="sp-admin-dlq__summary-stat">
          <span class="sp-admin-dlq__summary-value">{{ totalRetries() }}</span>
          <span class="sp-admin-dlq__summary-label">Reintentos totales</span>
        </div>
        <div class="sp-admin-dlq__summary-stat">
          <span class="sp-admin-dlq__summary-value sp-admin-dlq__summary-value--danger">
            {{ maxRetriesHit() }}
          </span>
          <span class="sp-admin-dlq__summary-label">Agotaron reintentos</span>
        </div>
      </div>

      <!-- Tabla DLQ -->
      <div class="sp-admin-dlq__table-wrap">
        <table class="sp-admin-dlq__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cola</th>
              <th>Error</th>
              <th>Payload</th>
              <th>Reintentos</th>
              <th>Creado</th>
              <th>Ultimo intento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (filteredEntries().length === 0) {
              <tr>
                <td colspan="9" class="sp-admin-dlq__empty">
                  No hay entradas en la DLQ para los filtros seleccionados.
                </td>
              </tr>
            }
            @for (entry of filteredEntries(); track entry.id) {
              <tr class="sp-admin-dlq__row"
                  [class.sp-admin-dlq__row--discarded]="entry.status === 'DISCARDED'"
                  [class.sp-admin-dlq__row--resolved]="entry.status === 'RESOLVED'">
                <td class="sp-admin-dlq__cell--mono">{{ entry.id }}</td>
                <td>
                  <span
                    class="sp-admin-dlq__queue-label"
                    [style.color]="queueCfg(entry.queue_name).color">
                    {{ queueCfg(entry.queue_name).label }}
                  </span>
                  @if (entry.org) {
                    <span class="sp-admin-dlq__org-label">{{ entry.org }}</span>
                  }
                </td>
                <td class="sp-admin-dlq__cell--error">
                  <span class="sp-admin-dlq__error-code">{{ entry.error_code }}</span>
                  <span class="sp-admin-dlq__error-msg">{{ entry.error_message }}</span>
                </td>
                <td class="sp-admin-dlq__cell--payload">{{ entry.payload_summary }}</td>
                <td>
                  <div class="sp-admin-dlq__retry-bar-wrap">
                    <div
                      class="sp-admin-dlq__retry-bar"
                      [style.width.%]="(entry.retry_count / entry.max_retries) * 100"
                      [class.sp-admin-dlq__retry-bar--full]="entry.retry_count >= entry.max_retries">
                    </div>
                  </div>
                  <span class="sp-admin-dlq__retry-count">
                    {{ entry.retry_count }} / {{ entry.max_retries }}
                  </span>
                </td>
                <td class="sp-admin-dlq__cell--date">
                  {{ entry.created_at | date:'dd/MM HH:mm' }}
                </td>
                <td class="sp-admin-dlq__cell--date">
                  {{ entry.last_attempt_at | date:'dd/MM HH:mm' }}
                </td>
                <td>
                  <span
                    class="sp-admin-dlq__status-badge"
                    [style.background]="statusCfg(entry.status).bg"
                    [style.color]="statusCfg(entry.status).color">
                    {{ statusCfg(entry.status).label }}
                  </span>
                </td>
                <td>
                  <div class="sp-admin-dlq__actions">
                    @if (entry.status === 'PENDING' || entry.status === 'RETRYING') {
                      <button
                        class="sp-admin-dlq__action-btn sp-admin-dlq__action-btn--retry"
                        [disabled]="entry.status === 'RETRYING'"
                        (click)="retryEntry(entry)">
                        ↻ Reintentar
                      </button>
                      <button
                        class="sp-admin-dlq__action-btn sp-admin-dlq__action-btn--discard"
                        (click)="discardEntry(entry)">
                        Descartar
                      </button>
                    } @else {
                      <span class="sp-admin-dlq__action-done">
                        {{ entry.status === 'RESOLVED' ? 'Resuelto' : 'Descartado' }}
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
    .sp-admin-dlq {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-dlq__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .sp-admin-dlq__title { margin: 0; font-size: 22px; font-weight: 700; color: #1a202c; }
    .sp-admin-dlq__subtitle { margin: 4px 0 0; font-size: 13px; color: #718096; }
    .sp-admin-dlq__header-actions { display: flex; gap: 8px; }
    .sp-admin-dlq__btn-secondary {
      padding: 8px 16px;
      background: white;
      color: #4a5568;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .sp-admin-dlq__btn-secondary:hover { background: #f7fafc; }
    .sp-admin-dlq__btn-danger {
      padding: 8px 16px;
      background: white;
      color: #742a2a;
      border: 1px solid #fed7d7;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .sp-admin-dlq__btn-danger:hover { background: #fff5f5; }

    /* Queue filter */
    .sp-admin-dlq__queue-filter {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .sp-admin-dlq__queue-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      color: #4a5568;
      font-family: system-ui, sans-serif;
    }
    .sp-admin-dlq__queue-chip:hover { background: #f7fafc; }
    .sp-admin-dlq__queue-chip--active {
      background: #3182ce;
      color: white;
      border-color: #3182ce;
    }
    .sp-admin-dlq__queue-badge {
      background: rgba(0,0,0,0.1);
      border-radius: 10px;
      padding: 0 6px;
      font-size: 11px;
    }

    /* Summary */
    .sp-admin-dlq__summary {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 14px 20px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .sp-admin-dlq__summary-stat { display: flex; align-items: center; gap: 8px; }
    .sp-admin-dlq__summary-value { font-size: 20px; font-weight: 700; color: #1a202c; }
    .sp-admin-dlq__summary-value--warning { color: #d69e2e; }
    .sp-admin-dlq__summary-value--info    { color: #3182ce; }
    .sp-admin-dlq__summary-value--danger  { color: #e53e3e; }
    .sp-admin-dlq__summary-label { font-size: 12px; color: #718096; }

    /* Table */
    .sp-admin-dlq__table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-dlq__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .sp-admin-dlq__table thead tr { background: #f7fafc; }
    .sp-admin-dlq__table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-dlq__table td {
      padding: 11px 12px;
      border-top: 1px solid #f0f4f8;
      vertical-align: top;
    }
    .sp-admin-dlq__row:hover { background: #f7fafc; }
    .sp-admin-dlq__row--discarded { opacity: 0.5; }
    .sp-admin-dlq__row--resolved  { opacity: 0.7; }
    .sp-admin-dlq__empty { text-align: center; padding: 32px !important; color: #a0aec0; }

    /* Cell variants */
    .sp-admin-dlq__cell--mono { font-family: monospace; font-size: 10px; color: #718096; }
    .sp-admin-dlq__queue-label { display: block; font-weight: 600; font-size: 11px; }
    .sp-admin-dlq__org-label { display: block; font-size: 10px; color: #a0aec0; margin-top: 2px; }
    .sp-admin-dlq__cell--error { min-width: 180px; }
    .sp-admin-dlq__error-code {
      display: block;
      font-family: monospace;
      font-size: 10px;
      color: #e53e3e;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .sp-admin-dlq__error-msg { font-size: 11px; color: #718096; }
    .sp-admin-dlq__cell--payload {
      max-width: 180px;
      font-size: 11px;
      color: #718096;
      font-family: monospace;
    }
    .sp-admin-dlq__cell--date { white-space: nowrap; color: #718096; font-size: 11px; }

    /* Retry bar */
    .sp-admin-dlq__retry-bar-wrap {
      width: 60px;
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      margin-bottom: 3px;
    }
    .sp-admin-dlq__retry-bar {
      height: 4px;
      background: #3182ce;
      border-radius: 2px;
      transition: width 0.3s;
    }
    .sp-admin-dlq__retry-bar--full { background: #e53e3e; }
    .sp-admin-dlq__retry-count { font-size: 11px; color: #718096; }

    /* Status badge */
    .sp-admin-dlq__status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Actions */
    .sp-admin-dlq__actions { display: flex; gap: 4px; flex-wrap: wrap; }
    .sp-admin-dlq__action-btn {
      padding: 4px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 11px;
      color: #4a5568;
      white-space: nowrap;
    }
    .sp-admin-dlq__action-btn:hover { background: #f7fafc; }
    .sp-admin-dlq__action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .sp-admin-dlq__action-btn--retry {
      background: #ebf8ff;
      color: #2b6cb0;
      border-color: #bee3f8;
      font-weight: 600;
    }
    .sp-admin-dlq__action-btn--retry:not(:disabled):hover { background: #bee3f8; }
    .sp-admin-dlq__action-btn--discard { color: #742a2a; }
    .sp-admin-dlq__action-btn--discard:hover { background: #fff5f5; border-color: #fed7d7; }
    .sp-admin-dlq__action-done { font-size: 11px; color: #a0aec0; }
  `],
})
export class DlqPageComponent {

  readonly selectedQueue = signal<QueueName | null>(null);

  readonly queueOptions = (Object.keys(QUEUE_CONFIG) as QueueName[]).map((key) => ({
    value: key,
    label: QUEUE_CONFIG[key].label,
    color: QUEUE_CONFIG[key].color,
  }));

  readonly entries = signal<DlqEntry[]>([
    {
      id: 'DLQ-0001',
      queue_name: 'spei-transfer-queue',
      error_message: 'Connection timeout al enviar a STP: socket hang up',
      error_code: 'ERR_SOCKET_TIMEOUT',
      payload_summary: '{"txn_id":"INT-0012","amount":50000,"clabe":"012345..."}',
      retry_count: 3,
      max_retries: 5,
      created_at: '2026-02-26T09:00:00Z',
      last_attempt_at: '2026-02-26T09:45:00Z',
      status: 'PENDING',
      org: 'Tiendas Mayan',
    },
    {
      id: 'DLQ-0002',
      queue_name: 'notification-queue',
      error_message: 'Email delivery failed: mailbox full (452 4.2.2)',
      error_code: 'SMTP_MAILBOX_FULL',
      payload_summary: '{"to":"finanzas@mayan.com.mx","template":"transfer_confirmed"}',
      retry_count: 5,
      max_retries: 5,
      created_at: '2026-02-26T08:32:00Z',
      last_attempt_at: '2026-02-26T09:32:00Z',
      status: 'PENDING',
      org: 'Tiendas Mayan',
    },
    {
      id: 'DLQ-0003',
      queue_name: 'reconciliation-queue',
      error_message: 'Proveedor FINCH returno HTTP 503: Service Unavailable',
      error_code: 'PROVIDER_UNAVAILABLE',
      payload_summary: '{"date":"2026-02-25","provider":"FINCH","batch_size":47}',
      retry_count: 2,
      max_retries: 3,
      created_at: '2026-02-25T23:00:00Z',
      last_attempt_at: '2026-02-26T01:00:00Z',
      status: 'RETRYING',
    },
    {
      id: 'DLQ-0004',
      queue_name: 'webhook-queue',
      error_message: 'Webhook endpoint retorno HTTP 500 tres veces consecutivas',
      error_code: 'WEBHOOK_ENDPOINT_ERROR',
      payload_summary: '{"event":"transfer.completed","org_id":"org-002"}',
      retry_count: 3,
      max_retries: 3,
      created_at: '2026-02-25T14:15:00Z',
      last_attempt_at: '2026-02-25T15:30:00Z',
      status: 'DISCARDED',
      org: 'Distribuidora Norteña',
    },
    {
      id: 'DLQ-0005',
      queue_name: 'provider-sync-queue',
      error_message: 'Token de autenticacion STP expirado',
      error_code: 'AUTH_TOKEN_EXPIRED',
      payload_summary: '{"provider":"STP","action":"sync_balance","accounts":12}',
      retry_count: 1,
      max_retries: 3,
      created_at: '2026-02-26T06:00:00Z',
      last_attempt_at: '2026-02-26T06:05:00Z',
      status: 'RESOLVED',
    },
    {
      id: 'DLQ-0006',
      queue_name: 'spei-transfer-queue',
      error_message: 'CLABE destino invalida: digito verificador incorrecto',
      error_code: 'CLABE_INVALID',
      payload_summary: '{"txn_id":"INT-0034","amount":9500,"clabe":"012345678901234500"}',
      retry_count: 0,
      max_retries: 0,
      created_at: '2026-02-26T09:01:00Z',
      last_attempt_at: '2026-02-26T09:01:00Z',
      status: 'DISCARDED',
      org: 'Farmacia Del Pueblo',
    },
  ]);

  readonly filteredEntries = computed(() => {
    const queue = this.selectedQueue();
    if (!queue) return this.entries();
    return this.entries().filter((e) => e.queue_name === queue);
  });

  readonly pendingEntries = computed(() =>
    this.entries().filter((e) => e.status === 'PENDING' || e.status === 'RETRYING'),
  );
  readonly pendingCount = computed(() =>
    this.entries().filter((e) => e.status === 'PENDING').length,
  );
  readonly retryingCount = computed(() =>
    this.entries().filter((e) => e.status === 'RETRYING').length,
  );
  readonly totalRetries = computed(() =>
    this.entries().reduce((sum, e) => sum + e.retry_count, 0),
  );
  readonly maxRetriesHit = computed(() =>
    this.entries().filter((e) => e.retry_count >= e.max_retries && e.max_retries > 0).length,
  );

  queueCfg(queue: QueueName) {
    return QUEUE_CONFIG[queue] ?? { label: queue, color: '#718096' };
  }

  statusCfg(status: DlqStatus) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING'];
  }

  countByQueue(queue: QueueName): number {
    return this.entries().filter((e) => e.queue_name === queue && e.status === 'PENDING').length;
  }

  retryEntry(entry: DlqEntry): void {
    this.entries.update((list) =>
      list.map((e) =>
        e.id === entry.id
          ? { ...e, status: 'RETRYING' as DlqStatus, last_attempt_at: new Date().toISOString() }
          : e,
      ),
    );
    // Simula que el reintento resuelve el problema en 2s
    setTimeout(() => {
      this.entries.update((list) =>
        list.map((e) =>
          e.id === entry.id ? { ...e, status: 'RESOLVED' as DlqStatus } : e,
        ),
      );
    }, 2000);
  }

  discardEntry(entry: DlqEntry): void {
    this.entries.update((list) =>
      list.map((e) =>
        e.id === entry.id ? { ...e, status: 'DISCARDED' as DlqStatus } : e,
      ),
    );
  }

  retryAll(): void {
    const now = new Date().toISOString();
    this.entries.update((list) =>
      list.map((e) =>
        e.status === 'PENDING'
          ? { ...e, status: 'RETRYING' as DlqStatus, last_attempt_at: now }
          : e,
      ),
    );
  }

  discardResolved(): void {
    this.entries.update((list) => list.filter((e) => e.status !== 'RESOLVED'));
  }
}
