/**
 * BillpayDiscrepanciesComponent - EP-SP-026
 *
 * Tabla global de discrepancias BillPay entre todas las organizaciones.
 * Permite filtrar, ver detalles y resolver discrepancias con justificacion.
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
import { Subject, takeUntil } from 'rxjs';
import {
  BillpayMonitorService,
  Discrepancy,
  DiscrepancyType,
} from './billpay-monitor.service';

// Datos mock para la vista (la API de discrepancias globales no esta implementada aun)
const MOCK_DISCREPANCIES: Discrepancy[] = [
  {
    discrepancy_id: 'disc-001',
    org_id: 'org-abc-001',
    transaction_id: 'txn-0001',
    biller_name: 'CFE Electricidad',
    amount: 1250.50,
    discrepancy_type: 'STATUS_MISMATCH',
    local_status: 'COMPLETED',
    provider_status: 'PENDING',
    detected_at: '2025-01-15T10:30:00Z',
    resolved: false,
  },
  {
    discrepancy_id: 'disc-002',
    org_id: 'org-xyz-002',
    transaction_id: 'txn-0002',
    biller_name: 'SACMEX Agua',
    amount: 380.00,
    discrepancy_type: 'AMOUNT_MISMATCH',
    local_status: 'COMPLETED',
    provider_status: 'COMPLETED',
    detected_at: '2025-01-16T14:00:00Z',
    resolved: false,
  },
  {
    discrepancy_id: 'disc-003',
    org_id: 'org-abc-001',
    transaction_id: 'txn-0003',
    biller_name: 'Telmex Internet',
    amount: 599.00,
    discrepancy_type: 'STATUS_MISMATCH',
    local_status: 'FAILED',
    provider_status: 'COMPLETED',
    detected_at: '2025-01-17T09:00:00Z',
    resolved: false,
  },
];

@Component({
  selector: 'sp-billpay-discrepancies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="discrepancies-page">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/sp/admin/billpay" class="back-link">&#8592; Dashboard BillPay</a>
          <h1>Discrepancias BillPay</h1>
          <p class="subtitle">{{ pendingCount() }} discrepancia(s) pendientes de resolucion</p>
        </div>
      </header>

      <!-- Filtros -->
      <div class="filters-bar">
        <select class="filter-select" [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()">
          <option value="">Todos los tipos</option>
          <option value="STATUS_MISMATCH">STATUS MISMATCH</option>
          <option value="AMOUNT_MISMATCH">AMOUNT MISMATCH</option>
        </select>
        <div class="date-filters">
          <input
            class="date-input"
            type="date"
            [(ngModel)]="dateFrom"
            (ngModelChange)="applyFilters()"
            placeholder="Desde"
          />
          <span class="date-sep">&#8594;</span>
          <input
            class="date-input"
            type="date"
            [(ngModel)]="dateTo"
            (ngModelChange)="applyFilters()"
            placeholder="Hasta"
          />
        </div>
        <span class="results-count">{{ filteredDiscrepancies().length }} resultado(s)</span>
      </div>

      @if (isLoading()) {
        <div class="loading">Cargando discrepancias...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (filteredDiscrepancies().length === 0) {
        <div class="empty-state">
          <p>&#10003; No hay discrepancias con los filtros aplicados.</p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Org ID</th>
                <th>Transaction ID</th>
                <th>Biller</th>
                <th>Monto</th>
                <th>Tipo</th>
                <th>Estado Local</th>
                <th>Estado Proveedor</th>
                <th>Detectado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredDiscrepancies(); track item.discrepancy_id) {
                <tr [class.resolved-row]="item.resolved">
                  <td class="mono">{{ item.org_id | slice:0:10 }}...</td>
                  <td class="mono">{{ item.transaction_id | slice:0:10 }}...</td>
                  <td class="biller-name">{{ item.biller_name }}</td>
                  <td class="amount">{{ item.amount | currency:'MXN':'symbol':'1.2-2' }}</td>
                  <td>
                    <span class="type-badge" [class]="typeClass(item.discrepancy_type)">
                      {{ item.discrepancy_type | slice:0:6 }}...
                    </span>
                  </td>
                  <td>
                    <span class="status-pill">{{ item.local_status }}</span>
                  </td>
                  <td>
                    <span class="status-pill">{{ item.provider_status }}</span>
                  </td>
                  <td class="date">{{ item.detected_at | date:'dd/MM/yy HH:mm' }}</td>
                  <td>
                    @if (item.resolved) {
                      <span class="resolved-text">Resuelto</span>
                    } @else {
                      <button
                        class="btn btn-sm btn-resolve"
                        (click)="openResolveForm(item)"
                        [disabled]="actionLoading()"
                      >Resolver</button>
                    }
                  </td>
                </tr>
                <!-- Formulario inline de resolucion -->
                @if (resolvingId() === item.discrepancy_id) {
                  <tr class="resolve-row">
                    <td colspan="9">
                      <div class="resolve-form">
                        <span class="resolve-label">Justificacion de resolucion:</span>
                        <textarea
                          class="resolve-textarea"
                          [(ngModel)]="resolveJustification"
                          placeholder="Ingresa la justificacion detallada..."
                          rows="2"
                        ></textarea>
                        <div class="resolve-actions">
                          <button class="btn btn-outline" (click)="cancelResolve()">Cancelar</button>
                          <button
                            class="btn btn-primary"
                            (click)="confirmResolve(item)"
                            [disabled]="!resolveJustification.trim() || actionLoading()"
                          >Confirmar Resolucion</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .discrepancies-page {
      padding: 24px;
      max-width: 1400px;
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

    .header-left h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .filters-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #1e293b;
      background: white;
      cursor: pointer;
      outline: none;
    }

    .filter-select:focus { border-color: #2563eb; }

    .date-filters {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .date-input {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #1e293b;
      outline: none;
    }

    .date-input:focus { border-color: #2563eb; }

    .date-sep { color: #94a3b8; font-size: 14px; }

    .results-count {
      font-size: 13px;
      color: #64748b;
    }

    .loading, .empty-state {
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
      font-size: 13px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .resolved-row td { opacity: 0.55; }
    .resolve-row td { background: #f8fafc; padding: 0; }

    .mono { font-family: monospace; font-size: 11px; color: #64748b; }
    .biller-name { font-weight: 500; }
    .amount { font-weight: 600; font-variant-numeric: tabular-nums; }
    .date { color: #64748b; font-size: 12px; }

    .type-badge {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .type-status-mismatch { background: #fef3c7; color: #92400e; }
    .type-amount-mismatch  { background: #fee2e2; color: #dc2626; }

    .status-pill {
      padding: 2px 8px;
      background: #f1f5f9;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      color: #475569;
    }

    .resolved-text {
      font-size: 12px;
      color: #16a34a;
      font-weight: 600;
    }

    /* Formulario inline */
    .resolve-form {
      padding: 16px 20px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    .resolve-label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
      padding-top: 8px;
    }

    .resolve-textarea {
      flex: 1;
      min-width: 260px;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      resize: vertical;
      outline: none;
    }

    .resolve-textarea:focus { border-color: #2563eb; }

    .resolve-actions {
      display: flex;
      gap: 8px;
      padding-top: 4px;
    }

    /* Botones */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 7px;
      cursor: pointer;
      border: none;
      padding: 8px 14px;
      transition: all 0.15s;
      text-decoration: none;
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

    .btn-resolve {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .btn-resolve:hover:not(:disabled) { background: #fde68a; }
  `],
})
export class BillpayDiscrepanciesComponent implements OnInit, OnDestroy {
  private readonly monitorService = inject(BillpayMonitorService);
  private readonly destroy$ = new Subject<void>();

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly discrepancies = signal<Discrepancy[]>([...MOCK_DISCREPANCIES]);
  readonly actionLoading = signal(false);
  readonly resolvingId = signal<string | null>(null);

  /** Cantidad de discrepancias pendientes de resolucion. */
  readonly pendingCount = computed(
    () => this.discrepancies().filter((d) => !d.resolved).length
  );

  /** Discrepancias filtradas por tipo y rango de fecha. */
  readonly filteredDiscrepancies = computed(() => {
    let items = this.discrepancies();

    if (this.typeFilter) {
      items = items.filter((d) => d.discrepancy_type === this.typeFilter);
    }

    if (this.dateFrom) {
      items = items.filter((d) => d.detected_at >= this.dateFrom);
    }

    if (this.dateTo) {
      items = items.filter((d) => d.detected_at <= this.dateTo + 'T23:59:59Z');
    }

    return items;
  });

  typeFilter: DiscrepancyType | '' = '';
  dateFrom = '';
  dateTo = '';
  resolveJustification = '';

  ngOnInit(): void {
    // Los datos mock ya estan cargados; en produccion se llamaria a la API aqui.
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    // La senial computed() reacciona automaticamente a los cambios de filtro
  }

  /** Clase CSS para el badge de tipo de discrepancia. */
  typeClass(type: DiscrepancyType): string {
    const map: Record<DiscrepancyType, string> = {
      STATUS_MISMATCH: 'type-status-mismatch',
      AMOUNT_MISMATCH: 'type-amount-mismatch',
    };
    return map[type] ?? '';
  }

  openResolveForm(item: Discrepancy): void {
    this.resolveJustification = '';
    this.resolvingId.set(item.discrepancy_id);
  }

  cancelResolve(): void {
    this.resolvingId.set(null);
    this.resolveJustification = '';
  }

  /** Resuelve la discrepancia y actualiza el estado local. */
  confirmResolve(item: Discrepancy): void {
    if (!this.resolveJustification.trim()) return;

    this.actionLoading.set(true);
    this.monitorService
      .resolveDiscrepancy(item.discrepancy_id, this.resolveJustification.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Marca la discrepancia como resuelta en el estado local
          this.discrepancies.update((items) =>
            items.map((d) =>
              d.discrepancy_id === item.discrepancy_id ? { ...d, resolved: true } : d
            )
          );
          this.actionLoading.set(false);
          this.cancelResolve();
        },
        error: () => {
          this.actionLoading.set(false);
          this.error.set('No se pudo resolver la discrepancia. Intente nuevamente.');
        },
      });
  }
}
