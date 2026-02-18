/**
 * CashOutRequestComponent - Solicitud de retiro de efectivo
 *
 * Permite al usuario solicitar un retiro de efectivo.
 * Genera un authorization_code valido por 30 minutos
 * que debe presentarse en el punto de pago.
 */

import {
  Component,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { CashService, CashWithdrawalRequestResponse } from '../../services/cash.service';

@Component({
  selector: 'sp-cash-out-request',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cash-out-request-page">
      <header class="page-header">
        <a routerLink="/sp/personal/cash" class="back-link">&#8592; Efectivo</a>
        <h1>Retirar Efectivo</h1>
        <p class="subtitle">Obtén un código de autorización para retirar en un punto de pago</p>
      </header>

      <!-- Estado de exito: mostrar codigo de autorizacion -->
      @if (authorizationData()) {
        <div class="auth-code-card">
          <p class="auth-label">Código de Autorización</p>
          <p class="auth-code">{{ authorizationData()!.authorization_code }}</p>

          <div class="countdown-section">
            @if (timeRemaining() > 0) {
              <p class="countdown-label">Válido por:</p>
              <p class="countdown-timer" [class.urgent]="timeRemaining() < 300">
                {{ formattedTime() }}
              </p>
              <p class="countdown-note">Preséntalo en el punto de pago antes de que expire</p>
            } @else {
              <div class="expired-notice">
                <p>El código ha expirado.</p>
                <button type="button" class="btn-secondary" (click)="resetForm()">
                  Solicitar nuevo código
                </button>
              </div>
            }
          </div>

          <div class="auth-details">
            <div class="detail-row">
              <span class="detail-label">Monto</span>
              <span class="detail-value">{{ authorizationData()!.amount | number: '1.2-2' }} MXN</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ID de Retiro</span>
              <span class="detail-value mono">{{ authorizationData()!.withdrawal_id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vence</span>
              <span class="detail-value">{{ authorizationData()!.expires_at | date: 'dd/MM HH:mm' }}</span>
            </div>
          </div>

          <a routerLink="/sp/personal/cash/withdraw/confirm" class="btn-primary">
            Ya retiré el efectivo (Confirmar)
          </a>
        </div>
      } @else {

        <!-- Formulario de solicitud -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="cash-form">

          <div class="form-group">
            <label for="amount" class="form-label">Monto a Retirar (MXN) *</label>
            <div class="input-prefix-wrapper">
              <span class="input-prefix">$</span>
              <input
                id="amount"
                type="number"
                formControlName="amount"
                class="form-input with-prefix"
                [class.invalid]="isFieldInvalid('amount')"
                placeholder="0.00"
                min="1"
                step="0.01"
              />
            </div>
            @if (isFieldInvalid('amount')) {
              <p class="field-error">
                @if (form.get('amount')?.errors?.['required']) {
                  El monto es requerido.
                } @else if (form.get('amount')?.errors?.['min']) {
                  El monto mínimo es $1.00 MXN.
                } @else if (form.get('amount')?.errors?.['max']) {
                  El monto excede tu saldo disponible.
                }
              </p>
            }
            @if (availableBalance() !== null) {
              <p class="balance-hint">
                Saldo disponible: {{ availableBalance() | number: '1.2-2' }} MXN
              </p>
            }
          </div>

          <div class="form-group">
            <label for="point_id" class="form-label">ID del Punto de Pago *</label>
            <input
              id="point_id"
              type="text"
              formControlName="point_id"
              class="form-input"
              [class.invalid]="isFieldInvalid('point_id')"
              placeholder="Ej: PP-001, OXXO-0234"
            />
            @if (isFieldInvalid('point_id')) {
              <p class="field-error">El ID del punto de pago es requerido.</p>
            }
          </div>

          @if (error()) {
            <div class="error-alert">
              <p>{{ error() }}</p>
            </div>
          }

          <button
            type="submit"
            class="btn-primary"
            [disabled]="form.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="btn-spinner"></span>
              Generando código...
            } @else {
              Generar Código de Retiro
            }
          </button>

        </form>
      }
    </div>
  `,
  styles: [`
    .cash-out-request-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 28px;
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
      font-size: 14px;
      margin: 0;
    }

    .cash-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .form-input {
      padding: 11px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 15px;
      color: #1e293b;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input.invalid { border-color: #dc2626; }

    .input-prefix-wrapper { position: relative; }
    .input-prefix {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
    }

    .form-input.with-prefix { padding-left: 28px; }

    .field-error {
      color: #dc2626;
      font-size: 12px;
      margin: 0;
    }

    .balance-hint {
      font-size: 12px;
      color: #16a34a;
      margin: 0;
    }

    .error-alert {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 14px;
      color: #b91c1c;
      font-size: 14px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
      text-align: center;
    }

    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Auth code card */
    .auth-code-card {
      background: white;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .auth-label {
      font-size: 13px;
      color: #64748b;
      text-align: center;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .auth-code {
      font-size: 48px;
      font-weight: 900;
      letter-spacing: 0.15em;
      color: #1e293b;
      text-align: center;
      font-family: 'Courier New', monospace;
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin: 0;
    }

    .countdown-section {
      text-align: center;
    }

    .countdown-label {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 6px;
    }

    .countdown-timer {
      font-size: 36px;
      font-weight: 700;
      color: #16a34a;
      margin: 0 0 6px;
      font-variant-numeric: tabular-nums;
    }

    .countdown-timer.urgent { color: #dc2626; }

    .countdown-note {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    .expired-notice {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #fef2f2;
      border-radius: 8px;
      color: #b91c1c;
      font-size: 14px;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .auth-details {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-size: 13px;
      color: #94a3b8;
    }

    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .detail-value.mono {
      font-family: monospace;
      font-size: 12px;
    }
  `],
})
export class CashOutRequestComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly cashService = inject(CashService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly authorizationData = signal<CashWithdrawalRequestResponse['data'] | null>(null);
  readonly availableBalance = signal<number | null>(null);
  readonly timeRemaining = signal(0);
  readonly formattedTime = signal('30:00');

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  readonly form = this.fb.nonNullable.group({
    amount: [null as unknown as number, [Validators.required, Validators.min(1)]],
    point_id: ['', [Validators.required]],
  });

  constructor() {
    this.loadBalance();
  }

  private loadBalance(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        const active = (response.data ?? []).find((a) => a.status === 'ACTIVE');
        if (active) {
          this.availableBalance.set(active.available_balance);
          const maxValidator = Validators.max(active.available_balance);
          this.form.get('amount')?.addValidators(maxValidator);
          this.form.get('amount')?.updateValueAndValidity();
        }
      },
      error: () => {},
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.error.set('No se encontro la organizacion activa.');
      return;
    }

    const { amount, point_id } = this.form.getRawValue();

    this.isLoading.set(true);
    this.error.set(null);

    this.cashService.requestCashOut(orgId, { amount, point_id }).subscribe({
      next: (response) => {
        this.authorizationData.set(response.data);
        this.isLoading.set(false);
        this.startCountdown(response.data.expires_at);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al generar el código. Intente de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  private startCountdown(expiresAt: string): void {
    const expiresMs = new Date(expiresAt).getTime();

    const updateTimer = (): void => {
      const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      this.timeRemaining.set(remaining);

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      this.formattedTime.set(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );

      if (remaining === 0 && this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    };

    updateTimer();
    // Usar 30 minutos como fallback si expires_at no es parseable
    const initialRemaining = this.timeRemaining();
    if (initialRemaining <= 0) {
      this.timeRemaining.set(30 * 60);
      this.formattedTime.set('30:00');
    }

    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  resetForm(): void {
    this.authorizationData.set(null);
    this.error.set(null);
    this.timeRemaining.set(0);
    this.form.reset();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
