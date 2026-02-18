/**
 * SystemHealthComponent - Monitor de salud del sistema (vista Admin)
 *
 * Muestra el estado de los servicios externos, tasa de errores,
 * profundidad de colas SQS y alertas recientes.
 * Auto-refresco configurable cada 30 segundos.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, interval, switchMap, startWith } from 'rxjs';
import {
  AdminService,
  SystemHealthStatus,
} from '../../services/admin.service';

@Component({
  selector: 'sp-system-health',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="health-page">
      <header class="page-header">
        <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
        <div class="header-row">
          <h1>Salud del Sistema</h1>
          <div class="auto-refresh-toggle">
            <label class="toggle-label">
              <input
                type="checkbox"
                [checked]="autoRefresh()"
                (change)="toggleAutoRefresh()"
              />
              Auto-refresco (30s)
            </label>
            @if (lastUpdated()) {
              <span class="last-updated">
                Actualizado: {{ lastUpdated() | date:'HH:mm:ss' }}
              </span>
            }
          </div>
        </div>
      </header>

      @if (isLoading() && !health()) {
        <div class="loading">Cargando estado del sistema...</div>
      } @else if (error() && !health()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (health()) {
        <div class="health-grid">
          <!-- Monato API -->
          <div class="health-card">
            <div class="card-header">
              <h2>Monato API</h2>
              <span
                class="indicator"
                [class.online]="health()!.monato_api === 'ONLINE'"
                [class.offline]="health()!.monato_api === 'OFFLINE'"
              >
                <span class="indicator-dot"></span>
                {{ health()!.monato_api }}
              </span>
            </div>
            <p class="meta">
              Ultima revision: {{ health()!.monato_last_check | date:'HH:mm:ss' }}
            </p>
          </div>

          <!-- Tasa de errores -->
          <div class="health-card">
            <div class="card-header">
              <h2>Tasa de errores (1h)</h2>
              <span
                class="error-rate"
                [class.ok]="health()!.error_rate_1h < 1"
                [class.warning]="health()!.error_rate_1h >= 1 && health()!.error_rate_1h < 5"
                [class.critical]="health()!.error_rate_1h >= 5"
              >
                {{ health()!.error_rate_1h | number:'1.1-2' }}%
              </span>
            </div>
            <p class="meta">
              @if (health()!.error_rate_1h < 1) { Dentro de parametros normales }
              @else if (health()!.error_rate_1h < 5) { Tasa de errores elevada }
              @else { Tasa de errores critica }
            </p>
          </div>
        </div>

        <!-- Colas SQS -->
        <section class="section">
          <h2 class="section-title">Profundidad de Colas SQS</h2>
          @if (queueEntries().length === 0) {
            <p class="no-data">No hay datos de colas disponibles.</p>
          } @else {
            <div class="queues-grid">
              @for (q of queueEntries(); track q.name) {
                <div class="queue-card" [class.queue-warning]="q.depth > 100">
                  <span class="queue-name">{{ q.name }}</span>
                  <span class="queue-depth" [class.high]="q.depth > 100">
                    {{ q.depth }}
                  </span>
                  <span class="queue-label">mensajes</span>
                </div>
              }
            </div>
          }
        </section>

        <!-- Alertas recientes -->
        <section class="section">
          <h2 class="section-title">
            Alertas Recientes
            @if (health()!.alerts.length > 0) {
              <span class="alert-count">{{ health()!.alerts.length }}</span>
            }
          </h2>
          @if (health()!.alerts.length === 0) {
            <div class="no-alerts">
              <span class="ok-icon">&#10003;</span>
              No hay alertas activas.
            </div>
          } @else {
            <div class="alerts-list">
              @for (alert of health()!.alerts; track alert.alert_id) {
                <div class="alert-item" [class]="'alert-' + alert.severity.toLowerCase()">
                  <div class="alert-header">
                    <span class="alert-type">{{ alert.type }}</span>
                    <span class="severity-badge" [class]="'sev-' + alert.severity.toLowerCase()">
                      {{ alert.severity }}
                    </span>
                    <span class="alert-time">{{ alert.created_at | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <p class="alert-message">{{ alert.message }}</p>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .health-page {
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

    .header-row h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .auto-refresh-toggle {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #1e293b;
      cursor: pointer;
    }

    .last-updated {
      font-size: 12px;
      color: #64748b;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
    }

    .health-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .health-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .card-header h2 {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .meta {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }

    .indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
    }

    .indicator.online  { background: #dcfce7; color: #166534; }
    .indicator.offline { background: #fee2e2; color: #dc2626; }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .error-rate {
      font-size: 20px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 8px;
    }

    .error-rate.ok       { background: #dcfce7; color: #166534; }
    .error-rate.warning  { background: #fef3c7; color: #92400e; }
    .error-rate.critical { background: #fee2e2; color: #dc2626; }

    .section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .alert-count {
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 12px;
    }

    .no-data {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }

    .queues-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .queue-card {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid #e2e8f0;
    }

    .queue-card.queue-warning {
      border-color: #f59e0b;
      background: #fffbeb;
    }

    .queue-name {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      word-break: break-all;
    }

    .queue-depth {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }

    .queue-depth.high { color: #f59e0b; }

    .queue-label {
      font-size: 11px;
      color: #94a3b8;
    }

    .no-alerts {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #16a34a;
      font-size: 14px;
      font-weight: 500;
    }

    .ok-icon {
      font-size: 18px;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .alert-item {
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid transparent;
    }

    .alert-low    { background: #f8fafc; border-left-color: #64748b; }
    .alert-medium { background: #fffbeb; border-left-color: #f59e0b; }
    .alert-high   { background: #fef2f2; border-left-color: #ef4444; }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .alert-type {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .severity-badge {
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .sev-low    { background: #e2e8f0; color: #475569; }
    .sev-medium { background: #fde68a; color: #92400e; }
    .sev-high   { background: #fecaca; color: #dc2626; }

    .alert-time {
      font-size: 12px;
      color: #94a3b8;
      margin-left: auto;
    }

    .alert-message {
      font-size: 13px;
      color: #475569;
      margin: 0;
    }
  `],
})
export class SystemHealthComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly destroy$ = new Subject<void>();

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly health = signal<SystemHealthStatus | null>(null);
  readonly autoRefresh = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly queueEntries = signal<{ name: string; depth: number }[]>([]);

  ngOnInit(): void {
    this.loadHealth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleAutoRefresh(): void {
    const next = !this.autoRefresh();
    this.autoRefresh.set(next);

    if (next) {
      interval(30_000).pipe(
        startWith(0),
        takeUntil(this.destroy$),
        switchMap(() => this.adminService.getSystemHealth())
      ).subscribe({
        next: (response) => this.handleHealthResponse(response.data),
        error: () => this.error.set('Error al refrescar el estado del sistema.'),
      });
    }
  }

  private loadHealth(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.adminService.getSystemHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleHealthResponse(response.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el estado del sistema.');
          this.isLoading.set(false);
        },
      });
  }

  private handleHealthResponse(data: SystemHealthStatus): void {
    this.health.set(data);
    this.lastUpdated.set(new Date());
    const queues = data?.queue_depths ?? {};
    this.queueEntries.set(
      Object.entries(queues).map(([name, depth]) => ({ name, depth }))
    );
  }
}
