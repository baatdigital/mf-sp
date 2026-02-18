/**
 * CashInComponent - Formulario de deposito de efectivo en punto de pago
 *
 * Permite al usuario personal realizar un deposito de efectivo
 * en cualquier punto de pago registrado.
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
import { CashService, CashDepositResponse } from '../../services/cash.service';

@Component({
  selector: 'sp-cash-in',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cash-in-page">
      <header class="page-header">
        <a routerLink="/sp/personal/cash" class="back-link">&#8592; Efectivo</a>
        <h1>Depositar Efectivo</h1>
        <p class="subtitle">Realiza un depósito en cualquier punto de pago habilitado</p>
      </header>

      <!-- Estado de exito -->
      @if (successData()) {
        <div class="success-card">
          <div class="success-icon">&#10003;</div>
          <h2>Depósito Exitoso</h2>
          <div class="success-detail">
            <p class="success-id">ID de Transacción</p>
            <p class="success-value mono">{{ successData()!.transaction_id }}</p>
          </div>
          <div class="success-detail">
            <p class="success-id">Monto Depositado</p>
            <p class="success-value amount">{{ successData()!.amount | number: '1.2-2' }} MXN</p>
          </div>
          <div class="success-detail">
            <p class="success-id">Estado</p>
            <span class="status-badge completed">{{ successData()!.status }}</span>
          </div>
          <a routerLink="/sp/personal/cash" class="btn-secondary">Volver al inicio</a>
        </div>
      } @else {

        <!-- Formulario de deposito -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="cash-form">

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

          <div class="form-group">
            <label for="amount" class="form-label">Monto a Depositar (MXN) *</label>
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
                }
              </p>
            }
          </div>

          <div class="form-group">
            <label for="description" class="form-label">Descripción (opcional)</label>
            <input
              id="description"
              type="text"
              formControlName="description"
              class="form-input"
              placeholder="Concepto del depósito"
              maxlength="100"
            />
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
              Procesando...
            } @else {
              Confirmar Depósito
            }
          </button>

        </form>
      }
    </div>
  `,
  styles: [`
    .cash-in-page {
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
      transition: border-color 0.15s;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input.invalid { border-color: #dc2626; }

    .input-prefix-wrapper {
      position: relative;
    }

    .input-prefix {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 15px;
    }

    .form-input.with-prefix {
      padding-left: 28px;
    }

    .field-error {
      color: #dc2626;
      font-size: 12px;
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
      margin-top: 4px;
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
      padding: 32px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      text-align: center;
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
    }

    .success-id {
      font-size: 11px;
      color: #94a3b8;
      margin: 0 0 4px;
      text-transform: uppercase;
    }

    .success-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .success-value.mono { font-family: monospace; font-size: 14px; }
    .success-value.amount { font-size: 22px; color: #16a34a; }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.completed { background: #dcfce7; color: #16a34a; }

    .btn-secondary {
      display: block;
      text-align: center;
      background: #f1f5f9;
      color: #475569;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      width: 100%;
      box-sizing: border-box;
      margin-top: 4px;
    }

    .btn-secondary:hover { background: #e2e8f0; }
  `],
})
export class CashInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly cashService = inject(CashService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly successData = signal<CashDepositResponse['data'] | null>(null);

  readonly form = this.fb.nonNullable.group({
    point_id: ['', [Validators.required]],
    amount: [null as unknown as number, [Validators.required, Validators.min(1)]],
    description: [''],
  });

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

    const { point_id, amount, description } = this.form.getRawValue();

    this.isLoading.set(true);
    this.error.set(null);

    this.cashService.cashIn(orgId, { point_id, amount, description }).subscribe({
      next: (response) => {
        this.successData.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al procesar el depósito. Intente de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
