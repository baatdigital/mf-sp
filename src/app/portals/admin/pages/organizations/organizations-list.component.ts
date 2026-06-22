/**
 * OrganizationsListComponent - Lista de organizaciones (vista Admin)
 *
 * Muestra todas las organizaciones registradas en la plataforma SuperPago,
 * con busqueda, filtros por tier/status y paginacion.
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
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  AdminService,
  AdminOrganization,
  OrganizationFilters,
} from '../../services/admin.service';

@Component({
  selector: 'sp-organizations-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="organizations-page">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
          <h1>Organizaciones</h1>
        </div>
      </header>

      <!-- Filtros -->
      <div class="filters-bar">
        <input
          class="search-input"
          type="text"
          placeholder="Buscar por nombre u org_id..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange($event)"
        />
        <select class="filter-select" [(ngModel)]="selectedTier" (ngModelChange)="applyFilters()">
          <option value="">Todos los tiers</option>
          <option value="ADMIN">ADMIN</option>
          <option value="B2B">B2B</option>
          <option value="B2C">B2C</option>
        </select>
        <select class="filter-select" [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
          <option value="">Todos los estados</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="FROZEN">FROZEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="loading">Cargando organizaciones...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (organizations().length === 0) {
        <div class="empty-state">
          <p>No se encontraron organizaciones con los filtros aplicados.</p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Org ID</th>
                <th>Nombre</th>
                <th>Tier</th>
                <th>Estado</th>
                <th>Cuentas</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (org of organizations(); track org.org_id) {
                <tr>
                  <td class="mono">{{ org.org_id | slice:0:8 }}...</td>
                  <td class="org-name">{{ org.name }}</td>
                  <td>
                    <span class="tier-badge" [class]="'tier-' + org.tier.toLowerCase()">
                      {{ org.tier }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="status-badge"
                      [class.active]="org.status === 'ACTIVE'"
                      [class.frozen]="org.status === 'FROZEN'"
                      [class.closed]="org.status === 'CLOSED'"
                    >
                      {{ org.status }}
                    </span>
                  </td>
                  <td class="centered">{{ org.accounts_count }}</td>
                  <td class="date">{{ org.created_at | date:'dd/MM/yyyy' }}</td>
                  <td class="actions">
                    <a
                      [routerLink]="['/sp/admin/organizations', org.org_id]"
                      class="btn btn-sm btn-outline"
                    >Ver</a>
                    @if (org.status === 'ACTIVE') {
                      <button
                        class="btn btn-sm btn-warning"
                        (click)="toggleFreeze(org)"
                      >Congelar</button>
                    } @else if (org.status === 'FROZEN') {
                      <button
                        class="btn btn-sm btn-success"
                        (click)="toggleFreeze(org)"
                      >Descongelar</button>
                    }
                  </td>
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
    .organizations-page {
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

    .filters-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 220px;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      color: #1e293b;
    }

    .search-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
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
      padding: 14px 16px;
      font-size: 14px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .mono { font-family: monospace; font-size: 12px; color: #64748b; }
    .org-name { font-weight: 500; }
    .centered { text-align: center; }
    .date { color: #64748b; font-size: 13px; }

    .tier-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .tier-admin { background: #fef3c7; color: #92400e; }
    .tier-b2b   { background: #eff6ff; color: #1d4ed8; }
    .tier-b2c   { background: #f0fdf4; color: #166534; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.active  { background: #dcfce7; color: #16a34a; }
    .status-badge.frozen  { background: #dbeafe; color: #1d4ed8; }
    .status-badge.closed  { background: #fee2e2; color: #dc2626; }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      text-decoration: none;
      padding: 5px 12px;
      transition: all 0.15s;
    }

    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .btn-outline:hover { border-color: #2563eb; color: #2563eb; }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-warning { background: #fef3c7; color: #92400e; }
    .btn-warning:hover { background: #fde68a; }
    .btn-success { background: #dcfce7; color: #166534; }
    .btn-success:hover { background: #bbf7d0; }

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
  `],
})
export class OrganizationsListComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly organizations = signal<AdminOrganization[]>([]);
  readonly total = signal(0);
  readonly currentPage = signal(1);

  readonly pageSize = 20;
  searchTerm = '';
  selectedTier = '';
  selectedStatus = '';

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadOrganizations();
    });

    this.loadOrganizations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadOrganizations();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadOrganizations();
  }

  toggleFreeze(org: AdminOrganization): void {
    const action = org.status === 'ACTIVE'
      ? this.adminService.freezeOrganization(org.org_id)
      : this.adminService.unfreezeOrganization(org.org_id);

    action.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadOrganizations(),
      error: () => this.error.set('No se pudo actualizar el estado de la organizacion.'),
    });
  }

  private buildFilters(): OrganizationFilters {
    return {
      search: this.searchTerm || undefined,
      tier: this.selectedTier || undefined,
      status: this.selectedStatus || undefined,
      page: this.currentPage(),
      page_size: this.pageSize,
    };
  }

  private loadOrganizations(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.adminService.getOrganizations(this.buildFilters())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.organizations.set(response.data ?? []);
          this.total.set(response.total ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las organizaciones.');
          this.isLoading.set(false);
        },
      });
  }
}
