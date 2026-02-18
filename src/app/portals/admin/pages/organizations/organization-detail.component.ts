/**
 * OrganizationDetailComponent - Detalle de una organizacion (vista Admin)
 *
 * Muestra el detalle completo de una organizacion: info, cuentas y movimientos recientes.
 * Lee el orgId desde los parametros de la ruta.
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import {
  AdminService,
  AdminOrganizationDetail,
} from '../../services/admin.service';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { FinancialAccount } from '@domain/models/financial-account.model';
import { LedgerEntry } from '@domain/models/ledger-entry.model';
import {
  MovementsTableComponent,
  AccountTreeComponent,
} from '../../../../shared/components/index';

@Component({
  selector: 'sp-organization-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MovementsTableComponent, AccountTreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="org-detail-page">
      <header class="page-header">
        <a routerLink="/sp/admin/organizations" class="back-link">&#8592; Organizaciones</a>
        @if (organization()) {
          <h1>{{ organization()!.name }}</h1>
          <p class="subtitle">{{ organization()!.org_id }}</p>
        } @else if (!isLoading()) {
          <h1>Organizacion no encontrada</h1>
        }
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando detalle de la organizacion...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (organization()) {
        <!-- Info de la organizacion -->
        <section class="section">
          <h2 class="section-title">Informacion General</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nombre</span>
              <span class="info-value">{{ organization()!.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tier</span>
              <span class="tier-badge" [class]="'tier-' + organization()!.tier.toLowerCase()">
                {{ organization()!.tier }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span
                class="status-badge"
                [class.active]="organization()!.status === 'ACTIVE'"
                [class.frozen]="organization()!.status === 'FROZEN'"
                [class.closed]="organization()!.status === 'CLOSED'"
              >{{ organization()!.status }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Creada</span>
              <span class="info-value">{{ organization()!.created_at | date:'dd/MM/yyyy' }}</span>
            </div>
            @if (organization()!.contact_email) {
              <div class="info-item">
                <span class="info-label">Email de contacto</span>
                <span class="info-value">{{ organization()!.contact_email }}</span>
              </div>
            }
            @if (organization()!.tax_id) {
              <div class="info-item">
                <span class="info-label">RFC / Tax ID</span>
                <span class="info-value mono">{{ organization()!.tax_id }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Arbol de cuentas -->
        <section class="section">
          <h2 class="section-title">Cuentas Financieras ({{ accounts().length }})</h2>
          @if (accountsLoading()) {
            <div class="loading-sm">Cargando cuentas...</div>
          } @else {
            <sp-account-tree [accounts]="accounts()" />
          }
        </section>

        <!-- Movimientos recientes -->
        <section class="section">
          <h2 class="section-title">Movimientos Recientes</h2>
          <sp-movements-table
            [entries]="recentMovements()"
            [isLoading]="movementsLoading()"
            [showAccountColumn]="true"
            [pageSize]="10"
          />
        </section>
      }
    </div>
  `,
  styles: [`
    .org-detail-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
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
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-family: monospace;
      font-size: 13px;
      margin: 0;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    .loading-sm {
      padding: 16px;
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
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      font-size: 14px;
      color: #1e293b;
    }

    .info-value.mono { font-family: monospace; }
    .mono { font-family: monospace; }

    .tier-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .tier-admin { background: #fef3c7; color: #92400e; }
    .tier-b2b   { background: #eff6ff; color: #1d4ed8; }
    .tier-b2c   { background: #f0fdf4; color: #166534; }

    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.active  { background: #dcfce7; color: #16a34a; }
    .status-badge.frozen  { background: #dbeafe; color: #1d4ed8; }
    .status-badge.closed  { background: #fee2e2; color: #dc2626; }
  `],
})
export class OrganizationDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly destroy$ = new Subject<void>();

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly organization = signal<AdminOrganizationDetail | null>(null);
  readonly accounts = signal<FinancialAccount[]>([]);
  readonly accountsLoading = signal(false);
  readonly recentMovements = signal<LedgerEntry[]>([]);
  readonly movementsLoading = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap((params) => {
        const orgId = params.get('orgId') ?? '';
        this.isLoading.set(true);
        this.error.set(null);
        return this.adminService.getOrganization(orgId);
      })
    ).subscribe({
      next: (response) => {
        this.organization.set(response.data ?? null);
        this.isLoading.set(false);
        if (response.data) {
          this.loadAccounts(response.data.org_id);
        }
      },
      error: () => {
        this.error.set('No se pudo cargar el detalle de la organizacion.');
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAccounts(orgId: string): void {
    this.accountsLoading.set(true);

    this.accountsAdapter.getAccounts(orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const accountsList = response.data ?? [];
          this.accounts.set(accountsList);
          this.accountsLoading.set(false);
          if (accountsList.length > 0) {
            this.loadMovements(orgId, accountsList[0].account_id);
          }
        },
        error: () => {
          this.accountsLoading.set(false);
        },
      });
  }

  private loadMovements(orgId: string, accountId: string): void {
    this.movementsLoading.set(true);

    this.accountsAdapter.getLedgerEntries(orgId, accountId, 1, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentMovements.set(response.data ?? []);
          this.movementsLoading.set(false);
        },
        error: () => {
          this.movementsLoading.set(false);
        },
      });
  }
}
