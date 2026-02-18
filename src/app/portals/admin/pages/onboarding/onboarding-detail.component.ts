/**
 * OnboardingDetailComponent - EP-SP-025
 *
 * Detalle de un proceso de onboarding de organizacion.
 * Muestra tracker de pasos, informacion general y permite aprobar/rechazar.
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  OnboardingCatalogService,
  OnboardingRecord,
  OnboardingStep,
} from '../../services/onboarding-catalog.service';

const ALL_STEPS: OnboardingStep[] = [
  'EMPRESA_INFO',
  'PRODUCTOS',
  'DOCUMENTOS',
  'LEGAL',
  'CONFORMIDAD',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  EMPRESA_INFO: 'Empresa Info',
  PRODUCTOS: 'Productos',
  DOCUMENTOS: 'Documentos',
  LEGAL: 'Legal',
  CONFORMIDAD: 'Conformidad',
};

@Component({
  selector: 'sp-onboarding-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="onboarding-detail-page">
      <header class="page-header">
        <a routerLink="/sp/admin/onboarding" class="back-link">&#8592; Onboardings</a>
        <div class="header-row">
          <h1>Detalle de Onboarding</h1>
          @if (onboarding()) {
            <span class="status-badge" [class]="statusClass(onboarding()!.status)">
              {{ onboarding()!.status }}
            </span>
          }
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando detalle...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (onboarding()) {
        <!-- Tracker de pasos -->
        <section class="card">
          <h2>Progreso del Onboarding</h2>
          <div class="step-tracker">
            @for (step of ALL_STEPS; track step; let i = $index) {
              <div class="step-item" [class]="stepItemClass(step)">
                <div class="step-circle">
                  @if (isStepCompleted(step)) {
                    <span>&#10003;</span>
                  } @else {
                    <span>{{ i + 1 }}</span>
                  }
                </div>
                <span class="step-label">{{ stepLabel(step) }}</span>
              </div>
              @if (i < ALL_STEPS.length - 1) {
                <div class="step-connector" [class.completed]="isStepCompleted(step)"></div>
              }
            }
          </div>
        </section>

        <!-- Informacion general -->
        <section class="card">
          <h2>Informacion General</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Org ID</span>
              <span class="info-value mono">{{ onboarding()!.org_id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tier</span>
              <span class="tier-badge" [class]="'tier-' + onboarding()!.tier.toLowerCase()">
                {{ onboarding()!.tier }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span class="status-badge" [class]="statusClass(onboarding()!.status)">
                {{ onboarding()!.status }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Creado</span>
              <span class="info-value">{{ onboarding()!.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            @if (onboarding()!.approved_by) {
              <div class="info-item">
                <span class="info-label">Aprobado por</span>
                <span class="info-value">{{ onboarding()!.approved_by }}</span>
              </div>
            }
            @if (onboarding()!.rejection_reason) {
              <div class="info-item full-width">
                <span class="info-label rejection-label">Motivo de Rechazo</span>
                <span class="info-value rejection-value">{{ onboarding()!.rejection_reason }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Acciones -->
        @if (canAct()) {
          <section class="card actions-card">
            <h2>Acciones</h2>
            <div class="action-buttons">
              <button
                class="btn btn-success"
                (click)="approve()"
                [disabled]="actionLoading()"
              >&#10003; Aprobar Onboarding</button>
              <button
                class="btn btn-danger"
                (click)="openRejectModal()"
                [disabled]="actionLoading()"
              >&#10005; Rechazar Onboarding</button>
            </div>
          </section>
        }
      }

      <!-- Modal de rechazo -->
      @if (rejectModalOpen()) {
        <div class="modal-backdrop" (click)="closeRejectModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Rechazar Onboarding</h3>
            <p class="modal-subtitle">Esta accion no se puede deshacer.</p>
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
    .onboarding-detail-page {
      padding: 24px;
      max-width: 900px;
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
      gap: 12px;
    }

    .header-row h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
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

    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      margin-bottom: 20px;
    }

    .card h2 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 20px;
    }

    /* Tracker de pasos */
    .step-tracker {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      overflow-x: auto;
      gap: 0;
      padding-bottom: 4px;
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 80px;
    }

    .step-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      border: 2px solid #e2e8f0;
      background: #f8fafc;
      color: #94a3b8;
    }

    .step-item.completed .step-circle {
      background: #dcfce7;
      border-color: #16a34a;
      color: #16a34a;
    }

    .step-item.current .step-circle {
      background: #dbeafe;
      border-color: #2563eb;
      color: #2563eb;
    }

    .step-label {
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      font-weight: 500;
    }

    .step-item.completed .step-label { color: #16a34a; }
    .step-item.current .step-label   { color: #2563eb; font-weight: 600; }

    .step-connector {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      min-width: 24px;
      margin-bottom: 24px;
    }

    .step-connector.completed { background: #16a34a; }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item.full-width { grid-column: 1 / -1; }

    .info-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .info-value {
      font-size: 14px;
      color: #1e293b;
    }

    .mono { font-family: monospace; font-size: 12px; }

    .rejection-label { color: #dc2626; }
    .rejection-value {
      background: #fef2f2;
      color: #dc2626;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
    }

    /* Badges */
    .tier-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }
    .tier-admin { background: #fef3c7; color: #92400e; }
    .tier-b2b   { background: #eff6ff; color: #1d4ed8; }
    .tier-b2c   { background: #f0fdf4; color: #166534; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }
    .status-draft        { background: #f1f5f9; color: #475569; }
    .status-submitted    { background: #dbeafe; color: #1d4ed8; }
    .status-under-review { background: #fef3c7; color: #92400e; }
    .status-approved     { background: #dcfce7; color: #16a34a; }
    .status-rejected     { background: #fee2e2; color: #dc2626; }

    /* Actions card */
    .actions-card { border-left: 4px solid #f59e0b; }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      padding: 10px 20px;
      transition: all 0.15s;
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .btn-outline:hover { border-color: #2563eb; color: #2563eb; }
    .btn-success { background: #16a34a; color: white; }
    .btn-success:hover:not(:disabled) { background: #15803d; }
    .btn-danger  { background: #dc2626; color: white; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }

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
export class OnboardingDetailComponent implements OnInit, OnDestroy {
  private readonly onboardingService = inject(OnboardingCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  readonly ALL_STEPS = ALL_STEPS;

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly onboarding = signal<OnboardingRecord | null>(null);
  readonly actionLoading = signal(false);
  readonly rejectModalOpen = signal(false);

  /** True si el onboarding esta en UNDER_REVIEW y se puede actuar. */
  readonly canAct = computed(() => this.onboarding()?.status === 'UNDER_REVIEW');

  rejectReason = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOnboarding(id);
    } else {
      this.error.set('ID de onboarding no encontrado en la ruta.');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Devuelve la clase del item del tracker segun su estado. */
  stepItemClass(step: OnboardingStep): string {
    const ob = this.onboarding();
    if (!ob) return '';
    if (ob.completed_steps?.includes(step)) return 'completed';
    if (ob.current_step === step) return 'current';
    return 'pending';
  }

  /** True si el paso ya fue completado. */
  isStepCompleted(step: OnboardingStep): boolean {
    return this.onboarding()?.completed_steps?.includes(step) ?? false;
  }

  /** Etiqueta legible de cada paso. */
  stepLabel(step: OnboardingStep): string {
    return STEP_LABELS[step] ?? step;
  }

  /** Clase CSS del badge de estado. */
  statusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'status-draft',
      SUBMITTED: 'status-submitted',
      UNDER_REVIEW: 'status-under-review',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
    };
    return map[status] ?? 'status-draft';
  }

  /** Aprueba el onboarding actual. */
  approve(): void {
    const id = this.onboarding()?.onboarding_id;
    if (!id) return;

    this.actionLoading.set(true);
    this.onboardingService.approveOnboarding(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.loadOnboarding(id);
        },
        error: () => {
          this.actionLoading.set(false);
          this.error.set('No se pudo aprobar el onboarding.');
        },
      });
  }

  openRejectModal(): void {
    this.rejectReason = '';
    this.rejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectModalOpen.set(false);
  }

  /** Confirma el rechazo con el motivo ingresado. */
  confirmReject(): void {
    const id = this.onboarding()?.onboarding_id;
    if (!id || !this.rejectReason.trim()) return;

    this.actionLoading.set(true);
    this.onboardingService.rejectOnboarding(id, this.rejectReason.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeRejectModal();
          this.loadOnboarding(id);
        },
        error: () => {
          this.actionLoading.set(false);
          this.error.set('No se pudo rechazar el onboarding.');
        },
      });
  }

  private loadOnboarding(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.onboardingService.getOnboarding(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.onboarding.set(response.data ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el detalle del onboarding.');
          this.isLoading.set(false);
        },
      });
  }
}
