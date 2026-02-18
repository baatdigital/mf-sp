/**
 * NotificationDashboardComponent - Dashboard de notificaciones en tiempo real (Admin Tier 1)
 *
 * Muestra el flujo de notificaciones de la plataforma en tiempo real simulado con polling.
 * Incluye filtros por tipo de evento, estadisticas globales e indicador de conexion en vivo.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, interval, switchMap, startWith } from 'rxjs';
import {
  NotificationsConfigService,
  NotificationHistoryItem,
  NotificationEventType,
} from '../../../notifications/notifications-config.service';
import { SharedStateService } from '@shared-state';

type FilterTab = 'ALL' | NotificationEventType;

@Component({
  selector: 'sp-notification-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notif-page">
      <header class="page-header">
        <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
        <div class="header-row">
          <div class="header-title">
            <h1>Notificaciones en Tiempo Real</h1>
            <div class="live-indicator" [class.live-active]="isLive()">
              <span class="pulse-dot"></span>
              <span class="live-label">{{ isLive() ? 'EN VIVO' : 'DESCONECTADO' }}</span>
            </div>
          </div>
          <button class="refresh-btn" (click)="toggleLive()">
            {{ isLive() ? 'Pausar' : 'Reanudar' }}
          </button>
        </div>
      </header>

      <!-- Estadisticas globales -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ totalSentToday() }}</span>
          <span class="stat-label">Enviadas hoy</span>
        </div>
        <div class="stat-card stat-success">
          <span class="stat-value">{{ successRate() }}%</span>
          <span class="stat-label">Tasa de exito</span>
        </div>
        <div class="stat-card stat-error">
          <span class="stat-value">{{ failedCount() }}</span>
          <span class="stat-label">Fallidas</span>
        </div>
        <div class="stat-card stat-pending">
          <span class="stat-value">{{ pendingCount() }}</span>
          <span class="stat-label">Pendientes</span>
        </div>
      </div>

      <!-- Tabs de filtro -->
      <div class="filter-tabs">
        @for (tab of filterTabs; track tab.key) {
          <button
            class="tab-btn"
            [class.tab-active]="activeFilter() === tab.key"
            (click)="setFilter(tab.key)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tabla de notificaciones -->
      @if (isLoading() && filteredNotifications().length === 0) {
        <div class="loading">Cargando historial de notificaciones...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (filteredNotifications().length === 0) {
        <div class="empty-state">
          No hay notificaciones para el filtro seleccionado.
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="notif-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Org ID</th>
                <th>Tipo</th>
                <th>Canal</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredNotifications(); track item.notification_id) {
                <tr>
                  <td class="col-time">{{ item.timestamp | date:'dd/MM HH:mm:ss' }}</td>
                  <td class="col-org">{{ item.org_id }}</td>
                  <td>
                    <span class="type-badge type-{{ item.type.toLowerCase() }}">
                      {{ item.type }}
                    </span>
                  </td>
                  <td class="col-channel">{{ channelLabel(item.channel) }}</td>
                  <td>
                    <span class="status-badge status-{{ item.status.toLowerCase() }}">
                      {{ item.status }}
                    </span>
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
    .notif-page {
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

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .header-title h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      background: #e2e8f0;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .live-indicator.live-active {
      background: #dcfce7;
      color: #166534;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .live-indicator.live-active .pulse-dot {
      animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(1.3); }
    }

    .live-label {
      font-size: 11px;
      font-weight: 700;
    }

    .refresh-btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
      transition: background 0.15s;
    }

    .refresh-btn:hover {
      background: #f8fafc;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }

    .stat-success .stat-value { color: #16a34a; }
    .stat-error   .stat-value { color: #dc2626; }
    .stat-pending .stat-value { color: #d97706; }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    /* Filter tabs */
    .filter-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .tab-btn {
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tab-btn:hover {
      border-color: #94a3b8;
      color: #1e293b;
    }

    .tab-btn.tab-active {
      background: #1e293b;
      border-color: #1e293b;
      color: white;
    }

    /* States */
    .loading, .empty-state {
      text-align: center;
      padding: 48px;
      color: #64748b;
      font-size: 14px;
    }

    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
    }

    /* Table */
    .table-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .notif-table {
      width: 100%;
      border-collapse: collapse;
    }

    .notif-table thead {
      background: #f8fafc;
    }

    .notif-table th {
      padding: 10px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .notif-table td {
      padding: 10px 16px;
      font-size: 13px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .notif-table tbody tr:last-child td {
      border-bottom: none;
    }

    .notif-table tbody tr:hover td {
      background: #f8fafc;
    }

    .col-time { color: #64748b; font-size: 12px; white-space: nowrap; }
    .col-org  { font-family: monospace; font-size: 12px; }
    .col-channel { text-transform: capitalize; }

    .type-badge {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }

    .type-spei      { background: #dbeafe; color: #1d4ed8; }
    .type-billpay   { background: #f3e8ff; color: #7c3aed; }
    .type-cash      { background: #fef3c7; color: #92400e; }
    .type-whatsapp  { background: #dcfce7; color: #166534; }
    .type-system    { background: #e2e8f0; color: #475569; }

    .status-badge {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .status-sent    { background: #dcfce7; color: #166534; }
    .status-failed  { background: #fee2e2; color: #dc2626; }
    .status-pending { background: #fef3c7; color: #92400e; }
  `],
})
export class NotificationDashboardComponent implements OnInit, OnDestroy {
  private readonly notifService = inject(NotificationsConfigService);
  private readonly sharedState = inject(SharedStateService);
  private readonly destroy$ = new Subject<void>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  readonly filterTabs = [
    { key: 'ALL' as FilterTab,       label: 'Todos' },
    { key: 'SPEI' as FilterTab,      label: 'SPEI' },
    { key: 'BILLPAY' as FilterTab,   label: 'BillPay' },
    { key: 'CASH' as FilterTab,      label: 'Cash' },
    { key: 'WHATSAPP' as FilterTab,  label: 'WhatsApp' },
  ];

  readonly isLoading = signal(true);
  readonly isLive    = signal(true);
  readonly error     = signal<string | null>(null);
  readonly notifications = signal<NotificationHistoryItem[]>([]);
  readonly activeFilter  = signal<FilterTab>('ALL');

  readonly filteredNotifications = computed(() => {
    const filter = this.activeFilter();
    const items  = this.notifications();
    if (filter === 'ALL') return items;
    return items.filter((n) => n.type === filter);
  });

  readonly totalSentToday = computed(() =>
    this.notifications().filter((n) => n.status === 'SENT').length
  );

  readonly failedCount = computed(() =>
    this.notifications().filter((n) => n.status === 'FAILED').length
  );

  readonly pendingCount = computed(() =>
    this.notifications().filter((n) => n.status === 'PENDING').length
  );

  readonly successRate = computed(() => {
    const total = this.notifications().length;
    if (total === 0) return 0;
    return Math.round((this.totalSentToday() / total) * 100);
  });

  ngOnInit(): void {
    this.loadHistory();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(tab: FilterTab): void {
    this.activeFilter.set(tab);
  }

  toggleLive(): void {
    if (this.isLive()) {
      this.stopPolling();
      this.isLive.set(false);
    } else {
      this.isLive.set(true);
      this.startPolling();
    }
  }

  channelLabel(channel: string): string {
    const labels: Record<string, string> = {
      email:   'Email',
      push:    'Push',
      webhook: 'Webhook',
      in_app:  'In-App',
    };
    return labels[channel] ?? channel;
  }

  private loadHistory(): void {
    const orgId = this.sharedState.currentOrganizationId();
    this.error.set(null);

    this.notifService
      .getNotificationHistory(orgId, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.notifications.set(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el historial de notificaciones.');
          this.isLoading.set(false);
        },
      });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      const orgId = this.sharedState.currentOrganizationId();
      this.notifService
        .getNotificationHistory(orgId, 50)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => this.notifications.set(res.data),
          error: () => { /* silenciar errores de polling */ },
        });
    }, 15_000);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
