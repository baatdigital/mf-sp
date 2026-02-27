/**
 * ApprovalsPageComponent
 *
 * Cola de aprobaciones de transferencias pendientes de autorizacion.
 * EP-SP-011: US-SP-045
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PendingTransfer {
  id: string;
  requester: string;
  requester_role: string;
  amount: number;
  currency: string;
  clabe: string;
  destination_name: string;
  bank: string;
  concept: string;
  source_account: string;
  created_at: string;
  expires_at?: string;
  status: ApprovalStatus;
}

interface ActionResult {
  transferId: string;
  action: 'APPROVED' | 'REJECTED';
  comment: string;
}

@Component({
  selector: 'sp-approvals-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-approvals">

      <!-- Header -->
      <div class="sp-approvals__header">
        <div>
          <h1 class="sp-approvals__title">Aprobaciones</h1>
          <p class="sp-approvals__subtitle">
            Transferencias pendientes de autorizacion
          </p>
        </div>
        <div class="sp-approvals__header-stats">
          <div class="sp-approvals__stat sp-approvals__stat--pending">
            <span class="sp-approvals__stat-value">{{ pendingCount() }}</span>
            <span class="sp-approvals__stat-label">Pendientes</span>
          </div>
          <div class="sp-approvals__stat sp-approvals__stat--approved">
            <span class="sp-approvals__stat-value">{{ approvedCount() }}</span>
            <span class="sp-approvals__stat-label">Aprobadas hoy</span>
          </div>
          <div class="sp-approvals__stat sp-approvals__stat--rejected">
            <span class="sp-approvals__stat-value">{{ rejectedCount() }}</span>
            <span class="sp-approvals__stat-label">Rechazadas hoy</span>
          </div>
        </div>
      </div>

      <!-- Aviso de monto minimo -->
      <div class="sp-approvals__notice">
        <span>ℹ</span>
        <span>Las transferencias mayores a <strong>$100,000 MXN</strong> requieren aprobacion de un administrador antes de procesarse.</span>
      </div>

      <!-- Tabla de pendientes -->
      @if (pendingTransfers().length === 0) {
        <div class="sp-approvals__empty">
          <div class="sp-approvals__empty-icon">✅</div>
          <h3>Sin aprobaciones pendientes</h3>
          <p>Todas las transferencias han sido procesadas.</p>
        </div>
      } @else {
        <div class="sp-approvals__table-wrap">
          <table class="sp-approvals__table">
            <thead>
              <tr>
                <th>Solicitante</th>
                <th>Destino</th>
                <th>Cuenta Origen</th>
                <th>Monto</th>
                <th>Concepto</th>
                <th>Solicitado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (txn of pendingTransfers(); track txn.id) {
                <tr [class]="'sp-approvals__row sp-approvals__row--' + txn.status.toLowerCase()">
                  <td>
                    <div class="sp-approvals__requester">
                      <strong>{{ txn.requester }}</strong>
                      <span class="sp-approvals__role-badge">{{ txn.requester_role }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="sp-approvals__dest">
                      <strong>{{ txn.destination_name }}</strong>
                      <span class="sp-approvals__clabe">{{ txn.clabe }}</span>
                      <span class="sp-approvals__bank">{{ txn.bank }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="sp-approvals__source">{{ txn.source_account }}</span>
                  </td>
                  <td>
                    <span class="sp-approvals__amount">
                      {{ txn.amount | currency:txn.currency:'symbol':'1.2-2' }}
                    </span>
                  </td>
                  <td>
                    <span class="sp-approvals__concept">{{ txn.concept }}</span>
                  </td>
                  <td>
                    <span class="sp-approvals__date">
                      {{ txn.created_at | date:'d MMM, HH:mm':'':'es' }}
                    </span>
                  </td>
                  <td>
                    @if (txn.status === 'PENDING') {
                      <div class="sp-approvals__actions">
                        <button
                          (click)="approveTransfer(txn.id)"
                          class="sp-approvals__action-btn sp-approvals__action-btn--approve"
                          [disabled]="processingId() === txn.id">
                          @if (processingId() === txn.id) { ... } @else { Aprobar }
                        </button>
                        <button
                          (click)="rejectTransfer(txn.id)"
                          class="sp-approvals__action-btn sp-approvals__action-btn--reject"
                          [disabled]="processingId() === txn.id">
                          Rechazar
                        </button>
                      </div>
                    } @else if (txn.status === 'APPROVED') {
                      <span class="sp-approvals__status-badge sp-approvals__status-badge--approved">Aprobada</span>
                    } @else {
                      <span class="sp-approvals__status-badge sp-approvals__status-badge--rejected">Rechazada</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Panel de confirmacion reciente -->
      @if (lastAction()) {
        <div [class]="'sp-approvals__last-action sp-approvals__last-action--' + lastAction()!.action.toLowerCase()">
          <span>
            {{ lastAction()!.action === 'APPROVED' ? '✓ Transferencia aprobada' : '✕ Transferencia rechazada' }}
            · ID {{ lastAction()!.transferId }}
          </span>
          <button (click)="lastAction.set(null)" class="sp-approvals__dismiss-btn">✕</button>
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-approvals { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-approvals__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .sp-approvals__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-approvals__subtitle { font-size: 13px; color: #718096; margin: 0; }
    .sp-approvals__header-stats { display: flex; gap: 12px; }

    .sp-approvals__stat {
      display: flex; flex-direction: column; align-items: center;
      padding: 12px 16px; border-radius: 10px; min-width: 80px;
    }
    .sp-approvals__stat--pending { background: #fffaf0; border: 1px solid #fbd38d; }
    .sp-approvals__stat--approved { background: #f0fff4; border: 1px solid #9ae6b4; }
    .sp-approvals__stat--rejected { background: #fff5f5; border: 1px solid #fed7d7; }
    .sp-approvals__stat-value { font-size: 22px; font-weight: 700; }
    .sp-approvals__stat--pending .sp-approvals__stat-value { color: #c05621; }
    .sp-approvals__stat--approved .sp-approvals__stat-value { color: #276749; }
    .sp-approvals__stat--rejected .sp-approvals__stat-value { color: #742a2a; }
    .sp-approvals__stat-label { font-size: 10px; color: #718096; font-weight: 600; margin-top: 2px; }

    /* Notice */
    .sp-approvals__notice {
      display: flex; gap: 8px; align-items: center;
      background: #fffaf0; border: 1px solid #fbd38d; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #744210;
    }

    /* Table */
    .sp-approvals__table-wrap { overflow-x: auto; }
    .sp-approvals__table {
      width: 100%; border-collapse: collapse; font-size: 13px;
      background: white; border-radius: 12px; overflow: hidden;
      border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-approvals__table thead th {
      background: #f7fafc; padding: 12px 14px; text-align: left;
      font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase;
      letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;
    }
    .sp-approvals__row td { padding: 14px; border-bottom: 1px solid #f7fafc; vertical-align: top; }
    .sp-approvals__row:last-child td { border-bottom: none; }
    .sp-approvals__row--approved { background: #f0fff4; }
    .sp-approvals__row--rejected { background: #fff5f5; opacity: 0.75; }

    /* Cells */
    .sp-approvals__requester strong { color: #2d3748; display: block; }
    .sp-approvals__role-badge {
      font-size: 10px; padding: 1px 6px; background: #e9d8fd;
      color: #553c9a; border-radius: 8px; font-weight: 600;
    }
    .sp-approvals__dest strong { color: #2d3748; display: block; font-size: 12px; }
    .sp-approvals__clabe { font-size: 10px; color: #a0aec0; font-family: monospace; display: block; }
    .sp-approvals__bank { font-size: 10px; color: #718096; }
    .sp-approvals__source { font-size: 12px; color: #4a5568; }
    .sp-approvals__amount { font-size: 14px; font-weight: 700; color: #e53e3e; }
    .sp-approvals__concept { font-size: 12px; color: #4a5568; }
    .sp-approvals__date { font-size: 11px; color: #718096; }

    /* Actions */
    .sp-approvals__actions { display: flex; gap: 6px; }
    .sp-approvals__action-btn {
      padding: 5px 14px; border-radius: 7px; font-size: 12px; font-weight: 700;
      cursor: pointer; border: none; transition: all 0.15s;
    }
    .sp-approvals__action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .sp-approvals__action-btn--approve { background: #c6f6d5; color: #276749; }
    .sp-approvals__action-btn--approve:hover:not(:disabled) { background: #9ae6b4; }
    .sp-approvals__action-btn--reject { background: #fed7d7; color: #742a2a; }
    .sp-approvals__action-btn--reject:hover:not(:disabled) { background: #feb2b2; }

    /* Status badge */
    .sp-approvals__status-badge {
      font-size: 11px; padding: 3px 10px; border-radius: 10px; font-weight: 600;
    }
    .sp-approvals__status-badge--approved { background: #c6f6d5; color: #276749; }
    .sp-approvals__status-badge--rejected { background: #fed7d7; color: #742a2a; }

    /* Empty */
    .sp-approvals__empty { text-align: center; padding: 60px 24px; }
    .sp-approvals__empty-icon { font-size: 48px; margin-bottom: 12px; }
    .sp-approvals__empty h3 { font-size: 16px; color: #2d3748; margin: 0 0 6px; }
    .sp-approvals__empty p { font-size: 13px; color: #a0aec0; margin: 0; }

    /* Last action */
    .sp-approvals__last-action {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 16px; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
    }
    .sp-approvals__last-action--approved { background: #c6f6d5; color: #276749; }
    .sp-approvals__last-action--rejected { background: #fed7d7; color: #742a2a; }
    .sp-approvals__dismiss-btn { border: none; background: none; cursor: pointer; font-size: 14px; opacity: 0.7; }
  `],
})
export class ApprovalsPageComponent {
  readonly processingId = signal<string | null>(null);
  readonly lastAction = signal<ActionResult | null>(null);

  readonly pendingTransfers = signal<PendingTransfer[]>([
    {
      id: 'appr-001',
      requester: 'Carlos Mendoza',
      requester_role: 'Operador',
      amount: 250_000.00,
      currency: 'MXN',
      clabe: '002180700254789652',
      destination_name: 'Proveedor Industrial Norte SA',
      bank: 'BBVA Bancomer',
      concept: 'Pago factura #12345 maquinaria',
      source_account: 'Cuenta Maestra',
      created_at: '2026-02-26T09:15:00Z',
      expires_at: '2026-02-26T18:00:00Z',
      status: 'PENDING',
    },
    {
      id: 'appr-002',
      requester: 'Ana Torres Ruiz',
      requester_role: 'Operador',
      amount: 185_500.00,
      currency: 'MXN',
      clabe: '072180000123456787',
      destination_name: 'Constructora del Pacifico',
      bank: 'Banorte',
      concept: 'Anticipo contrato obra nueva',
      source_account: 'Subcuenta Operaciones',
      created_at: '2026-02-26T10:30:00Z',
      status: 'PENDING',
    },
    {
      id: 'appr-003',
      requester: 'Roberto Solis',
      requester_role: 'Operador',
      amount: 420_000.00,
      currency: 'MXN',
      clabe: '014180100123456783',
      destination_name: 'Distribuidora Nacional SA de CV',
      bank: 'Santander',
      concept: 'Liquidacion pedido Q1 2026',
      source_account: 'Cuenta Maestra',
      created_at: '2026-02-26T11:45:00Z',
      status: 'PENDING',
    },
  ]);

  readonly pendingCount = computed(() =>
    this.pendingTransfers().filter((t) => t.status === 'PENDING').length
  );

  readonly approvedCount = computed(() =>
    this.pendingTransfers().filter((t) => t.status === 'APPROVED').length
  );

  readonly rejectedCount = computed(() =>
    this.pendingTransfers().filter((t) => t.status === 'REJECTED').length
  );

  approveTransfer(id: string): void {
    this.processingId.set(id);
    // Simular proceso async
    setTimeout(() => {
      this.pendingTransfers.update((list) =>
        list.map((t) => t.id === id ? { ...t, status: 'APPROVED' as ApprovalStatus } : t)
      );
      this.lastAction.set({ transferId: id, action: 'APPROVED', comment: '' });
      this.processingId.set(null);
    }, 800);
  }

  rejectTransfer(id: string): void {
    this.processingId.set(id);
    setTimeout(() => {
      this.pendingTransfers.update((list) =>
        list.map((t) => t.id === id ? { ...t, status: 'REJECTED' as ApprovalStatus } : t)
      );
      this.lastAction.set({ transferId: id, action: 'REJECTED', comment: '' });
      this.processingId.set(null);
    }, 800);
  }
}
