/**
 * PersonalMovementsComponent - Historial de movimientos del portal personal B2C
 *
 * Lista los asientos del libro mayor con filtro simple por tipo.
 * Sin boton de exportacion (B2C no exporta).
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { PersonalService } from '../../services/personal.service';
import { MovementsTableComponent } from '../../../../shared/components/index';
import { LedgerEntry, EntryType } from '@domain/models/ledger-entry.model';
import { FinancialAccount } from '@domain/models/financial-account.model';

type FilterType = 'all' | 'credits' | 'debits';

@Component({
  selector: 'sp-personal-movements',
  standalone: true,
  imports: [CommonModule, RouterModule, MovementsTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="movements-page">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Mis Movimientos</h1>
        <p class="subtitle">Historial completo de tu cuenta</p>
      </header>

      <!-- Filtro rapido -->
      <div class="filter-bar">
        <button
          class="filter-btn"
          [class.active]="activeFilter() === 'all'"
          (click)="setFilter('all')"
        >
          Todos
        </button>
        <button
          class="filter-btn"
          [class.active]="activeFilter() === 'credits'"
          (click)="setFilter('credits')"
        >
          Entradas
        </button>
        <button
          class="filter-btn"
          [class.active]="activeFilter() === 'debits'"
          (click)="setFilter('debits')"
        >
          Salidas
        </button>
      </div>

      @if (error()) {
        <div class="error-banner" role="alert">
          <span>&#9888; {{ error() }}</span>
          <button class="retry-btn" (click)="reload()">Reintentar</button>
        </div>
      }

      <!-- Tabla de movimientos (usa componente compartido) -->
      <div class="table-wrapper">
        <sp-movements-table
          [entries]="filteredEntries()"
          [isLoading]="isLoading()"
          [pageSize]="50"
        />
      </div>

      @if (!isLoading() && filteredEntries().length === 0 && !error()) {
        <div class="empty-state">
          <p class="empty-icon">&#128196;</p>
          <p class="empty-title">Sin movimientos</p>
          <p class="empty-text">
            {{ activeFilter() === 'all'
              ? 'Aun no tienes movimientos en tu cuenta.'
              : 'No hay movimientos con este filtro.' }}
          </p>
        </div>
      }
    </div>
  `,
  styles: [`
    .movements-page {
      padding: 20px;
      max-width: 700px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 20px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #2563eb; }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 13px;
      margin: 0;
    }

    /* Filtros */
    .filter-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .filter-btn {
      padding: 8px 18px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-btn:hover {
      border-color: #2563eb;
      color: #2563eb;
    }

    .filter-btn.active {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .retry-btn {
      background: none;
      border: 1px solid #dc2626;
      color: #dc2626;
      padding: 4px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    .retry-btn:hover { background: #fef2f2; }

    .table-wrapper {
      background: white;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 48px 20px;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 40px;
      margin: 0 0 12px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 600;
      color: #475569;
      margin: 0 0 6px;
    }

    .empty-text {
      font-size: 13px;
      margin: 0;
    }
  `],
})
export class PersonalMovementsComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly personalService = inject(PersonalService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeFilter = signal<FilterType>('all');

  private readonly allEntries = signal<LedgerEntry[]>([]);
  private readonly account = signal<FinancialAccount | null>(null);

  readonly filteredEntries = (): LedgerEntry[] => {
    const filter = this.activeFilter();
    const entries = this.allEntries();
    if (filter === 'credits') {
      return entries.filter((e) => e.entry_type === 'CREDIT');
    }
    if (filter === 'debits') {
      return entries.filter((e) => e.entry_type === 'DEBIT');
    }
    return entries;
  };

  ngOnInit(): void {
    this.loadMovements();
  }

  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
  }

  reload(): void {
    this.error.set(null);
    this.isLoading.set(true);
    this.loadMovements();
  }

  private loadMovements(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        const accounts = response.data ?? [];
        const active = accounts.find((a) => a.status === 'ACTIVE') ?? null;
        this.account.set(active);

        if (active) {
          this.fetchEntries(orgId, active.account_id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudo cargar la cuenta. Intente de nuevo.');
      },
    });
  }

  private fetchEntries(orgId: string, accountId: string): void {
    this.personalService.getMovements(orgId, accountId, { page_size: 50 }).subscribe({
      next: (response) => {
        this.allEntries.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudieron cargar los movimientos. Intente de nuevo.');
      },
    });
  }
}
