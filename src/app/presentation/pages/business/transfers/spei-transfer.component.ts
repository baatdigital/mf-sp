/**
 * SpeiTransferComponent
 *
 * Transferencia SPEI externa desde cuentas de la organizacion.
 * EP-SP-011: US-SP-041
 *
 * Flujo: formulario → tracking de estado en tiempo real
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TransferFormComponent, TransferFormData, TransferAccount, TransferBeneficiary } from '../../../shared/transfer-form/transfer-form.component';
import { TransferStatusTrackerComponent } from '../../../shared/transfer-status-tracker/transfer-status-tracker.component';

type PageState = 'form' | 'tracking';

@Component({
  selector: 'sp-spei-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TransferFormComponent,
    TransferStatusTrackerComponent,
  ],
  template: `
    <div class="sp-spei-transfer">

      <!-- Header -->
      <div class="sp-spei-transfer__header">
        <div>
          <a routerLink="/sp/business/dashboard" class="sp-spei-transfer__back">
            ← Volver al Dashboard
          </a>
          <h1 class="sp-spei-transfer__title">Transferencia SPEI</h1>
          <p class="sp-spei-transfer__subtitle">
            Envio a cualquier banco de Mexico via Sistema de Pagos Electronicos Interbancarios
          </p>
        </div>

        <!-- Indicador de estado -->
        <div class="sp-spei-transfer__state-badge">
          @if (pageState() === 'form') {
            <span class="sp-spei-transfer__state-badge--form">Llenando formulario</span>
          } @else {
            <span class="sp-spei-transfer__state-badge--tracking">Rastreando transferencia</span>
          }
        </div>
      </div>

      <!-- Layout -->
      <div class="sp-spei-transfer__layout">

        <!-- Panel izquierdo: formulario o tracker -->
        <div class="sp-spei-transfer__main">

          @if (pageState() === 'form') {
            <div class="sp-spei-transfer__form-card">
              <sp-transfer-form
                mode="business"
                [accounts]="sourceAccounts()"
                [beneficiaries]="savedBeneficiaries()"
                (submit)="onFormSubmit($event)"
              />
            </div>
          }

          @if (pageState() === 'tracking') {
            <div class="sp-spei-transfer__tracker-card">
              <sp-transfer-status-tracker
                [transferId]="currentTransferId()"
                (completed)="onTransferCompleted()"
                (newTransfer)="onNewTransfer()"
              />
            </div>
          }

        </div>

        <!-- Panel derecho: informacion SPEI -->
        <div class="sp-spei-transfer__sidebar">
          <div class="sp-spei-transfer__info-card">
            <h3 class="sp-spei-transfer__info-title">Informacion SPEI</h3>
            <div class="sp-spei-transfer__info-list">
              <div class="sp-spei-transfer__info-item">
                <span class="sp-spei-transfer__info-icon">⏱</span>
                <div>
                  <strong>Tiempo de acreditacion</strong>
                  <p>Inmediato en horario SPEI (6am-6pm)</p>
                </div>
              </div>
              <div class="sp-spei-transfer__info-item">
                <span class="sp-spei-transfer__info-icon">📅</span>
                <div>
                  <strong>Horario SPEI</strong>
                  <p>Lunes a viernes 6:00 - 18:00 hrs. Sabados 6:00 - 13:00 hrs.</p>
                </div>
              </div>
              <div class="sp-spei-transfer__info-item">
                <span class="sp-spei-transfer__info-icon">💰</span>
                <div>
                  <strong>Comision</strong>
                  <p>$5.80 + IVA por transferencia</p>
                </div>
              </div>
              <div class="sp-spei-transfer__info-item">
                <span class="sp-spei-transfer__info-icon">🔒</span>
                <div>
                  <strong>Requiere aprobacion</strong>
                  <p>Montos mayores a $100,000 MXN requieren doble autorizacion</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Historial reciente -->
          <div class="sp-spei-transfer__recent-card">
            <h3 class="sp-spei-transfer__info-title">Ultimas transferencias SPEI</h3>
            @for (txn of recentTransfers(); track txn.id) {
              <div class="sp-spei-transfer__recent-item">
                <div class="sp-spei-transfer__recent-info">
                  <strong>{{ txn.name }}</strong>
                  <span>{{ txn.clabe }}</span>
                </div>
                <div class="sp-spei-transfer__recent-amount">$ {{ txn.amount | number:'1.2-2' }}</div>
              </div>
            }
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .sp-spei-transfer { padding: 24px; max-width: 1100px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-spei-transfer__back { font-size: 13px; color: #3182ce; text-decoration: none; display: block; margin-bottom: 8px; }
    .sp-spei-transfer__back:hover { text-decoration: underline; }
    .sp-spei-transfer__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .sp-spei-transfer__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-spei-transfer__subtitle { font-size: 13px; color: #718096; margin: 0; }

    /* State badge */
    .sp-spei-transfer__state-badge > span {
      padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .sp-spei-transfer__state-badge--form { background: #ebf8ff; color: #2c5282; }
    .sp-spei-transfer__state-badge--tracking { background: #f0fff4; color: #276749; }

    /* Layout */
    .sp-spei-transfer__layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }

    /* Cards */
    .sp-spei-transfer__form-card,
    .sp-spei-transfer__tracker-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* Sidebar */
    .sp-spei-transfer__sidebar { display: flex; flex-direction: column; gap: 16px; }

    .sp-spei-transfer__info-card,
    .sp-spei-transfer__recent-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-spei-transfer__info-title { font-size: 13px; font-weight: 700; color: #2d3748; margin: 0 0 14px; }

    /* Info list */
    .sp-spei-transfer__info-list { display: flex; flex-direction: column; gap: 12px; }
    .sp-spei-transfer__info-item { display: flex; gap: 10px; align-items: flex-start; }
    .sp-spei-transfer__info-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
    .sp-spei-transfer__info-item strong { font-size: 12px; color: #2d3748; display: block; }
    .sp-spei-transfer__info-item p { font-size: 11px; color: #718096; margin: 2px 0 0; }

    /* Recent */
    .sp-spei-transfer__recent-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #f7fafc;
    }
    .sp-spei-transfer__recent-item:last-child { border-bottom: none; }
    .sp-spei-transfer__recent-info strong { font-size: 12px; color: #2d3748; display: block; }
    .sp-spei-transfer__recent-info span { font-size: 10px; color: #a0aec0; font-family: monospace; }
    .sp-spei-transfer__recent-amount { font-size: 13px; font-weight: 700; color: #e53e3e; }

    @media (max-width: 1024px) {
      .sp-spei-transfer__layout { grid-template-columns: 1fr; }
      .sp-spei-transfer__sidebar { display: none; }
    }
  `],
})
export class SpeiTransferComponent {
  readonly pageState = signal<PageState>('form');
  readonly currentTransferId = signal<string>('');

  readonly sourceAccounts = signal<TransferAccount[]>([
    { id: 'acc-master-001', label: 'Cuenta Maestra Principal', clabe: '646180110400000001', balance: 3_120_500.00, currency: 'MXN' },
    { id: 'acc-sub-001', label: 'Subcuenta Operaciones', clabe: '646180110400000002', balance: 854_200.50, currency: 'MXN' },
    { id: 'acc-sub-002', label: 'Subcuenta Nomina', clabe: '646180110400000003', balance: 420_000.00, currency: 'MXN' },
  ]);

  readonly savedBeneficiaries = signal<TransferBeneficiary[]>([
    { id: 'ben-001', name: 'Proveedor ABC SA de CV', clabe: '002180700254789652', bank: 'BBVA Bancomer', alias: 'Proveedor ABC' },
    { id: 'ben-002', name: 'Maria Elena Gutierrez', clabe: '014180100123456783', bank: 'Santander', alias: 'Maria Elena' },
    { id: 'ben-003', name: 'Constructora del Valle', clabe: '072180000123456787', bank: 'Banorte', alias: 'Constructora Valle' },
    { id: 'ben-004', name: 'GNP Seguros SA', clabe: '044180001234567892', bank: 'ScotiaBank' },
  ]);

  readonly recentTransfers = signal([
    { id: 'r1', name: 'Proveedor ABC', clabe: '002180700254789652', amount: 58_000 },
    { id: 'r2', name: 'Maria Elena G.', clabe: '014180100123456783', amount: 12_500 },
    { id: 'r3', name: 'GNP Seguros', clabe: '044180001234567892', amount: 42_000 },
  ]);

  onFormSubmit(data: TransferFormData): void {
    // Simular ID de transferencia generado por el backend
    const mockTransferId = `SPEI-${Date.now()}`;
    this.currentTransferId.set(mockTransferId);
    this.pageState.set('tracking');
  }

  onTransferCompleted(): void {
    // La transferencia termino (completada o fallida)
    // El tracker maneja el estado final
  }

  onNewTransfer(): void {
    this.currentTransferId.set('');
    this.pageState.set('form');
  }
}
