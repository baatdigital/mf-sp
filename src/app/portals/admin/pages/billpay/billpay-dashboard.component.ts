/**
 * BillpayDashboardComponent - EP-SP-026
 *
 * Dashboard de monitoreo y conciliacion de pagos BillPay.
 * Incluye metricas globales, tabla de reportes y ejecucion de conciliaciones.
 * Con auto-refresh cada 30 segundos.
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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Subject,
  timer,
  switchMap,
  startWith,
  takeUntil,
} from 'rxjs';
import {
  BillpayMonitorService,
  ReconciliationReport,
  ReconciliationStatus,
} from './billpay-monitor.service';

interface BillpayMetrics {
  totalPayments: number;
  successRate: number;
  activeDiscrepancies: number;
  avgResolutionHours: number;
}

const AUTO_REFRESH_INTERVAL_MS = 30_000;

@Component({
  selector: 'sp-billpay-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="billpay-page">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
          <h1>Conciliacion BillPay</h1>
        </div>
        <div class="header-actions">
          <label class="auto-refresh-toggle">
            <input
              type="checkbox"
              [checked]="autoRefreshEnabled()"
              (change)="toggleAutoRefresh()"
            />
            Auto-refresh (30s)
          </label>
          <button
            class="btn btn-primary"
            (click)="openReconciliationModal()"
          >&#9654; Ejecutar Conciliacion</button>
        </div>
      </header>

      <!-- Cards de metricas -->
      @if (isLoading() && reports().length === 0) {
        <div class="metrics-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else {
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Total Pagos BillPay</span>
            <span class="metric-value">{{ metrics().totalPayments | number }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Pagos Exitosos</span>
            <span class="metric-value accent-green">{{ metrics().successRate | number:'1.1-1' }}%</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Discrepancias Activas</span>
            <span
              class="metric-value"
              [class.accent-red]="metrics().activeDiscrepancies > 0"
            >
              {{ metrics().activeDiscrepancies }}
              @if (metrics().activeDiscrepancies > 0) {
                <span class="alert-dot"></span>
              }
            </span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Tiempo Prom. Resolucion</span>
            <span class="metric-value">{{ metrics().avgResolutionHours }}h</span>
          </div>
        </div>
      }

      <!-- Filtro y tabla de reportes -->
      <div class="section-header">
        <h2>Reportes de Conciliacion</h2>
        <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
          <option value="">Todos los estados</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      @if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (filteredReports().length === 0 && !isLoading()) {
        <div class="empty-state">
          <p>No hay reportes de conciliacion disponibles.</p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Periodo</th>
                <th>Estado</th>
                <th>Transacciones</th>
                <th>Discrepancias</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (report of filteredReports(); track report.report_id) {
                <tr>
                  <td class="mono">{{ report.report_id | slice:0:12 }}...</td>
                  <td class="date-range">
                    {{ report.period_from | date:'dd/MM/yy' }} &rarr; {{ report.period_to | date:'dd/MM/yy' }}
                  </td>
                  <td>
                    <span class="status-badge" [class]="statusClass(report.status)">
                      {{ report.status }}
                    </span>
                  </td>
                  <td class="centered">{{ report.total_transactions | number }}</td>
                  <td class="centered">
                    @if (report.discrepancies_count > 0) {
                      <span class="discrepancy-count">{{ report.discrepancies_count }}</span>
                    } @else {
                      <span class="none-count">0</span>
                    }
                  </td>
                  <td class="date">{{ report.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <a
                      [routerLink]="['/sp/admin/billpay/discrepancies']"
                      [queryParams]="{ reportId: report.report_id }"
                      class="btn btn-sm btn-outline"
                    >Ver Detalle</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Modal de conciliacion -->
    @if (reconciliationModalOpen()) {
      <div class="modal-backdrop" (click)="closeReconciliationModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Ejecutar Conciliacion</h3>
          <p class="modal-subtitle">Selecciona el periodo a conciliar.</p>

          <div class="form-group">
            <label class="form-label">Org ID</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="reconcileOrgId"
              placeholder="ID de la organizacion..."
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Desde</label>
              <input class="form-input" type="date" [(ngModel)]="periodFrom" />
            </div>
            <div class="form-group">
              <label class="form-label">Hasta</label>
              <input class="form-input" type="date" [(ngModel)]="periodTo" />
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="closeReconciliationModal()">Cancelar</button>
            <button
              class="btn btn-primary"
              (click)="runReconciliation()"
              [disabled]="!canRunReconciliation() || actionLoading()"
            >&#9654; Ejecutar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .billpay-page {
      padding: 24px;
      max-width: 1300px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .header-left h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .auto-refresh-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #475569;
      cursor: pointer;
    }

    /* Metricas */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .skeleton-card {
      height: 100px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 12px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .metric-value.accent-green { color: #16a34a; }
    .metric-value.accent-red   { color: #dc2626; }

    .alert-dot {
      width: 10px;
      height: 10px;
      background: #dc2626;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.6; transform: scale(1.4); }
    }

    /* Tabla */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .section-header h2 {
      font-size: 17px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .filter-select {
      padding: 7px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #1e293b;
      background: white;
      cursor: pointer;
      outline: none;
    }

    .filter-select:focus { border-color: #2563eb; }

    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    .table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      background: #f8fafc;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 13px 16px;
      font-size: 14px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .mono { font-family: monospace; font-size: 12px; color: #64748b; }
    .date { color: #64748b; font-size: 12px; }
    .date-range { font-size: 12px; color: #475569; }
    .centered { text-align: center; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-completed  { background: #dcfce7; color: #16a34a; }
    .status-processing { background: #dbeafe; color: #1d4ed8; }
    .status-failed     { background: #fee2e2; color: #dc2626; }

    .discrepancy-count {
      background: #fee2e2;
      color: #dc2626;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
    }

    .none-count {
      color: #94a3b8;
      font-size: 13px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      padding: 8px 16px;
      text-decoration: none;
      transition: all 0.15s;
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .btn-outline:hover { border-color: #2563eb; color: #2563eb; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      padding: 28px;
      width: 480px;
      max-width: 95vw;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }

    .modal h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
      flex: 1;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }

    .form-input {
      padding: 9px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      color: #1e293b;
      width: 100%;
      box-sizing: border-box;
    }

    .form-input:focus { border-color: #2563eb; }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
  `],
})
export class BillpayDashboardComponent implements OnInit, OnDestroy {
  private readonly monitorService = inject(BillpayMonitorService);
  private readonly destroy$ = new Subject<void>();
  private readonly refreshTrigger$ = new Subject<void>();

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly reports = signal<ReconciliationReport[]>([]);
  readonly autoRefreshEnabled = signal(false);
  readonly actionLoading = signal(false);
  readonly reconciliationModalOpen = signal(false);

  /** Metricas calculadas a partir de los reportes cargados. */
  readonly metrics = computed<BillpayMetrics>(() => {
    const rpts = this.reports();
    const total = rpts.reduce((sum, r) => sum + (r.total_transactions ?? 0), 0);
    const discrepancies = rpts.reduce((sum, r) => sum + (r.discrepancies_count ?? 0), 0);
    const completed = rpts.filter((r) => r.status === 'COMPLETED').length;
    const successRate = rpts.length > 0 ? (completed / rpts.length) * 100 : 0;
    return {
      totalPayments: total,
      successRate,
      activeDiscrepancies: discrepancies,
      avgResolutionHours: 4, // Valor estatico hasta que el backend lo provea
    };
  });

  /** Reportes filtrados por estado seleccionado. */
  readonly filteredReports = computed(() => {
    if (!this.statusFilter) return this.reports();
    return this.reports().filter((r) => r.status === this.statusFilter);
  });

  /** True si todos los campos requeridos para conciliar estan completos. */
  readonly canRunReconciliation = computed(
    () => !!this.reconcileOrgId.trim() && !!this.periodFrom && !!this.periodTo
  );

  statusFilter = '';
  reconcileOrgId = '';
  periodFrom = '';
  periodTo = '';

  ngOnInit(): void {
    this.startDataStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled.set(!this.autoRefreshEnabled());
    // Reinicia el stream con el nuevo estado de auto-refresh
    this.refreshTrigger$.next();
  }

  applyFilter(): void {
    // La senial computed() reacciona automaticamente al cambio de statusFilter
  }

  openReconciliationModal(): void {
    this.reconcileOrgId = '';
    this.periodFrom = '';
    this.periodTo = '';
    this.reconciliationModalOpen.set(true);
  }

  closeReconciliationModal(): void {
    this.reconciliationModalOpen.set(false);
  }

  /** Ejecuta la conciliacion para el periodo y org seleccionados. */
  runReconciliation(): void {
    if (!this.canRunReconciliation()) return;

    this.actionLoading.set(true);
    this.monitorService
      .runReconciliation(this.reconcileOrgId.trim(), {
        from: this.periodFrom,
        to: this.periodTo,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeReconciliationModal();
          this.loadReports();
        },
        error: () => {
          this.actionLoading.set(false);
          this.error.set('No se pudo ejecutar la conciliacion.');
        },
      });
  }

  /** Clase CSS para el badge de estado del reporte. */
  statusClass(status: ReconciliationStatus): string {
    const map: Record<ReconciliationStatus, string> = {
      COMPLETED: 'status-completed',
      PROCESSING: 'status-processing',
      FAILED: 'status-failed',
    };
    return map[status] ?? 'status-processing';
  }

  /**
   * Configura el stream de datos con auto-refresh usando switchMap + startWith.
   * Cuando autoRefreshEnabled es true, recarga cada 30s.
   */
  private startDataStream(): void {
    this.refreshTrigger$
      .pipe(
        startWith(undefined),
        switchMap(() => {
          // Si auto-refresh activo, usa timer; si no, solo carga una vez
          return this.autoRefreshEnabled()
            ? timer(0, AUTO_REFRESH_INTERVAL_MS)
            : timer(0);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadReports());
  }

  private loadReports(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.monitorService
      .getReconciliations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.reports.set(response.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los reportes de conciliacion.');
          this.isLoading.set(false);
        },
      });
  }
}
