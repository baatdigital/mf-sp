import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { SpeiTransfer, TransferStatus } from '../../../domain/models/transfer.model';

interface TimelineStep {
  label: string;
  completed: boolean;
  active: boolean;
  failed: boolean;
}

@Component({
  selector: 'sp-transfer-status-tracker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="tracker-container">

      <!-- Loading skeleton -->
      <ng-container *ngIf="isLoading">
        <div class="tracker-body">
          <div class="skeleton-line skeleton-status"></div>
          <div class="skeleton-line skeleton-amount"></div>
          <div class="skeleton-timeline">
            <div class="skeleton-step" *ngFor="let i of [1,2,3]"></div>
          </div>
        </div>
      </ng-container>

      <!-- No transfer -->
      <ng-container *ngIf="!isLoading && transfer === null">
        <div class="tracker-empty">
          <span class="empty-icon">↔</span>
          <p>No hay transferencia seleccionada.</p>
        </div>
      </ng-container>

      <!-- Transfer data -->
      <ng-container *ngIf="!isLoading && transfer !== null">

        <!-- Header with status badge -->
        <div class="tracker-header">
          <div class="header-left">
            <span class="tracker-title">Transferencia SPEI</span>
            <span class="tracker-id">{{ transfer!.transfer_id | slice:0:12 }}...</span>
          </div>
          <div class="header-right">
            <span [class]="getStatusBadgeClass(transfer!.status)">
              {{ getStatusLabel(transfer!.status) }}
            </span>
            <button
              class="refresh-btn"
              (click)="onRefresh()"
              title="Actualizar estado"
              aria-label="Actualizar estado"
            >
              ↻
            </button>
          </div>
        </div>

        <!-- Auto-refresh indicator -->
        <div class="auto-refresh-bar" *ngIf="isAutoRefreshable()">
          <span class="pulse-dot"></span>
          <span class="auto-refresh-text">Actualizando automáticamente...</span>
        </div>

        <!-- Amount & key details -->
        <div class="tracker-details">
          <div class="amount-display">
            <span class="amount-label">Monto</span>
            <span class="amount-value">
              {{ transfer!.amount | currency:'MXN':'symbol':'1.2-2' }}
            </span>
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Cuenta origen</span>
              <span class="detail-value">{{ transfer!.source_account_id | slice:0:10 }}...</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">CLABE destino</span>
              <span class="detail-value clabe">{{ transfer!.destination_clabe }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Beneficiario</span>
              <span class="detail-value">{{ transfer!.destination_name }}</span>
            </div>
            <div class="detail-item" *ngIf="transfer!.destination_bank">
              <span class="detail-label">Banco destino</span>
              <span class="detail-value">{{ transfer!.destination_bank }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Concepto</span>
              <span class="detail-value">{{ transfer!.concept }}</span>
            </div>
            <div class="detail-item" *ngIf="transfer!.tracking_key">
              <span class="detail-label">Clave rastreo</span>
              <span class="detail-value tracking-key">{{ transfer!.tracking_key }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Fecha</span>
              <span class="detail-value">{{ transfer!.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>

          <!-- Error message if failed -->
          <div class="error-box" *ngIf="transfer!.status === 'FAILED' && transfer!.error_message">
            <span class="error-icon">⚠</span>
            <span class="error-text">{{ transfer!.error_message }}</span>
          </div>
        </div>

        <!-- Timeline -->
        <div class="timeline-section">
          <h4 class="timeline-title">Progreso</h4>
          <div class="timeline">
            <div
              class="timeline-step"
              *ngFor="let step of timelineSteps(); let last = last; trackBy: trackByLabel"
            >
              <div class="step-indicator-col">
                <div [class]="getStepCircleClass(step)">
                  <span *ngIf="step.completed && !step.failed">✓</span>
                  <span *ngIf="step.failed">✕</span>
                </div>
                <div class="step-connector" *ngIf="!last" [class.connector-done]="step.completed"></div>
              </div>
              <div class="step-content">
                <span [class]="getStepLabelClass(step)">{{ step.label }}</span>
              </div>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .tracker-container {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      overflow: hidden;
    }

    /* Header */
    .tracker-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #F3F4F6;
    }

    .header-left { display: flex; flex-direction: column; gap: 0.15rem; }
    .header-right { display: flex; align-items: center; gap: 0.5rem; }

    .tracker-title { font-size: 0.9rem; font-weight: 600; color: #111827; }
    .tracker-id { font-size: 0.75rem; color: #9CA3AF; font-family: monospace; }

    /* Status badges */
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-pending    { background: #FEF3C7; color: #92400E; }
    .badge-processing { background: #DBEAFE; color: #1E40AF; }
    .badge-completed  { background: #D1FAE5; color: #065F46; }
    .badge-failed     { background: #FEE2E2; color: #991B1B; }
    .badge-reversed   { background: #F3F4F6; color: #6B7280; }

    .refresh-btn {
      background: none;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      cursor: pointer;
      color: #6B7280;
      transition: all 0.15s;
    }
    .refresh-btn:hover { background: #F3F4F6; }

    /* Auto-refresh bar */
    .auto-refresh-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1.25rem;
      background: #EFF6FF;
      border-bottom: 1px solid #BFDBFE;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3B82F6;
      animation: pulse 1.5s infinite;
    }

    .auto-refresh-text { font-size: 0.75rem; color: #1D4ED8; }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.85); }
    }

    /* Details */
    .tracker-details { padding: 1rem 1.25rem; border-bottom: 1px solid #F3F4F6; }

    .amount-display {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    .amount-label { font-size: 0.75rem; color: #6B7280; }
    .amount-value { font-size: 1.5rem; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem 1rem;
    }

    .detail-item { display: flex; flex-direction: column; gap: 0.1rem; }
    .detail-label { font-size: 0.75rem; color: #9CA3AF; }
    .detail-value { font-size: 0.8125rem; color: #111827; word-break: break-all; }
    .clabe { font-family: monospace; letter-spacing: 0.05em; }
    .tracking-key { font-family: monospace; }

    .error-box {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.625rem 0.875rem;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 6px;
    }
    .error-icon { color: #EF4444; flex-shrink: 0; }
    .error-text { font-size: 0.8125rem; color: #991B1B; }

    /* Timeline */
    .timeline-section { padding: 1rem 1.25rem; }
    .timeline-title { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 600; color: #374151; }

    .timeline { display: flex; flex-direction: column; }

    .timeline-step {
      display: flex;
      gap: 0.75rem;
    }

    .step-indicator-col {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .step-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-circle-pending   { background: #F3F4F6; color: #9CA3AF; border: 2px solid #E5E7EB; }
    .step-circle-active    { background: #DBEAFE; color: #1E40AF; border: 2px solid #3B82F6; }
    .step-circle-completed { background: #D1FAE5; color: #065F46; border: 2px solid #10B981; }
    .step-circle-failed    { background: #FEE2E2; color: #991B1B; border: 2px solid #EF4444; }

    .step-connector {
      width: 2px;
      flex: 1;
      min-height: 20px;
      background: #E5E7EB;
      margin: 3px 0;
    }
    .connector-done { background: #10B981; }

    .step-content {
      padding: 0.125rem 0 0.75rem;
    }

    .step-label         { font-size: 0.8125rem; color: #9CA3AF; }
    .step-label-active  { font-size: 0.8125rem; color: #1D4ED8; font-weight: 600; }
    .step-label-done    { font-size: 0.8125rem; color: #059669; font-weight: 500; }
    .step-label-failed  { font-size: 0.8125rem; color: #DC2626; font-weight: 600; }

    /* Empty */
    .tracker-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
      color: #9CA3AF;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .empty-icon { font-size: 1.75rem; }

    /* Skeleton */
    .tracker-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }

    .skeleton-line {
      height: 1rem;
      background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 4px;
    }
    .skeleton-status { width: 80px; height: 1.5rem; border-radius: 9999px; }
    .skeleton-amount { width: 140px; height: 1.75rem; }
    .skeleton-timeline { display: flex; gap: 1rem; margin-top: 0.5rem; }
    .skeleton-step { width: 64px; height: 48px; border-radius: 6px; background: #F3F4F6; animation: shimmer 1.4s infinite; background-size: 200% 100%; }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class TransferStatusTrackerComponent {
  @Input() transfer: SpeiTransfer | null = null;
  @Input() isLoading = false;
  @Output() refreshRequested = new EventEmitter<void>();

  onRefresh(): void {
    this.refreshRequested.emit();
  }

  isAutoRefreshable(): boolean {
    return this.transfer?.status === 'PENDING' || this.transfer?.status === 'PROCESSING';
  }

  getStatusBadgeClass(status: TransferStatus): string {
    const map: Record<TransferStatus, string> = {
      PENDING:    'badge badge-pending',
      PROCESSING: 'badge badge-processing',
      COMPLETED:  'badge badge-completed',
      FAILED:     'badge badge-failed',
      REVERSED:   'badge badge-reversed',
    };
    return map[status];
  }

  getStatusLabel(status: TransferStatus): string {
    const map: Record<TransferStatus, string> = {
      PENDING:    'Pendiente',
      PROCESSING: 'Procesando',
      COMPLETED:  'Completada',
      FAILED:     'Fallida',
      REVERSED:   'Revertida',
    };
    return map[status];
  }

  timelineSteps(): TimelineStep[] {
    const status = this.transfer?.status ?? 'PENDING';
    return [
      this.buildStep('Iniciada', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'], status),
      this.buildStep('En proceso', ['PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'], status),
      this.buildStep('Completada', ['COMPLETED', 'REVERSED'], status, status === 'FAILED'),
    ];
  }

  getStepCircleClass(step: TimelineStep): string {
    if (step.failed)    return 'step-circle step-circle-failed';
    if (step.completed) return 'step-circle step-circle-completed';
    if (step.active)    return 'step-circle step-circle-active';
    return 'step-circle step-circle-pending';
  }

  getStepLabelClass(step: TimelineStep): string {
    if (step.failed)    return 'step-label step-label-failed';
    if (step.completed) return 'step-label step-label-done';
    if (step.active)    return 'step-label step-label-active';
    return 'step-label';
  }

  trackByLabel(_index: number, step: TimelineStep): string {
    return step.label;
  }

  private buildStep(
    label: string,
    completedStatuses: TransferStatus[],
    currentStatus: TransferStatus,
    isFailed = false,
  ): TimelineStep {
    const completed = completedStatuses.includes(currentStatus);
    return {
      label,
      completed,
      active: !completed,
      failed: isFailed && label === 'Completada',
    };
  }
}
