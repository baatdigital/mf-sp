/**
 * MovementsHistoryComponent - Historial completo de movimientos B2B
 *
 * Muestra todos los movimientos de la organizacion con filtros por
 * rango de fechas, tipo (CREDIT/DEBIT) y cuenta. Incluye paginacion
 * y boton de exportacion.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { MovementsTableComponent } from '../../../../shared/components/index';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';
import { LedgerEntry } from '../../../../domain/models/ledger-entry.model';

@Component({
  selector: 'sp-movements-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MovementsTableComponent,
  ],
  template: `
    <div class="movements-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Dashboard</a>
        <div class="header-row">
          <h1 class="page-title">Historial de Movimientos</h1>
          <button class="btn-export" (click)="onExport()" [disabled]="isLoading()">
            Exportar CSV
          </button>
        </div>
      </header>

      <!-- Filtros -->
      <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="filter-bar">
        <!-- Selector de cuenta -->
        <div class="filter-field">
          <label class="filter-label" for="filterAccount">Cuenta</label>
          <select id="filterAccount" formControlName="accountId" class="filter-select">
            <option value="">Todas las cuentas</option>
            @for (acc of accounts(); track acc.account_id) {
              <option [value]="acc.account_id">
                {{ acc.name ?? acc.account_type }}
              </option>
            }
          </select>
        </div>

        <!-- Tipo de movimiento -->
        <div class="filter-field">
          <label class="filter-label" for="filterType">Tipo</label>
          <select id="filterType" formControlName="entryType" class="filter-select">
            <option value="">Todos</option>
            <option value="CREDIT">Credito</option>
            <option value="DEBIT">Debito</option>
          </select>
        </div>

        <!-- Fecha desde -->
        <div class="filter-field">
          <label class="filter-label" for="filterFrom">Desde</label>
          <input
            id="filterFrom"
            type="date"
            formControlName="dateFrom"
            class="filter-input"
          />
        </div>

        <!-- Fecha hasta -->
        <div class="filter-field">
          <label class="filter-label" for="filterTo">Hasta</label>
          <input
            id="filterTo"
            type="date"
            formControlName="dateTo"
            class="filter-input"
          />
        </div>

        <div class="filter-actions">
          <button type="submit" class="btn-apply" [disabled]="isLoading()">
            Buscar
          </button>
          <button type="button" class="btn-clear" (click)="clearFilters()">
            Limpiar
          </button>
        </div>
      </form>

      <!-- Error -->
      @if (error()) {
        <div class="page-error" role="alert">{{ error() }}</div>
      }

      <!-- Tabla de movimientos -->
      <div class="table-card">
        <sp-movements-table
          [entries]="movements()"
          [isLoading]="isLoading()"
          [showAccountColumn]="!filterForm.get('accountId')?.value"
          [pageSize]="pageSize"
        />
      </div>

      <!-- Paginacion -->
      @if (!isLoading() && totalMovements() > pageSize) {
        <div class="pagination-bar">
          <button
            class="page-btn"
            [disabled]="currentPage() <= 1"
            (click)="prevPage()"
          >
            &#8592; Anterior
          </button>
          <span class="page-info">
            Pagina {{ currentPage() }} de {{ totalPages() }}
          </span>
          <button
            class="page-btn"
            [disabled]="currentPage() >= totalPages()"
            (click)="nextPage()"
          >
            Siguiente &#8594;
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .movements-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 20px;
    }

    .back-link {
      display: inline-block;
      color: #6b7280;
      font-size: 13px;
      text-decoration: none;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #374151; }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .btn-export {
      padding: 8px 18px;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-export:hover:not(:disabled) { background: #f1f5f9; }
    .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Filters */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 140px;
    }

    .filter-label {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
    }

    .filter-select,
    .filter-input {
      padding: 7px 10px;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 13px;
      color: #111827;
      background: #ffffff;
      outline: none;
    }

    .filter-select:focus,
    .filter-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59,130,246,0.12);
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .btn-apply {
      padding: 7px 18px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-apply:hover:not(:disabled) { background: #1d4ed8; }
    .btn-apply:disabled { background: #93c5fd; cursor: not-allowed; }

    .btn-clear {
      padding: 7px 14px;
      background: #ffffff;
      color: #6b7280;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-clear:hover { background: #f9fafb; }

    /* Error */
    .page-error {
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 14px;
      margin-bottom: 16px;
    }

    /* Table */
    .table-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 16px;
    }

    .page-btn {
      padding: 7px 16px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 13px;
      color: #374151;
      cursor: pointer;
      transition: background 0.15s;
    }

    .page-btn:hover:not(:disabled) { background: #f1f5f9; }
    .page-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .page-info {
      font-size: 13px;
      color: #6b7280;
    }
  `],
})
export class MovementsHistoryComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly fb = inject(FormBuilder);

  readonly pageSize = 20;
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly accounts = signal<FinancialAccount[]>([]);
  readonly movements = signal<LedgerEntry[]>([]);
  readonly totalMovements = signal(0);
  readonly currentPage = signal(1);

  // Computed total de paginas basado en total de movimientos
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalMovements() / this.pageSize))
  );

  filterForm!: FormGroup;

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      accountId: [''],
      entryType: [''],
      dateFrom: [''],
      dateTo: [''],
    });
    this.loadAccounts();
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadMovements();
  }

  clearFilters(): void {
    this.filterForm.reset({ accountId: '', entryType: '', dateFrom: '', dateTo: '' });
    this.currentPage.set(1);
    this.loadMovements();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadMovements();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadMovements();
    }
  }

  onExport(): void {
    // Mock: en produccion se conecta al endpoint de exportacion del backend
    const rows = this.movements();
    if (rows.length === 0) return;
    const header = 'Fecha,Tipo,Concepto,Monto,Saldo\n';
    const csv = rows.map((e) =>
      `${e.created_at},${e.entry_type},${e.concept},${e.amount},${e.balance_after}`
    ).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadAccounts(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      this.error.set('No se encontro organizacion activa.');
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        this.accounts.set(res.data ?? []);
        this.loadMovements();
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Error al cargar las cuentas.');
      },
    });
  }

  private loadMovements(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;

    const filters = this.filterForm.value;
    const accountId = filters.accountId;

    // Si hay cuenta especifica, cargar sus movimientos
    if (accountId) {
      this.loadAccountMovements(orgId, accountId, filters);
      return;
    }

    // Sin cuenta especifica: cargar movimientos de la primera cuenta activa
    const firstActive = this.accounts().find((a) => a.status === 'ACTIVE');
    if (firstActive) {
      this.loadAccountMovements(orgId, firstActive.account_id, filters);
    } else {
      this.isLoading.set(false);
      this.movements.set([]);
    }
  }

  private loadAccountMovements(
    orgId: string,
    accountId: string,
    filters: { entryType: string; dateFrom: string; dateTo: string }
  ): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.accountsAdapter.getLedgerEntries(orgId, accountId, this.currentPage(), this.pageSize).subscribe({
      next: (res) => {
        let entries: LedgerEntry[] = res.data ?? [];

        // Filtrado en cliente (el backend no siempre soporta todos los filtros)
        if (filters.entryType) {
          entries = entries.filter((e) => e.entry_type === filters.entryType);
        }
        if (filters.dateFrom) {
          entries = entries.filter((e) => e.created_at >= filters.dateFrom);
        }
        if (filters.dateTo) {
          entries = entries.filter((e) => e.created_at <= filters.dateTo + 'T23:59:59');
        }

        this.movements.set(entries);
        this.totalMovements.set(res.total ?? entries.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Error al cargar los movimientos.');
      },
    });
  }
}
