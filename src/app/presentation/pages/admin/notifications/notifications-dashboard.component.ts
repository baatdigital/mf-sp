/**
 * NotificationsDashboardComponent
 *
 * Dashboard en tiempo real de notificaciones del sistema.
 * Simula una conexion SSE mostrando notificaciones que llegan
 * automaticamente cada 8 segundos con distintos tipos y severidades.
 * EP-SP-030
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

type NotifType = 'PAYMENT_COMPLETED' | 'TRANSFER_FAILED' | 'FRAUD_ALERT' | 'CASH_IN' | 'CASH_OUT' | 'AUCTION_MATCH';
type Severity  = 'info' | 'warning' | 'critical';

interface Notification {
  id:        string;
  type:      NotifType;
  org_id:    string;
  amount?:   number;
  message:   string;
  timestamp: Date;
  severity:  Severity;
  read:      boolean;
}

const TYPE_CONFIG: Record<NotifType, { label: string; icon: string; defaultSeverity: Severity }> = {
  PAYMENT_COMPLETED: { label: 'Pago completado',  icon: '✅', defaultSeverity: 'info'     },
  TRANSFER_FAILED:   { label: 'Transferencia fallida', icon: '❌', defaultSeverity: 'warning'  },
  FRAUD_ALERT:       { label: 'Alerta de fraude', icon: '🚨', defaultSeverity: 'critical' },
  CASH_IN:           { label: 'Cash In',          icon: '💰', defaultSeverity: 'info'     },
  CASH_OUT:          { label: 'Cash Out',         icon: '💸', defaultSeverity: 'info'     },
  AUCTION_MATCH:     { label: 'Match en subasta', icon: '🔨', defaultSeverity: 'warning'  },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; color: string; border: string }> = {
  info:     { label: 'Info',     bg: '#ebf8ff', color: '#2b6cb0', border: '#bee3f8' },
  warning:  { label: 'Alerta',   bg: '#fefcbf', color: '#744210', border: '#f6e05e' },
  critical: { label: 'Critico',  bg: '#fff5f5', color: '#742a2a', border: '#feb2b2' },
};

const MOCK_ORG_IDS = ['ORG-0012', 'ORG-0039', 'ORG-0055', 'ORG-0071', 'ORG-0088'];

const NOTIF_TEMPLATES: { type: NotifType; message: (org: string, amt?: number) => string; hasAmount: boolean }[] = [
  { type: 'PAYMENT_COMPLETED', hasAmount: true,  message: (org, amt) => `Pago de $${amt?.toLocaleString('es-MX')} MXN procesado correctamente para ${org}` },
  { type: 'TRANSFER_FAILED',   hasAmount: true,  message: (org, amt) => `Transferencia de $${amt?.toLocaleString('es-MX')} MXN fallida en ${org} - timeout proveedor` },
  { type: 'FRAUD_ALERT',       hasAmount: true,  message: (org, amt) => `Score de fraude critico (0.97) en transaccion de $${amt?.toLocaleString('es-MX')} MXN - ${org}` },
  { type: 'CASH_IN',           hasAmount: true,  message: (org, amt) => `Deposito en efectivo de $${amt?.toLocaleString('es-MX')} MXN registrado en ${org}` },
  { type: 'CASH_OUT',          hasAmount: true,  message: (org, amt) => `Retiro de $${amt?.toLocaleString('es-MX')} MXN solicitado por ${org}` },
  { type: 'AUCTION_MATCH',     hasAmount: true,  message: (org, amt) => `Match exitoso en subasta por $${amt?.toLocaleString('es-MX')} MXN - ${org}` },
];

let notifCounter = 100;

function generateNotification(): Notification {
  const template = NOTIF_TEMPLATES[Math.floor(Math.random() * NOTIF_TEMPLATES.length)];
  const org      = MOCK_ORG_IDS[Math.floor(Math.random() * MOCK_ORG_IDS.length)];
  const amount   = template.hasAmount ? Math.floor(Math.random() * 45_000 + 500) : undefined;
  notifCounter++;
  return {
    id:        `NOTIF-${String(notifCounter).padStart(4, '0')}`,
    type:      template.type,
    org_id:    org,
    amount,
    message:   template.message(org, amount),
    timestamp: new Date(),
    severity:  TYPE_CONFIG[template.type].defaultSeverity,
    read:      false,
  };
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOTIF-0001', type: 'FRAUD_ALERT',       org_id: 'ORG-0039',
    amount: 87_500, severity: 'critical', read: false, timestamp: new Date(Date.now() - 60_000),
    message: 'Score de fraude critico (0.97) en transaccion de $87,500 MXN - ORG-0039',
  },
  {
    id: 'NOTIF-0002', type: 'TRANSFER_FAILED',   org_id: 'ORG-0012',
    amount: 15_000, severity: 'warning',  read: false, timestamp: new Date(Date.now() - 120_000),
    message: 'Transferencia de $15,000 MXN fallida en ORG-0012 - timeout proveedor',
  },
  {
    id: 'NOTIF-0003', type: 'PAYMENT_COMPLETED', org_id: 'ORG-0055',
    amount: 3_200,  severity: 'info',    read: true,  timestamp: new Date(Date.now() - 180_000),
    message: 'Pago de $3,200 MXN procesado correctamente para ORG-0055',
  },
  {
    id: 'NOTIF-0004', type: 'CASH_IN',           org_id: 'ORG-0071',
    amount: 8_000,  severity: 'info',    read: true,  timestamp: new Date(Date.now() - 240_000),
    message: 'Deposito en efectivo de $8,000 MXN registrado en ORG-0071',
  },
  {
    id: 'NOTIF-0005', type: 'AUCTION_MATCH',     org_id: 'ORG-0088',
    amount: 250_000, severity: 'warning', read: false, timestamp: new Date(Date.now() - 300_000),
    message: 'Match exitoso en subasta por $250,000 MXN - ORG-0088',
  },
];

@Component({
  selector: 'sp-admin-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="sp-admin-notifications">

      <!-- Header -->
      <div class="sp-admin-notifications__header">
        <div class="sp-admin-notifications__header-left">
          <h1 class="sp-admin-notifications__title">Notificaciones</h1>
          <div class="sp-admin-notifications__live-badge">
            <span class="sp-admin-notifications__live-dot"></span>
            EN VIVO
          </div>
        </div>
        <div class="sp-admin-notifications__header-actions">
          @if (unreadCount() > 0) {
            <button class="sp-admin-notifications__btn-secondary" (click)="markAllRead()">
              Marcar todas como leidas
            </button>
          }
          <button class="sp-admin-notifications__btn-danger" (click)="clearRead()">
            Limpiar leidas
          </button>
        </div>
      </div>

      <!-- Stats en tiempo real -->
      <div class="sp-admin-notifications__summary">
        <div class="sp-admin-notifications__summary-card sp-admin-notifications__summary-card--info">
          <span class="sp-admin-notifications__summary-count">{{ transactionsToday() }}</span>
          <span class="sp-admin-notifications__summary-label">Transacciones hoy</span>
        </div>
        <div class="sp-admin-notifications__summary-card sp-admin-notifications__summary-card--danger">
          <span class="sp-admin-notifications__summary-count">{{ criticalPending() }}</span>
          <span class="sp-admin-notifications__summary-label">Alertas criticas pendientes</span>
        </div>
        <div class="sp-admin-notifications__summary-card sp-admin-notifications__summary-card--warning">
          <span class="sp-admin-notifications__summary-count">{{ unreadCount() }}</span>
          <span class="sp-admin-notifications__summary-label">No leidas</span>
        </div>
        <div class="sp-admin-notifications__summary-card">
          <span class="sp-admin-notifications__summary-count">{{ notifications().length }}</span>
          <span class="sp-admin-notifications__summary-label">Total en cola</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="sp-admin-notifications__filters">
        <select class="sp-admin-notifications__filter-select"
                (change)="onFilterType($event)">
          <option value="">Todos los tipos</option>
          <option value="PAYMENT_COMPLETED">Pagos completados</option>
          <option value="TRANSFER_FAILED">Transferencias fallidas</option>
          <option value="FRAUD_ALERT">Alertas de fraude</option>
          <option value="CASH_IN">Cash In</option>
          <option value="CASH_OUT">Cash Out</option>
          <option value="AUCTION_MATCH">Match subasta</option>
        </select>
        <select class="sp-admin-notifications__filter-select"
                (change)="onFilterSeverity($event)">
          <option value="">Todas las severidades</option>
          <option value="info">Info</option>
          <option value="warning">Alerta</option>
          <option value="critical">Critico</option>
        </select>
        <span class="sp-admin-notifications__filter-info">
          Mostrando {{ filteredNotifications().length }} de {{ notifications().length }}
        </span>
      </div>

      <!-- Lista de notificaciones -->
      <div class="sp-admin-notifications__list">
        @if (filteredNotifications().length === 0) {
          <div class="sp-admin-notifications__empty">
            No hay notificaciones con los filtros actuales.
          </div>
        }
        @for (notif of filteredNotifications(); track notif.id) {
          <div
            class="sp-admin-notifications__item"
            [class.sp-admin-notifications__item--unread]="!notif.read"
            [class.sp-admin-notifications__item--critical]="notif.severity === 'critical'"
            [style.border-left-color]="severityCfg(notif.severity).border"
            (click)="markRead(notif)">

            <div class="sp-admin-notifications__item-icon">
              {{ typeCfg(notif.type).icon }}
            </div>

            <div class="sp-admin-notifications__item-body">
              <div class="sp-admin-notifications__item-header">
                <span class="sp-admin-notifications__item-type">{{ typeCfg(notif.type).label }}</span>
                <span class="sp-admin-notifications__item-org">{{ notif.org_id }}</span>
                <span class="sp-admin-notifications__severity-badge"
                      [style.background]="severityCfg(notif.severity).bg"
                      [style.color]="severityCfg(notif.severity).color">
                  {{ severityCfg(notif.severity).label }}
                </span>
                @if (!notif.read) {
                  <span class="sp-admin-notifications__unread-dot"></span>
                }
              </div>
              <p class="sp-admin-notifications__item-message">{{ notif.message }}</p>
              <span class="sp-admin-notifications__item-time">
                {{ notif.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}
              </span>
            </div>

          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .sp-admin-notifications {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 960px;
    }

    /* Header */
    .sp-admin-notifications__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .sp-admin-notifications__header-left { display: flex; align-items: center; gap: 12px; }
    .sp-admin-notifications__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-notifications__live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #c6f6d5;
      color: #276749;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
    }
    .sp-admin-notifications__live-dot {
      width: 8px;
      height: 8px;
      background: #38a169;
      border-radius: 50%;
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.75); }
    }
    .sp-admin-notifications__header-actions { display: flex; gap: 8px; }
    .sp-admin-notifications__btn-secondary {
      padding: 7px 14px;
      background: white;
      color: #4a5568;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .sp-admin-notifications__btn-secondary:hover { background: #f7fafc; }
    .sp-admin-notifications__btn-danger {
      padding: 7px 14px;
      background: #fff5f5;
      color: #742a2a;
      border: 1px solid #feb2b2;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-notifications__btn-danger:hover { background: #fed7d7; }

    /* Summary */
    .sp-admin-notifications__summary {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .sp-admin-notifications__summary-card {
      flex: 1;
      min-width: 130px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .sp-admin-notifications__summary-card--info    { border-left: 4px solid #3182ce; }
    .sp-admin-notifications__summary-card--danger  { border-left: 4px solid #e53e3e; }
    .sp-admin-notifications__summary-card--warning { border-left: 4px solid #d69e2e; }
    .sp-admin-notifications__summary-count {
      font-size: 26px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-notifications__summary-label { font-size: 12px; color: #718096; }

    /* Filters */
    .sp-admin-notifications__filters {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .sp-admin-notifications__filter-select {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      background: white;
    }
    .sp-admin-notifications__filter-info {
      margin-left: auto;
      font-size: 12px;
      color: #a0aec0;
    }

    /* List */
    .sp-admin-notifications__list {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    .sp-admin-notifications__empty {
      padding: 40px;
      text-align: center;
      color: #a0aec0;
      font-size: 14px;
    }

    /* Item */
    .sp-admin-notifications__item {
      display: flex;
      gap: 14px;
      padding: 14px 18px;
      border-top: 1px solid #f0f4f8;
      border-left: 4px solid transparent;
      cursor: pointer;
      transition: background 0.1s ease;
    }
    .sp-admin-notifications__item:first-child { border-top: none; }
    .sp-admin-notifications__item:hover { background: #f7fafc; }
    .sp-admin-notifications__item--unread   { background: #f8fbff; }
    .sp-admin-notifications__item--critical { background: #fff8f8; }
    .sp-admin-notifications__item--critical:hover { background: #fff0f0; }

    .sp-admin-notifications__item-icon {
      font-size: 22px;
      flex-shrink: 0;
      padding-top: 2px;
    }

    .sp-admin-notifications__item-body { flex: 1; min-width: 0; }
    .sp-admin-notifications__item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .sp-admin-notifications__item-type {
      font-size: 13px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-notifications__item-org {
      font-size: 11px;
      font-family: monospace;
      color: #718096;
      background: #f0f4f8;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .sp-admin-notifications__severity-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-notifications__unread-dot {
      width: 7px;
      height: 7px;
      background: #3182ce;
      border-radius: 50%;
      flex-shrink: 0;
      margin-left: auto;
    }

    .sp-admin-notifications__item-message {
      margin: 0 0 4px;
      font-size: 13px;
      color: #2d3748;
      line-height: 1.45;
    }
    .sp-admin-notifications__item-time {
      font-size: 11px;
      color: #a0aec0;
    }
  `],
})
export class NotificationsDashboardComponent implements OnInit, OnDestroy {

  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly filterType     = signal<NotifType | ''>('');
  readonly filterSeverity = signal<Severity | ''>('');

  readonly notifications = signal<Notification[]>([...INITIAL_NOTIFICATIONS]);

  readonly filteredNotifications = computed(() => {
    const type     = this.filterType();
    const severity = this.filterSeverity();
    return this.notifications().filter((n) => {
      const matchType     = !type     || n.type     === type;
      const matchSeverity = !severity || n.severity === severity;
      return matchType && matchSeverity;
    });
  });

  readonly unreadCount = computed(() =>
    this.notifications().filter((n) => !n.read).length,
  );

  readonly criticalPending = computed(() =>
    this.notifications().filter((n) => n.severity === 'critical' && !n.read).length,
  );

  readonly transactionsToday = computed(() =>
    this.notifications().filter(
      (n) => n.type === 'PAYMENT_COMPLETED' || n.type === 'CASH_IN' || n.type === 'CASH_OUT',
    ).length,
  );

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      const newNotif = generateNotification();
      this.notifications.update((list) => [newNotif, ...list]);
    }, 8_000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  typeCfg(type: NotifType) {
    return TYPE_CONFIG[type] ?? TYPE_CONFIG['PAYMENT_COMPLETED'];
  }

  severityCfg(severity: Severity) {
    return SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG['info'];
  }

  onFilterType(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as NotifType | '';
    this.filterType.set(val);
  }

  onFilterSeverity(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as Severity | '';
    this.filterSeverity.set(val);
  }

  markRead(notif: Notification): void {
    if (notif.read) return;
    this.notifications.update((list) =>
      list.map((n) => n.id === notif.id ? { ...n, read: true } : n),
    );
  }

  markAllRead(): void {
    this.notifications.update((list) =>
      list.map((n) => ({ ...n, read: true })),
    );
  }

  clearRead(): void {
    this.notifications.update((list) => list.filter((n) => !n.read));
    console.log('[Notifications] Notificaciones leidas eliminadas.');
  }
}
