/**
 * CashOutConfirmComponent - Confirmacion de retiro de efectivo
 *
 * Confirma que el usuario ha retirado el efectivo en el punto de pago
 * usando el codigo de autorizacion generado en el paso anterior.
 */

import {
  Component,
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
import { CashService, CashWithdrawalConfirmResponse } from '../../services/cash.service';

@Component({
  selector: 'sp-cash-out-confirm',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cash-out-confirm-page">
      <header class="page-header">
        <a routerLink="/sp/personal/cash/withdraw/request" class="back-link">&#8592; Código de Retiro</a>
        <h1>Confirmar Retiro</h1>
        <p class="subtitle">Ingresa el código que usaste en el punto de pago</p>
      </header>

      <!-- Estado de exito -->
      @if (completedData()) {
        <div class="success-card">
          <div class="success-icon">&#10003;</div>
          <h2>Retiro Completado</h2>

          <div class="success-detail">
            <p class="detail-label">ID de Transacción</p>
            <p class="detail-value mono">{{ completedData()!.transaction_id }}</p>
          </div>
          <div class="success-detail">
            <p class="detail-label">Monto Retirado</p>
            <p class="detail-value amount">{{ completedData()!.amount | number: '1.2-2' }} MXN</p>
          </div>
          <div class="success-detail">
            <p class="detail-label">Completado</p>
            <p class="detail-value">{{ completedData()!.completed_at | date: 'dd/MM/yyyy HH:mm' }}</p>
          </div>
          <div class="success-detail">
            <p class="detail-label">Estado</p>
            <span class="status-badge completed">{{ completedData()!.status }}</span>
          </div>

          <a routerLink="/sp/personal/cash" class="btn-primary">
            Volver a Efectivo
          </a>
        </div>
      } @else {

        <!-- Formulario de confirmacion -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="confirm-form">

          <div class="form-group">
            <label for="authorization_code" class="form-label">Código de Autorización *</label>
            <input
              id="authorization_code"
              type="text"
              formControlName="authorization_code"
              class="form-input code-input"
              [class.invalid]="isFieldInvalid('authorization_code')"
              placeholder="Ej: AB1234"
              maxlength="6"
              (input)="onCodeInput($event)"
            />
            @if (isFieldInvalid('authorization_code')) {
              <p class="field-error">
                @if (form.get('authorization_code')?.errors?.['required']) {
                  El código de autorización es requerido.
                } @else if (form.get('authorization_code')?.errors?.['minlength'] || form.get('authorization_code')?.errors?.['maxlength']) {
                  El código debe tener exactamente 6 caracteres.
                }
              </p>
            }
            <p class="field-hint">El código que recibiste al solicitar el retiro</p>
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
              Confirmando...
            } @else {
              Confirmar Retiro
            }
          </button>

        </form>
      }
    </div>
  `,
  styles: [`
    .cash-out-confirm-page {
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

    .confirm-form {
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

    .code-input {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-align: center;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      padding: 16px;
    }

    .field-error {
      color: #dc2626;
      font-size: 12px;
      margin: 0;
    }

    .field-hint {
      font-size: 12px;
      color: #94a3b8;
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

    /* Success card */
    .success-card {
      background: white;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .success-icon {
      width: 56px;
      height: 56px;
      background: #dcfce7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #16a34a;
    }

    .success-card h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .success-detail {
      width: 100%;
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .detail-label {
      font-size: 11px;
      color: #94a3b8;
      margin: 0 0 4px;
      text-transform: uppercase;
    }

    .detail-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .detail-value.mono { font-family: monospace; font-size: 13px; }
    .detail-value.amount { font-size: 24px; color: #b91c1c; }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.completed { background: #dcfce7; color: #16a34a; }
  `],
})
export class CashOutConfirmComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly cashService = inject(CashService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly completedData = signal<CashWithdrawalConfirmResponse['data'] | null>(null);

  readonly form = this.fb.nonNullable.group({
    authorization_code: ['', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
    ]],
    point_id: ['', [Validators.required]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Forzar mayusculas en tiempo real
    const upper = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.form.get('authorization_code')?.setValue(upper, { emitEvent: false });
    input.value = upper;
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

    const { authorization_code, point_id } = this.form.getRawValue();

    this.isLoading.set(true);
    this.error.set(null);

    this.cashService.confirmCashOut(orgId, { authorization_code, point_id }).subscribe({
      next: (response) => {
        this.completedData.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Código inválido o expirado. Verifique e intente de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
