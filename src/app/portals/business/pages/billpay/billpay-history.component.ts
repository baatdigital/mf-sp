/**
 * BillpayHistoryComponent - Historial de pagos de servicios B2B
 *
 * Tabla paginada con filtros por tipo de servicio, estado y rango de fechas.
 * Badges de estado: COMPLETED=verde / FAILED=rojo / PENDING=ambar.
 * Exportar CSV y ver comprobante por registro.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  BillpayServiceApi,
  BillpayHistoryItem,
} from '../../services/billpay.service';
import { SharedStateService } from '@shared-state';

const PAGE_SIZE = 20;

@Component({
  selector: 'sp-billpay-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history-page">
      <header class="page-header">
        <a routerLink="/sp/business/billpay" class="back-link">&#8592; Catalogo de servicios</a>
        <div class="header-row">
          <div>
            <h1>Historial de Pagos</h1>
            <p class="subtitle">Todos los pagos de servicios de tu organizacion</p>
          </div>
          <button type="button" class="btn-export" (click)="exportarCSV()" [disabled]="filteredItems().length === 0">
            Exportar CSV
          </button>
        </div>
      </header>

      <!-- Filtros -->
      <div class="filters-bar">
        <div class="filter-group">
          <label class="filter-label" for="filterServiceType">Tipo de servicio</label>
          <select id="filterServiceType" [(ngModel)]="filterServiceType" class="filter-input" (change)="applyFilters()">
            <option value="">Todos</option>
            <option value="CFE">CFE</option>
            <option value="TELMEX">Telmex</option>
            <option value="SAT">SAT</option>
            <option value="IMSS">IMSS</option>
            <option value="TELCEL">Telcel</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label" for="filterStatus">Estado</label>
          <select id="filterStatus" [(ngModel)]="filterStatus" class="filter-input" (change)="applyFilters()">
            <option value="">Todos</option>
            <option value="COMPLETED">Completado</option>
            <option value="PENDING">Pendiente</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label" for="filterDateFrom">Desde</label>
          <input
            id="filterDateFrom"
            type="date"
            [(ngModel)]="filterDateFrom"
            class="filter-input"
            (change)="applyFilters()"
          />
        </div>
        <div class="filter-group">
          <label class="filter-label" for="filterDateTo">Hasta</label>
          <input
            id="filterDateTo"
            type="date"
            [(ngModel)]="filterDateTo"
            class="filter-input"
            (change)="applyFilters()"
          />
        </div>
        <div class="filter-actions">
          <button type="button" class="btn-search" (click)="applyFilters()">Buscar</button>
          <button type="button" class="btn-clear" (click)="clearFilters()">Limpiar</button>
        </div>
      </div>

      <!-- Tabla -->
      @if (isLoading()) {
        <div class="loading-state" role="status">
          <div class="spinner"></div>
          <span>Cargando historial...</span>
        </div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button type="button" class="btn-retry" (click)="loadHistory()">Reintentar</button>
        </div>
      } @else if (filteredItems().length === 0) {
        <div class="empty-state">
          <p class="empty-icon">📭</p>
          <p>No hay pagos que coincidan con los filtros</p>
        </div>
      } @else {
        <div class="table-wrapper" role="region" aria-label="Historial de pagos">
          <table class="history-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Servicio</th>
                <th scope="col">Referencia</th>
                <th scope="col">Monto</th>
                <th scope="col">Estado</th>
                <th scope="col">Accion</th>
              </tr>
            </thead>
            <tbody>
              @for (item of paginatedItems(); track item.transaction_id) {
                <tr [class.row-selected]="selectedTxnId() === item.transaction_id">
                  <td>{{ item.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <strong>{{ item.service_name }}</strong>
                    <span class="service-id-tag">{{ item.service_id }}</span>
                  </td>
                  <td class="mono">{{ item.reference }}</td>
                  <td class="amount-cell">{{ item.amount | currency:'MXN':'symbol':'1.2-2' }}</td>
                  <td>
                    <span class="status-badge" [class]="'status-' + item.status.toLowerCase()">
                      {{ statusLabel(item.status) }}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-comprobante"
                      (click)="toggleComprobante(item.transaction_id)"
                      [attr.aria-expanded]="selectedTxnId() === item.transaction_id"
                    >
                      {{ selectedTxnId() === item.transaction_id ? 'Ocultar' : 'Ver comprobante' }}
                    </button>
                  </td>
                </tr>
                @if (selectedTxnId() === item.transaction_id) {
                  <tr class="detail-row">
                    <td colspan="6">
                      <div class="comprobante-panel">
                        <h4>Comprobante de pago</h4>
                        <div class="comprobante-grid">
                          <div class="comp-item">
                            <span class="comp-label">ID Transaccion</span>
                            <span class="comp-value mono">{{ item.transaction_id }}</span>
                          </div>
                          <div class="comp-item">
                            <span class="comp-label">Servicio</span>
                            <span class="comp-value">{{ item.service_name }}</span>
                          </div>
                          <div class="comp-item">
                            <span class="comp-label">Referencia</span>
                            <span class="comp-value mono">{{ item.reference }}</span>
                          </div>
                          <div class="comp-item">
                            <span class="comp-label">Monto pagado</span>
                            <span class="comp-value">{{ item.amount | currency:'MXN':'symbol':'1.2-2' }}</span>
                          </div>
                          <div class="comp-item">
                            <span class="comp-label">Cuenta origen</span>
                            <span class="comp-value mono">{{ item.account_id }}</span>
                          </div>
                          <div class="comp-item">
                            <span class="comp-label">Fecha</span>
                            <span class="comp-value">{{ item.created_at | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Paginacion -->
        @if (totalPages() > 1) {
          <nav class="pagination" aria-label="Paginacion del historial">
            <button
              type="button"
              class="page-btn"
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)"
              aria-label="Pagina anterior"
            >
              &#8592;
            </button>
            <span class="page-info">
              Pagina {{ currentPage() }} de {{ totalPages() }}
            </span>
            <button
              type="button"
              class="page-btn"
              [disabled]="currentPage() === totalPages()"
              (click)="goToPage(currentPage() + 1)"
              aria-label="Pagina siguiente"
            >
              &#8594;
            </button>
          </nav>
        }

        <p class="total-count">
          {{ filteredItems().length }} registro(s) encontrado(s)
        </p>
      }
    </div>
  `,
  styles: [`
    .history-page {
      padding: 24px;
      max-width: 1024px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 20px; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }

    .btn-export {
      background: #f1f5f9;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn-export:hover:not(:disabled) { background: #e2e8f0; }
    .btn-export:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Filtros */
    .filters-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: flex-end;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 120px;
    }

    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .filter-input {
      padding: 8px 10px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #1e293b;
      background: white;
      outline: none;
      transition: border-color 0.15s;
    }

    .filter-input:focus { border-color: #2563eb; }

    .filter-actions {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      padding-bottom: 1px;
    }

    .btn-search {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-clear {
      background: #f1f5f9;
      color: #374151;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      cursor: pointer;
    }

    /* Loading / Error / Empty */
    .loading-state {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
      padding: 48px;
      color: #64748b;
      font-size: 14px;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state {
      text-align: center;
      padding: 40px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 12px;
    }

    .btn-retry {
      margin-top: 12px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #94a3b8;
    }

    .empty-icon { font-size: 36px; margin: 0 0 8px; }

    /* Tabla */
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .history-table th {
      background: #f8fafc;
      padding: 11px 14px;
      text-align: left;
      font-weight: 600;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }

    .history-table td {
      padding: 12px 14px;
      color: #374151;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .history-table tbody tr:last-child td { border-bottom: none; }

    .history-table tbody tr:hover { background: #f8fafc; }

    .row-selected { background: #eff6ff !important; }

    .service-id-tag {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .mono { font-family: 'Courier New', monospace; font-size: 12px; }

    .amount-cell { font-weight: 600; color: #1e293b; }

    /* Status badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .status-completed { background: #dcfce7; color: #15803d; }
    .status-failed { background: #fee2e2; color: #b91c1c; }
    .status-pending { background: #fef9c3; color: #92400e; }

    .btn-comprobante {
      background: none;
      border: 1.5px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
      color: #2563eb;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn-comprobante:hover { background: #eff6ff; }

    /* Detalle comprobante */
    .detail-row td {
      background: #f0f9ff;
      padding: 0;
    }

    .comprobante-panel {
      padding: 16px 20px;
      border-top: 1px dashed #bae6fd;
    }

    .comprobante-panel h4 {
      font-size: 13px;
      font-weight: 700;
      color: #0369a1;
      margin: 0 0 12px;
    }

    .comprobante-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
    }

    .comp-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .comp-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .comp-value {
      font-size: 13px;
      color: #1e293b;
    }

    /* Paginacion */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 20px;
    }

    .page-btn {
      background: #f1f5f9;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .page-btn:hover:not(:disabled) { background: #e2e8f0; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .page-info { font-size: 13px; color: #64748b; }

    .total-count {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 10px;
    }

    @media (max-width: 640px) {
      .history-page { padding: 16px; }
      .filters-bar { padding: 12px; }
      .filter-group { min-width: 100%; }
    }
  `],
})
export class BillpayHistoryComponent implements OnInit {
  private readonly billpayService = inject(BillpayServiceApi);
  private readonly sharedState = inject(SharedStateService);

  // Estado de lista y filtros
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly allItems = signal<BillpayHistoryItem[]>([]);
  readonly filteredItems = signal<BillpayHistoryItem[]>([]);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly selectedTxnId = signal<string | null>(null);

  // Valores de filtro (two-way binding con ngModel)
  filterServiceType = '';
  filterStatus = '';
  filterDateFrom = '';
  filterDateTo = '';

  // Paginacion computada
  readonly totalPages = computed(() => Math.ceil(this.filteredItems().length / PAGE_SIZE));

  readonly paginatedItems = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredItems().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    const orgId = this.sharedState.currentOrganizationId();
    this.isLoading.set(true);
    this.error.set(null);

    // Usamos account_id vacío para obtener el historial global de la org
    this.billpayService.getBillpayHistory(orgId, '').subscribe({
      next: (res) => {
        const items = res.data ?? [];
        this.allItems.set(items);
        this.total.set(res.total ?? items.length);
        this.filteredItems.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial. Intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    const items = this.allItems();
    const result = items.filter((item) => {
      const matchService = !this.filterServiceType || item.service_id === this.filterServiceType;
      const matchStatus = !this.filterStatus || item.status === this.filterStatus;
      const matchFrom = !this.filterDateFrom || item.created_at >= this.filterDateFrom;
      const matchTo = !this.filterDateTo || item.created_at.substring(0, 10) <= this.filterDateTo;
      return matchService && matchStatus && matchFrom && matchTo;
    });
    this.filteredItems.set(result);
    this.currentPage.set(1);
    this.selectedTxnId.set(null);
  }

  clearFilters(): void {
    this.filterServiceType = '';
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filteredItems.set(this.allItems());
    this.currentPage.set(1);
    this.selectedTxnId.set(null);
  }

  goToPage(page: number): void {
    const max = this.totalPages();
    if (page < 1 || page > max) { return; }
    this.currentPage.set(page);
    this.selectedTxnId.set(null);
  }

  toggleComprobante(txnId: string): void {
    this.selectedTxnId.update((prev) => (prev === txnId ? null : txnId));
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      COMPLETED: 'Completado',
      FAILED: 'Fallido',
      PENDING: 'Pendiente',
    };
    return labels[status] ?? status;
  }

  /** Exporta los registros filtrados como archivo CSV descargable */
  exportarCSV(): void {
    const items = this.filteredItems();
    if (items.length === 0) { return; }

    const headers = ['Fecha', 'Servicio', 'Referencia', 'Monto', 'Estado', 'Cuenta', 'ID Transaccion'];
    const rows = items.map((item) => [
      item.created_at,
      item.service_name,
      item.reference,
      item.amount.toFixed(2),
      item.status,
      item.account_id,
      item.transaction_id,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-servicios-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
