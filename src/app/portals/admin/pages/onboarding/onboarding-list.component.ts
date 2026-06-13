/**
 * OnboardingListComponent - EP-SP-025
 *
 * Lista todos los procesos de onboarding de organizaciones en la plataforma.
 * Permite filtrar por estado y ejecutar acciones de aprobacion/rechazo.
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
  OnboardingCatalogService,
  OnboardingRecord,
  OnboardingStatus,
} from '../../services/onboarding-catalog.service';

const ONBOARDING_STEPS_TOTAL = 5;

@Component({
  selector: 'sp-onboarding-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="onboarding-page">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
          <h1>Onboarding de Organizaciones</h1>
        </div>
      </header>

      <!-- Filtro por estado -->
      <div class="filters-bar">
        <select class="filter-select" [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
          <option value="">Todos los estados</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER_REVIEW">UNDER REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <span class="results-count">{{ onboardings().length }} registro(s)</span>
      </div>

      @if (isLoading()) {
        <!-- Skeleton de carga -->
        <div class="skeleton-list">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton-row"></div>
          }
        </div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (onboardings().length === 0) {
        <div class="empty-state">
          <p>No se encontraron onboardings con los filtros seleccionados.</p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Org ID</th>
                <th>Tier</th>
                <th>Estado</th>
                <th>Progreso</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of onboardings(); track item.onboarding_id) {
                <tr>
                  <td class="mono">{{ item.org_id | slice:0:12 }}...</td>
                  <td>
                    <span class="tier-badge" [class]="'tier-' + item.tier.toLowerCase()">
                      {{ item.tier }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class]="statusClass(item.status)">
                      {{ item.status }}
                    </span>
                  </td>
                  <td class="progress-cell">
                    <div class="progress-bar-wrapper">
                      <div
                        class="progress-bar-fill"
                        [style.width]="progressPercent(item) + '%'"
                      ></div>
                    </div>
                    <span class="progress-text">
                      {{ item.completed_steps?.length ?? 0 }}/{{ STEPS_TOTAL }} pasos
                    </span>
                  </td>
                  <td class="date">{{ item.created_at | date:'dd/MM/yyyy' }}</td>
                  <td class="actions">
                    <a
                      [routerLink]="['/sp/admin/onboarding', item.onboarding_id]"
                      class="btn btn-sm btn-outline"
                    >Ver</a>
                    @if (item.status === 'UNDER_REVIEW') {
                      <button
                        class="btn btn-sm btn-success"
                        (click)="approve(item)"
                        [disabled]="actionLoading()"
                      >Aprobar</button>
                      <button
                        class="btn btn-sm btn-danger"
                        (click)="openRejectModal(item)"
                        [disabled]="actionLoading()"
                      >Rechazar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal de rechazo -->
      @if (rejectModalOpen()) {
        <div class="modal-backdrop" (click)="closeRejectModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Rechazar Onboarding</h3>
            <p class="modal-subtitle">Org: {{ selectedItem()?.org_id }}</p>
            <textarea
              class="reason-textarea"
              [(ngModel)]="rejectReason"
              placeholder="Motivo del rechazo (requerido)..."
              rows="4"
            ></textarea>
            <div class="modal-actions">
              <button class="btn btn-outline" (click)="closeRejectModal()">Cancelar</button>
              <button
                class="btn btn-danger"
                (click)="confirmReject()"
                [disabled]="!rejectReason.trim() || actionLoading()"
              >Confirmar Rechazo</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .onboarding-page {
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
      align-items: center;
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

    .filter-select:focus { border-color: #2563eb; }

    .results-count {
      font-size: 13px;
      color: #64748b;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skeleton-row {
      height: 52px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 8px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

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
      overflow-x: auto;
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
      padding: 14px 16px;
      font-size: 14px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .mono { font-family: monospace; font-size: 12px; color: #64748b; }
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
    .status-draft        { background: #f1f5f9; color: #475569; }
    .status-submitted    { background: #dbeafe; color: #1d4ed8; }
    .status-under-review { background: #fef3c7; color: #92400e; }
    .status-approved     { background: #dcfce7; color: #16a34a; }
    .status-rejected     { background: #fee2e2; color: #dc2626; }

    .progress-cell {
      min-width: 160px;
    }

    .progress-bar-wrapper {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .progress-bar-fill {
      height: 100%;
      background: #2563eb;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 11px;
      color: #64748b;
    }

    .actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
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

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .btn-outline:hover { border-color: #2563eb; color: #2563eb; }
    .btn-success { background: #dcfce7; color: #166534; }
    .btn-success:hover { background: #bbf7d0; }
    .btn-danger { background: #fee2e2; color: #dc2626; }
    .btn-danger:hover { background: #fecaca; }

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
      padding: 24px;
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
      margin: 0 0 16px;
      font-family: monospace;
    }

    .reason-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
    }

    .reason-textarea:focus { border-color: #2563eb; }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `],
})
export class OnboardingListComponent implements OnInit, OnDestroy {
  private readonly onboardingService = inject(OnboardingCatalogService);
  private readonly destroy$ = new Subject<void>();

  readonly STEPS_TOTAL = ONBOARDING_STEPS_TOTAL;

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly onboardings = signal<OnboardingRecord[]>([]);
  readonly actionLoading = signal(false);
  readonly rejectModalOpen = signal(false);
  readonly selectedItem = signal<OnboardingRecord | null>(null);

  selectedStatus = '';
  rejectReason = '';

  ngOnInit(): void {
    this.loadOnboardings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.loadOnboardings();
  }

  /** Calcula el porcentaje de progreso de un onboarding. */
  progressPercent(item: OnboardingRecord): number {
    const completed = item.completed_steps?.length ?? 0;
    return Math.round((completed / ONBOARDING_STEPS_TOTAL) * 100);
  }

  /** Devuelve la clase CSS correspondiente al estado. */
  statusClass(status: OnboardingStatus): string {
    const map: Record<OnboardingStatus, string> = {
      DRAFT: 'status-draft',
      SUBMITTED: 'status-submitted',
      UNDER_REVIEW: 'status-under-review',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
    };
    return map[status] ?? 'status-draft';
  }

  /** Aprueba directamente el onboarding seleccionado. */
  approve(item: OnboardingRecord): void {
    this.actionLoading.set(true);
    this.onboardingService.approveOnboarding(item.onboarding_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.loadOnboardings();
        },
        error: () => {
          this.actionLoading.set(false);
          this.error.set('No se pudo aprobar el onboarding. Intente nuevamente.');
        },
      });
  }

  openRejectModal(item: OnboardingRecord): void {
    this.selectedItem.set(item);
    this.rejectReason = '';
    this.rejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectModalOpen.set(false);
    this.selectedItem.set(null);
  }

  /** Confirma el rechazo del onboarding con el motivo ingresado. */
  confirmReject(): void {
    const item = this.selectedItem();
    if (!item || !this.rejectReason.trim()) return;

    this.actionLoading.set(true);
    this.onboardingService.rejectOnboarding(item.onboarding_id, this.rejectReason.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeRejectModal();
          this.loadOnboardings();
        },
        error: () => {
          this.actionLoading.set(false);
          this.error.set('No se pudo rechazar el onboarding. Intente nuevamente.');
        },
      });
  }

  private loadOnboardings(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.onboardingService.getOnboardings(
      this.selectedStatus ? { status: this.selectedStatus } : undefined
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.onboardings.set(response.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los onboardings.');
          this.isLoading.set(false);
        },
      });
  }
}
