/**
 * GlobalTransfersComponent - Monitor global de transferencias (vista Admin)
 *
 * Muestra todas las transferencias de la plataforma con filtros por tipo,
 * estado y rango de fechas. Incluye tarjetas de resumen por estado.
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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  AdminService,
  AdminTransfer,
  TransferFilters,
} from '../../services/admin.service';

interface TransferSummary {
  pending_amount: number;
  processing_amount: number;
  completed_amount: number;
  failed_amount: number;
}

@Component({
  selector: 'sp-global-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="transfers-page">
      <header class="page-header">
        <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
        <h1>Monitor de Transferencias</h1>
      </header>

      <!-- Tarjetas de resumen por estado -->
      @if (!isLoading() && summary()) {
        <div class="summary-grid">
          <div class="summary-card pending">
            <span class="summary-label">Pendiente</span>
            <span class="summary-amount">{{ summary()!.pending_amount | currency:'MXN':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-card processing">
            <span class="summary-label">Procesando</span>
            <span class="summary-amount">{{ summary()!.processing_amount | currency:'MXN':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-card completed">
            <span class="summary-label">Completado</span>
            <span class="summary-amount">{{ summary()!.completed_amount | currency:'MXN':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-card failed">
            <span class="summary-label">Fallido</span>
            <span class="summary-amount">{{ summary()!.failed_amount | currency:'MXN':'symbol':'1.2-2' }}</span>
          </div>
        </div>
      }

      <!-- Filtros -->
      <div class="filters-bar">
        <select class="filter-select" [(ngModel)]="selectedType" (ngModelChange)="applyFilters()">
          <option value="">Todos los tipos</option>
          <option value="SPEI">SPEI</option>
          <option value="CASH">CASH</option>
          <option value="INTER_ORG">INTER_ORG</option>
        </select>
        <select class="filter-select" [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
          <option value="">Todos los estados</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select class="filter-select" [(ngModel)]="selectedDateRange" (ngModelChange)="applyFilters()">
          <option value="today">Hoy</option>
          <option value="7d">Ultimos 7 dias</option>
          <option value="30d">Ultimos 30 dias</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="loading">Cargando transferencias...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (transfers().length === 0) {
        <div class="empty-state">
          <p>No se encontraron transferencias con los filtros aplicados.</p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Tipo</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              @for (t of transfers(); track t.transfer_id) {
                <tr>
                  <td class="mono">{{ t.transfer_id | slice:0:8 }}...</td>
                  <td>
                    <span class="type-badge" [class]="'type-' + t.type.toLowerCase()">
                      {{ t.type }}
                    </span>
                  </td>
                  <td class="org-cell">{{ t.from_org | slice:0:8 }}...</td>
                  <td class="org-cell">{{ t.to_org | slice:0:8 }}...</td>
                  <td class="amount">{{ t.amount | currency:'MXN':'symbol':'1.2-2' }}</td>
                  <td>
                    <span
                      class="status-badge"
                      [class.pending]="t.status === 'PENDING'"
                      [class.processing]="t.status === 'PROCESSING'"
                      [class.completed]="t.status === 'COMPLETED'"
                      [class.failed]="t.status === 'FAILED'"
                    >{{ t.status }}</span>
                  </td>
                  <td class="date">{{ t.created_at | date:'dd/MM HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginacion -->
        <div class="pagination">
          <button
            class="btn btn-sm btn-outline"
            [disabled]="currentPage() === 1"
            (click)="goToPage(currentPage() - 1)"
          >&#8592; Anterior</button>
          <span class="page-info">
            Pagina {{ currentPage() }} &bull; {{ total() }} resultados
          </span>
          <button
            class="btn btn-sm btn-outline"
            [disabled]="currentPage() * pageSize >= total()"
            (click)="goToPage(currentPage() + 1)"
          >Siguiente &#8594;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .transfers-page {
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

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-left: 4px solid transparent;
    }

    .summary-card.pending    { border-left-color: #f59e0b; }
    .summary-card.processing { border-left-color: #3b82f6; }
    .summary-card.completed  { border-left-color: #22c55e; }
    .summary-card.failed     { border-left-color: #ef4444; }

    .summary-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .summary-amount {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }

    .filters-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1e293b;
      background: white;
      cursor: pointer;
      outline: none;
    }

    .filter-select:focus {
      border-color: #2563eb;
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
      overflow-x: auto;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      margin-bottom: 16px;
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
    .org-cell { font-family: monospace; font-size: 12px; color: #64748b; }
    .date { color: #64748b; font-size: 13px; white-space: nowrap; }
    .amount { font-weight: 600; }

    .type-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .type-spei      { background: #eff6ff; color: #1d4ed8; }
    .type-cash      { background: #f0fdf4; color: #166534; }
    .type-inter_org { background: #faf5ff; color: #7e22ce; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.pending    { background: #fef3c7; color: #92400e; }
    .status-badge.processing { background: #dbeafe; color: #1d4ed8; }
    .status-badge.completed  { background: #dcfce7; color: #166534; }
    .status-badge.failed     { background: #fee2e2; color: #dc2626; }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .page-info {
      font-size: 13px;
      color: #64748b;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      padding: 5px 12px;
      transition: all 0.15s;
    }

    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .btn-outline:hover  { border-color: #2563eb; color: #2563eb; }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class GlobalTransfersComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly destroy$ = new Subject<void>();

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly transfers = signal<AdminTransfer[]>([]);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly summary = signal<TransferSummary | null>(null);

  readonly pageSize = 20;
  selectedType = '';
  selectedStatus = '';
  selectedDateRange: 'today' | '7d' | '30d' = 'today';

  ngOnInit(): void {
    this.loadTransfers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadTransfers();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadTransfers();
  }

  private buildFilters(): TransferFilters {
    return {
      type: this.selectedType || undefined,
      status: this.selectedStatus || undefined,
      date_range: this.selectedDateRange,
      page: this.currentPage(),
      page_size: this.pageSize,
    };
  }

  private loadTransfers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.adminService.getAllTransfers(this.buildFilters())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.transfers.set(response.data ?? []);
          this.total.set(response.total ?? 0);
          this.summary.set(response.summary ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las transferencias.');
          this.isLoading.set(false);
        },
      });
  }
}
