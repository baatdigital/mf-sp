/**
 * InternalTransferComponent
 *
 * Movimiento interno entre cuentas de la misma organizacion.
 * No pasa por SPEI. Instantaneo, sin comision.
 * EP-SP-011: US-SP-042
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TransferFormComponent, TransferFormData, TransferAccount } from '../../../shared/transfer-form/transfer-form.component';

type PageState = 'form' | 'success';

interface InternalTransferResult {
  id: string;
  from: string;
  to: string;
  amount: number;
  concept: string;
  executed_at: string;
}

@Component({
  selector: 'sp-internal-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, RouterLink, TransferFormComponent],
  template: `
    <div class="sp-internal-transfer">

      <!-- Header -->
      <div class="sp-internal-transfer__header">
        <a routerLink="/sp/business/dashboard" class="sp-internal-transfer__back">
          ← Volver al Dashboard
        </a>
        <div class="sp-internal-transfer__header-content">
          <div>
            <h1 class="sp-internal-transfer__title">Movimiento Interno</h1>
            <p class="sp-internal-transfer__subtitle">
              Transfiere fondos entre las cuentas de tu organizacion. Sin comision, instantaneo.
            </p>
          </div>
          <div class="sp-internal-transfer__badge">
            <span class="sp-internal-transfer__badge-icon">⇄</span>
            <span>Interno · Sin comision</span>
          </div>
        </div>
      </div>

      <!-- Aviso -->
      <div class="sp-internal-transfer__notice">
        <span class="sp-internal-transfer__notice-icon">ℹ</span>
        <p>
          Los movimientos internos no pasan por SPEI. El saldo se actualiza de forma inmediata
          entre las cuentas de tu organizacion.
        </p>
      </div>

      <!-- Estado: formulario -->
      @if (pageState() === 'form') {
        <div class="sp-internal-transfer__form-wrap">

          <!-- Selector de cuenta destino interno -->
          <div class="sp-internal-transfer__dest-selector">
            <h3 class="sp-internal-transfer__dest-title">Cuenta destino (interna)</h3>
            <div class="sp-internal-transfer__dest-list">
              @for (account of destinationAccounts(); track account.id) {
                <div
                  [class]="'sp-internal-transfer__dest-item' + (selectedDestId() === account.id ? ' selected' : '')"
                  (click)="selectedDestId.set(account.id)">
                  <div class="sp-internal-transfer__dest-info">
                    <strong>{{ account.label }}</strong>
                    <span>{{ account.clabe }}</span>
                  </div>
                  <span class="sp-internal-transfer__dest-balance">
                    {{ account.balance | currency:'MXN':'symbol':'1.2-2' }}
                  </span>
                </div>
              }
            </div>
            @if (!selectedDestId() && submitted()) {
              <span class="sp-internal-transfer__error">Selecciona una cuenta destino</span>
            }
          </div>

          <!-- Formulario de origen y monto -->
          <div class="sp-internal-transfer__form-card">
            <h3 class="sp-internal-transfer__form-title">Cuenta origen y monto</h3>
            <sp-transfer-form
              mode="business"
              [accounts]="sourceAccounts()"
              (submit)="onFormSubmit($event)"
            />
          </div>

        </div>
      }

      <!-- Estado: exito -->
      @if (pageState() === 'success' && transferResult()) {
        <div class="sp-internal-transfer__success-card">
          <div class="sp-internal-transfer__success-icon">✓</div>
          <h2 class="sp-internal-transfer__success-title">Movimiento realizado</h2>
          <p class="sp-internal-transfer__success-subtitle">El saldo ya esta disponible en la cuenta destino.</p>

          <div class="sp-internal-transfer__success-summary">
            <div class="sp-internal-transfer__summary-row">
              <span>Origen</span><strong>{{ transferResult()!.from }}</strong>
            </div>
            <div class="sp-internal-transfer__summary-row">
              <span>Destino</span><strong>{{ transferResult()!.to }}</strong>
            </div>
            <div class="sp-internal-transfer__summary-row">
              <span>Monto</span><strong>{{ transferResult()!.amount | currency:'MXN':'symbol':'1.2-2' }}</strong>
            </div>
            <div class="sp-internal-transfer__summary-row">
              <span>Concepto</span><strong>{{ transferResult()!.concept }}</strong>
            </div>
            <div class="sp-internal-transfer__summary-row">
              <span>Folio</span><strong>{{ transferResult()!.id }}</strong>
            </div>
          </div>

          <div class="sp-internal-transfer__success-actions">
            <button (click)="resetForm()" class="sp-internal-transfer__btn sp-internal-transfer__btn--secondary">
              Nuevo movimiento
            </button>
            <a routerLink="/sp/business/movements" class="sp-internal-transfer__btn sp-internal-transfer__btn--primary">
              Ver movimientos
            </a>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-internal-transfer { padding: 24px; max-width: 960px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-internal-transfer__back { font-size: 13px; color: #3182ce; text-decoration: none; display: block; margin-bottom: 12px; }
    .sp-internal-transfer__back:hover { text-decoration: underline; }
    .sp-internal-transfer__header { margin-bottom: 20px; }
    .sp-internal-transfer__header-content { display: flex; justify-content: space-between; align-items: flex-start; }
    .sp-internal-transfer__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-internal-transfer__subtitle { font-size: 13px; color: #718096; margin: 0; }
    .sp-internal-transfer__badge {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; background: #e9d8fd; color: #553c9a;
      border-radius: 20px; font-size: 12px; font-weight: 600; flex-shrink: 0;
    }
    .sp-internal-transfer__badge-icon { font-size: 16px; }

    /* Notice */
    .sp-internal-transfer__notice {
      display: flex; gap: 10px; align-items: flex-start;
      background: #fffaf0; border: 1px solid #fbd38d; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 24px;
    }
    .sp-internal-transfer__notice-icon { font-size: 16px; flex-shrink: 0; }
    .sp-internal-transfer__notice p { font-size: 13px; color: #744210; margin: 0; }

    /* Form wrap */
    .sp-internal-transfer__form-wrap { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }

    /* Dest selector */
    .sp-internal-transfer__dest-selector { }
    .sp-internal-transfer__dest-title { font-size: 14px; font-weight: 700; color: #2d3748; margin: 0 0 12px; }
    .sp-internal-transfer__dest-list { display: flex; flex-direction: column; gap: 8px; }
    .sp-internal-transfer__dest-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer;
      transition: all 0.15s;
    }
    .sp-internal-transfer__dest-item:hover { border-color: #90cdf4; }
    .sp-internal-transfer__dest-item.selected { border-color: #553c9a; background: #f5f3ff; }
    .sp-internal-transfer__dest-info strong { font-size: 13px; color: #2d3748; display: block; }
    .sp-internal-transfer__dest-info span { font-size: 11px; color: #a0aec0; font-family: monospace; }
    .sp-internal-transfer__dest-balance { font-size: 13px; font-weight: 700; color: #38a169; }
    .sp-internal-transfer__error { font-size: 11px; color: #e53e3e; margin-top: 4px; display: block; }

    /* Form card */
    .sp-internal-transfer__form-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-internal-transfer__form-title { font-size: 14px; font-weight: 700; color: #2d3748; margin: 0 0 16px; }

    /* Success */
    .sp-internal-transfer__success-card {
      background: white; border: 1px solid #9ae6b4; border-radius: 12px;
      padding: 32px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-internal-transfer__success-icon {
      width: 56px; height: 56px; background: #38a169; color: white; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 28px;
      margin: 0 auto 16px;
    }
    .sp-internal-transfer__success-title { font-size: 20px; font-weight: 700; color: #276749; margin: 0 0 8px; }
    .sp-internal-transfer__success-subtitle { font-size: 14px; color: #718096; margin: 0 0 24px; }

    .sp-internal-transfer__success-summary {
      background: #f7fafc; border-radius: 10px; padding: 16px;
      max-width: 440px; margin: 0 auto 24px; text-align: left;
    }
    .sp-internal-transfer__summary-row {
      display: flex; justify-content: space-between; font-size: 13px;
      padding: 6px 0; border-bottom: 1px solid #edf2f7;
    }
    .sp-internal-transfer__summary-row:last-child { border-bottom: none; }
    .sp-internal-transfer__summary-row span { color: #718096; }

    .sp-internal-transfer__success-actions { display: flex; gap: 10px; justify-content: center; }
    .sp-internal-transfer__btn {
      padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; text-decoration: none; border: none; display: inline-flex; align-items: center;
    }
    .sp-internal-transfer__btn--primary { background: #553c9a; color: white; }
    .sp-internal-transfer__btn--primary:hover { background: #44337a; }
    .sp-internal-transfer__btn--secondary { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-internal-transfer__btn--secondary:hover { background: #f7fafc; }

    @media (max-width: 768px) {
      .sp-internal-transfer__form-wrap { grid-template-columns: 1fr; }
    }
  `],
})
export class InternalTransferComponent {
  readonly pageState = signal<PageState>('form');
  readonly submitted = signal(false);
  readonly selectedDestId = signal<string>('');
  readonly transferResult = signal<InternalTransferResult | null>(null);

  readonly sourceAccounts = signal<TransferAccount[]>([
    { id: 'acc-master-001', label: 'Cuenta Maestra Principal', clabe: '646180110400000001', balance: 3_120_500.00, currency: 'MXN' },
    { id: 'acc-sub-001', label: 'Subcuenta Operaciones', clabe: '646180110400000002', balance: 854_200.50, currency: 'MXN' },
    { id: 'acc-sub-002', label: 'Subcuenta Nomina', clabe: '646180110400000003', balance: 420_000.00, currency: 'MXN' },
  ]);

  readonly destinationAccounts = computed<TransferAccount[]>(() => {
    return this.sourceAccounts().filter((a) => a.id !== 'acc-master-001');
  });

  readonly selectedDestAccount = computed(() =>
    this.destinationAccounts().find((a) => a.id === this.selectedDestId()) ?? null
  );

  onFormSubmit(data: TransferFormData): void {
    this.submitted.set(true);
    if (!this.selectedDestId()) return;

    const destAccount = this.selectedDestAccount();
    const sourceAccount = this.sourceAccounts().find((a) => a.id === data.source_account_id);

    const result: InternalTransferResult = {
      id: `INT-${Date.now()}`,
      from: sourceAccount?.label ?? data.source_account_id,
      to: destAccount?.label ?? this.selectedDestId(),
      amount: data.amount,
      concept: data.concept,
      executed_at: new Date().toISOString(),
    };

    this.transferResult.set(result);
    this.pageState.set('success');
  }

  resetForm(): void {
    this.pageState.set('form');
    this.selectedDestId.set('');
    this.submitted.set(false);
    this.transferResult.set(null);
  }
}
