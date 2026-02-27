/**
 * TransferStatusTrackerComponent
 *
 * Muestra el estado de una transferencia en tiempo real con polling.
 * EP-SP-013: US-SP-051
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';

export type TransferStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'REVERSED';

export interface TransferStatusData {
  id: string;
  status: TransferStatus;
  amount: number;
  currency: string;
  concept: string;
  source_account_id?: string;
  destination_clabe?: string;
  destination_name?: string;
  tracking_code?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

const TERMINAL_STATUSES: TransferStatus[] = ['COMPLETED', 'FAILED', 'REJECTED', 'REVERSED'];

const STEPS: { status: TransferStatus[]; label: string }[] = [
  { status: ['PENDING', 'PENDING_APPROVAL'], label: 'Creada' },
  { status: ['PROCESSING'], label: 'Procesando' },
  { status: ['COMPLETED', 'FAILED', 'REJECTED', 'REVERSED'], label: 'Finalizada' },
];

const STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: 'Pendiente',
  PENDING_APPROVAL: 'Pendiente de aprobacion',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  REJECTED: 'Rechazada',
  REVERSED: 'Revertida',
};

@Component({
  selector: 'sp-transfer-status-tracker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-transfer-tracker">
      <!-- Stepper -->
      <div class="sp-transfer-tracker__stepper">
        @for (step of steps; track step.label; let i = $index) {
          <div [class]="stepClass(step.status, i)">
            <div class="sp-transfer-tracker__step-circle">
              @if (isCompleted(step.status)) {
                <span>✓</span>
              } @else if (isCurrent(step.status)) {
                <span class="sp-transfer-tracker__spinner"></span>
              } @else {
                <span>{{ i + 1 }}</span>
              }
            </div>
            <span class="sp-transfer-tracker__step-label">{{ step.label }}</span>
          </div>
          @if (i < steps.length - 1) {
            <div [class]="'sp-transfer-tracker__connector' + (isCompleted(step.status) ? ' completed' : '')"></div>
          }
        }
      </div>

      <!-- Estado actual -->
      @if (transferData()) {
        <div class="sp-transfer-tracker__info">
          <div class="sp-transfer-tracker__status-badge" [class]="'status-' + transferData()!.status.toLowerCase()">
            {{ statusLabel(transferData()!.status) }}
          </div>
          <div class="sp-transfer-tracker__details">
            <div class="sp-transfer-tracker__detail-row">
              <span>Monto</span>
              <strong>{{ transferData()!.amount | currency:'MXN':'symbol':'1.2-2' }}</strong>
            </div>
            @if (transferData()!.tracking_code) {
              <div class="sp-transfer-tracker__detail-row">
                <span>Clave rastreo</span>
                <strong>{{ transferData()!.tracking_code }}</strong>
              </div>
            }
            @if (transferData()!.destination_clabe) {
              <div class="sp-transfer-tracker__detail-row">
                <span>Destino</span>
                <strong>{{ transferData()!.destination_clabe }}</strong>
              </div>
            }
            @if (transferData()!.destination_name) {
              <div class="sp-transfer-tracker__detail-row">
                <span>Beneficiario</span>
                <strong>{{ transferData()!.destination_name }}</strong>
              </div>
            }
            <div class="sp-transfer-tracker__detail-row">
              <span>Concepto</span>
              <strong>{{ transferData()!.concept }}</strong>
            </div>
            <div class="sp-transfer-tracker__detail-row">
              <span>Creada</span>
              <strong>{{ transferData()!.created_at | date:'dd/MM/yy HH:mm' }}</strong>
            </div>
            @if (transferData()!.completed_at) {
              <div class="sp-transfer-tracker__detail-row">
                <span>Completada</span>
                <strong>{{ transferData()!.completed_at! | date:'dd/MM/yy HH:mm' }}</strong>
              </div>
            }
            @if (transferData()!.error_message) {
              <div class="sp-transfer-tracker__error">
                ⚠️ {{ transferData()!.error_message }}
              </div>
            }
          </div>
        </div>
      } @else if (loading()) {
        <div class="sp-transfer-tracker__loading">Cargando estado...</div>
      }
    </div>
  `,
  styles: [`
    .sp-transfer-tracker { font-family: system-ui, sans-serif; padding: 16px; }
    .sp-transfer-tracker__stepper { display: flex; align-items: center; margin-bottom: 20px; }
    .sp-transfer-tracker__step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .sp-transfer-tracker__step-circle {
      width: 32px; height: 32px; border-radius: 50%; border: 2px solid #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; background: white; color: #718096;
    }
    .sp-transfer-tracker__step.completed .sp-transfer-tracker__step-circle {
      background: #38a169; border-color: #38a169; color: white;
    }
    .sp-transfer-tracker__step.current .sp-transfer-tracker__step-circle {
      border-color: #3182ce; color: #3182ce;
    }
    .sp-transfer-tracker__step.failed .sp-transfer-tracker__step-circle {
      background: #e53e3e; border-color: #e53e3e; color: white;
    }
    .sp-transfer-tracker__step-label { font-size: 11px; color: #718096; text-align: center; white-space: nowrap; }
    .sp-transfer-tracker__connector { flex: 1; height: 2px; background: #e2e8f0; margin: 0 4px; margin-bottom: 20px; }
    .sp-transfer-tracker__connector.completed { background: #38a169; }
    .sp-transfer-tracker__spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid #3182ce; border-top-color: transparent;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sp-transfer-tracker__status-badge {
      display: inline-block; padding: 4px 12px; border-radius: 12px;
      font-size: 13px; font-weight: 700; margin-bottom: 12px;
    }
    .status-completed { background: #c6f6d5; color: #276749; }
    .status-failed, .status-rejected { background: #fed7d7; color: #9b2c2c; }
    .status-processing { background: #bee3f8; color: #2a4365; }
    .status-pending, .status-pending_approval { background: #fefcbf; color: #744210; }
    .status-reversed { background: #e2e8f0; color: #4a5568; }
    .sp-transfer-tracker__details { display: flex; flex-direction: column; gap: 8px; }
    .sp-transfer-tracker__detail-row { display: flex; justify-content: space-between; font-size: 13px; }
    .sp-transfer-tracker__detail-row span { color: #718096; }
    .sp-transfer-tracker__error {
      margin-top: 8px; padding: 8px 12px; background: #fff5f5;
      border: 1px solid #fed7d7; border-radius: 6px; font-size: 13px; color: #c53030;
    }
    .sp-transfer-tracker__loading { text-align: center; padding: 20px; color: #718096; font-size: 13px; }
  `],
})
export class TransferStatusTrackerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);

  // Inputs
  transferId = input.required<string>();
  orgId = input<string>('');
  autoRefresh = input(true);
  refreshInterval = input(5000);

  // Outputs
  statusChange = output<TransferStatus>();
  completed = output<TransferStatusData>();
  failed = output<TransferStatusData>();

  // Internal
  readonly transferData = signal<TransferStatusData | null>(null);
  readonly loading = signal(false);

  readonly steps = STEPS;

  private _intervalId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this._load();
    if (this.autoRefresh()) {
      this._intervalId = setInterval(() => this._load(), this.refreshInterval());
    }
  }

  ngOnDestroy(): void {
    if (this._intervalId) clearInterval(this._intervalId);
  }

  private _load(): void {
    const id = this.transferId();
    const org = this.orgId();
    if (!id) return;

    this.loading.set(true);
    const url = org
      ? `${environment.apiUrl}/organizations/${org}/transfers/${id}`
      : `${environment.apiUrl}/transfers/${id}`;

    this.http.get<TransferStatusData>(url).subscribe({
      next: (data) => {
        this.loading.set(false);
        const prev = this.transferData();
        this.transferData.set(data);

        if (!prev || prev.status !== data.status) {
          this.statusChange.emit(data.status);
        }
        if (TERMINAL_STATUSES.includes(data.status)) {
          if (this._intervalId) clearInterval(this._intervalId);
          if (data.status === 'COMPLETED') {
            this.completed.emit(data);
          } else {
            this.failed.emit(data);
          }
        }
      },
      error: () => this.loading.set(false),
    });
  }

  isCompleted(statuses: TransferStatus[]): boolean {
    const current = this.transferData()?.status;
    if (!current) return false;
    const currentIdx = STEPS.findIndex((s) => s.status.includes(current));
    const stepIdx = STEPS.findIndex((s) => statuses.some((st) => s.status.includes(st)));
    return currentIdx > stepIdx;
  }

  isCurrent(statuses: TransferStatus[]): boolean {
    const current = this.transferData()?.status;
    return !!current && statuses.includes(current);
  }

  stepClass(statuses: TransferStatus[], _i: number): string {
    if (this.isCompleted(statuses)) return 'sp-transfer-tracker__step completed';
    if (this.isCurrent(statuses)) {
      const current = this.transferData()?.status;
      if (current && ['FAILED', 'REJECTED'].includes(current)) return 'sp-transfer-tracker__step failed';
      return 'sp-transfer-tracker__step current';
    }
    return 'sp-transfer-tracker__step';
  }

  statusLabel(status: TransferStatus): string {
    return STATUS_LABELS[status] ?? status;
  }
}
