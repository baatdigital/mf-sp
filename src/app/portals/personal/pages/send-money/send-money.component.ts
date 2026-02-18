/**
 * SendMoneyComponent - Envio SPEI para el portal personal B2C
 *
 * Flujo de 3 pasos:
 *   1. Ingresar CLABE destino (18 digitos, validada)
 *   2. Ingresar monto y concepto
 *   3. Confirmar con TransferStatusTrackerComponent
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { PersonalService } from '../../services/personal.service';
import { TransferStatusTrackerComponent } from '../../../../shared/components/index';
import { SpeiTransfer } from '@domain/models/transfer.model';
import { FinancialAccount } from '@domain/models/financial-account.model';

type Step = 1 | 2 | 3;

/** Validador de CLABE mexicana (18 digitos numericos) */
function clabeValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').replace(/\s/g, '');
  if (!value) return null;
  return /^\d{18}$/.test(value) ? null : { clabeInvalid: true };
}

@Component({
  selector: 'sp-send-money',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TransferStatusTrackerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="send-money-page">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Enviar Dinero</h1>
        <p class="subtitle">Transferencia SPEI a cualquier banco</p>
      </header>

      <!-- Stepper indicador -->
      <div class="stepper" role="navigation" aria-label="Pasos">
        <div class="step" [class.active]="currentStep() >= 1" [class.done]="currentStep() > 1">
          <span class="step-number">1</span>
          <span class="step-label">Destino</span>
        </div>
        <div class="step-line" [class.done]="currentStep() > 1"></div>
        <div class="step" [class.active]="currentStep() >= 2" [class.done]="currentStep() > 2">
          <span class="step-number">2</span>
          <span class="step-label">Monto</span>
        </div>
        <div class="step-line" [class.done]="currentStep() > 2"></div>
        <div class="step" [class.active]="currentStep() === 3">
          <span class="step-number">3</span>
          <span class="step-label">Confirmacion</span>
        </div>
      </div>

      <!-- Error global -->
      @if (error()) {
        <div class="error-banner" role="alert">
          &#9888; {{ error() }}
        </div>
      }

      <!-- Paso 1: CLABE destino -->
      @if (currentStep() === 1) {
        <form [formGroup]="clabeForm" (ngSubmit)="goToStep2()" class="step-form">
          <div class="form-group">
            <label class="form-label" for="clabe">CLABE interbancaria destino</label>
            <input
              id="clabe"
              type="text"
              inputmode="numeric"
              formControlName="clabe"
              class="form-input"
              [class.input-error]="clabeControl.invalid && clabeControl.touched"
              placeholder="18 digitos"
              maxlength="18"
              autocomplete="off"
            />
            @if (clabeControl.touched && clabeControl.hasError('required')) {
              <span class="field-error">La CLABE es obligatoria.</span>
            } @else if (clabeControl.touched && clabeControl.hasError('clabeInvalid')) {
              <span class="field-error">La CLABE debe tener exactamente 18 digitos.</span>
            }
          </div>
          <div class="form-group">
            <label class="form-label" for="destName">Nombre del beneficiario</label>
            <input
              id="destName"
              type="text"
              formControlName="destinationName"
              class="form-input"
              [class.input-error]="destNameControl.invalid && destNameControl.touched"
              placeholder="Ej. Juan Perez"
              autocomplete="off"
            />
            @if (destNameControl.touched && destNameControl.hasError('required')) {
              <span class="field-error">El nombre del beneficiario es obligatorio.</span>
            }
          </div>
          <button type="submit" class="btn-primary" [disabled]="clabeForm.invalid">
            Continuar &#8594;
          </button>
        </form>
      }

      <!-- Paso 2: Monto y concepto -->
      @if (currentStep() === 2) {
        <form [formGroup]="amountForm" (ngSubmit)="submitTransfer()" class="step-form">
          <!-- Resumen destino -->
          <div class="dest-summary">
            <span class="dest-label">Enviando a:</span>
            <span class="dest-clabe">{{ clabeForm.value.clabe }}</span>
            <span class="dest-name">{{ clabeForm.value.destinationName }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="amount">Monto (MXN)</label>
            <div class="amount-input-wrap">
              <span class="currency-prefix">$</span>
              <input
                id="amount"
                type="number"
                inputmode="decimal"
                formControlName="amount"
                class="form-input amount-input"
                [class.input-error]="amountControl.invalid && amountControl.touched"
                placeholder="0.00"
                min="1"
                step="0.01"
              />
            </div>
            @if (amountControl.touched && amountControl.hasError('required')) {
              <span class="field-error">El monto es obligatorio.</span>
            } @else if (amountControl.touched && amountControl.hasError('min')) {
              <span class="field-error">El monto minimo es $1.00 MXN.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="concept">Concepto</label>
            <input
              id="concept"
              type="text"
              formControlName="concept"
              class="form-input"
              [class.input-error]="conceptControl.invalid && conceptControl.touched"
              placeholder="Ej. Pago de renta"
              maxlength="60"
            />
            @if (conceptControl.touched && conceptControl.hasError('required')) {
              <span class="field-error">El concepto es obligatorio.</span>
            }
          </div>

          <div class="step-actions">
            <button type="button" class="btn-secondary" (click)="goToStep(1)">
              &#8592; Atras
            </button>
            <button type="submit" class="btn-primary" [disabled]="amountForm.invalid || isLoading()">
              @if (isLoading()) {
                <span class="spinner-sm"></span> Enviando...
              } @else {
                Enviar &#8594;
              }
            </button>
          </div>
        </form>
      }

      <!-- Paso 3: Confirmacion -->
      @if (currentStep() === 3) {
        <div class="confirm-section">
          <sp-transfer-status-tracker
            [transfer]="completedTransfer()"
            [isLoading]="false"
          />

          <div class="confirm-actions">
            <a routerLink="/sp/personal" class="btn-secondary-link">
              Volver al inicio
            </a>
            <button class="btn-outline" (click)="startNewTransfer()">
              Nueva transferencia
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .send-money-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #2563eb; }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 13px;
      margin: 0;
    }

    /* Stepper */
    .stepper {
      display: flex;
      align-items: center;
      margin-bottom: 28px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #e2e8f0;
      background: white;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .step.active .step-number {
      border-color: #2563eb;
      background: #2563eb;
      color: white;
    }

    .step.done .step-number {
      border-color: #16a34a;
      background: #16a34a;
      color: white;
    }

    .step-label {
      font-size: 11px;
      color: #94a3b8;
    }

    .step.active .step-label { color: #2563eb; font-weight: 600; }
    .step.done .step-label  { color: #16a34a; }

    .step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      margin: 0 8px;
      margin-bottom: 16px;
      transition: background 0.2s;
    }

    .step-line.done { background: #16a34a; }

    /* Error banner */
    .error-banner {
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 14px;
      margin-bottom: 16px;
    }

    /* Formularios */
    .step-form {
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
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .form-input {
      padding: 12px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 15px;
      color: #111827;
      width: 100%;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input.input-error { border-color: #dc2626; }

    .field-error {
      font-size: 12px;
      color: #dc2626;
    }

    /* Amount input con prefijo $ */
    .amount-input-wrap {
      display: flex;
      align-items: center;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.15s;
    }

    .amount-input-wrap:focus-within { border-color: #2563eb; }

    .currency-prefix {
      padding: 0 12px;
      background: #f9fafb;
      font-size: 15px;
      color: #6b7280;
      font-weight: 600;
      border-right: 1px solid #e5e7eb;
      align-self: stretch;
      display: flex;
      align-items: center;
    }

    .amount-input {
      border: none;
      border-radius: 0;
      flex: 1;
    }

    .amount-input:focus { border: none; }

    /* Resumen destino */
    .dest-summary {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dest-label { font-size: 11px; color: #0369a1; font-weight: 600; text-transform: uppercase; }
    .dest-clabe { font-size: 15px; font-weight: 700; font-family: monospace; color: #0c4a6e; }
    .dest-name  { font-size: 13px; color: #0369a1; }

    /* Botones */
    .btn-primary {
      padding: 14px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.15s;
    }

    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-secondary {
      padding: 14px 20px;
      background: white;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-secondary:hover { background: #f8fafc; }

    .btn-outline {
      padding: 12px 20px;
      background: white;
      color: #2563eb;
      border: 1px solid #2563eb;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-outline:hover { background: #eff6ff; }

    .btn-secondary-link {
      padding: 12px 20px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      text-align: center;
      transition: background 0.15s;
    }

    .btn-secondary-link:hover { background: #e2e8f0; }

    .step-actions {
      display: flex;
      gap: 12px;
    }

    .step-actions .btn-secondary { flex: 0 0 auto; }
    .step-actions .btn-primary   { flex: 1; }

    /* Spinner small */
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Confirm section */
    .confirm-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .confirm-actions {
      display: flex;
      gap: 12px;
    }

    .confirm-actions > * { flex: 1; }
  `],
})
export class SendMoneyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly personalService = inject(PersonalService);

  readonly currentStep = signal<Step>(1);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly completedTransfer = signal<SpeiTransfer | null>(null);

  private readonly activeAccount = signal<FinancialAccount | null>(null);

  readonly clabeForm: FormGroup = this.fb.group({
    clabe: ['', [Validators.required, clabeValidator]],
    destinationName: ['', Validators.required],
  });

  readonly amountForm: FormGroup = this.fb.group({
    amount: [null, [Validators.required, Validators.min(1)]],
    concept: ['', Validators.required],
  });

  get clabeControl(): AbstractControl {
    return this.clabeForm.controls['clabe'];
  }

  get destNameControl(): AbstractControl {
    return this.clabeForm.controls['destinationName'];
  }

  get amountControl(): AbstractControl {
    return this.amountForm.controls['amount'];
  }

  get conceptControl(): AbstractControl {
    return this.amountForm.controls['concept'];
  }

  ngOnInit(): void {
    this.loadSourceAccount();
  }

  goToStep(step: Step): void {
    this.error.set(null);
    this.currentStep.set(step);
  }

  goToStep2(): void {
    if (this.clabeForm.invalid) {
      this.clabeForm.markAllAsTouched();
      return;
    }
    this.goToStep(2);
  }

  submitTransfer(): void {
    if (this.amountForm.invalid) {
      this.amountForm.markAllAsTouched();
      return;
    }

    const orgId = this.sharedState.currentOrganizationId();
    const account = this.activeAccount();

    if (!orgId || !account) {
      this.error.set('No se pudo determinar la cuenta de origen. Intente de nuevo.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const request = {
      source_account_id: account.account_id,
      destination_clabe: this.clabeForm.value.clabe,
      destination_name: this.clabeForm.value.destinationName,
      amount: Number(this.amountForm.value.amount),
      concept: this.amountForm.value.concept,
    };

    this.personalService.sendSpei(orgId, request).subscribe({
      next: (response) => {
        this.completedTransfer.set(response.data);
        this.isLoading.set(false);
        this.goToStep(3);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudo procesar la transferencia. Verifica los datos e intenta de nuevo.');
      },
    });
  }

  startNewTransfer(): void {
    this.clabeForm.reset();
    this.amountForm.reset();
    this.completedTransfer.set(null);
    this.error.set(null);
    this.goToStep(1);
  }

  private loadSourceAccount(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        const accounts = response.data ?? [];
        const active = accounts.find((a) => a.status === 'ACTIVE') ?? null;
        this.activeAccount.set(active);
      },
      error: () => {
        // No bloqueante - el error se mostrara al intentar enviar
      },
    });
  }
}
