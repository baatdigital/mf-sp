/**
 * SpeiTransferComponent - Formulario de transferencia SPEI
 *
 * Permite al usuario B2B enviar una transferencia SPEI a un banco destino.
 * Usa el formulario reactivo propio (no usa TransferFormComponent que es para
 * transferencias internas). Tras el envio muestra TransferStatusTrackerComponent.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { TransferStatusTrackerComponent } from '../../../../shared/components/index';
import { BusinessService } from '../../services/business.service';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';
import { SpeiTransfer } from '../../../../domain/models/transfer.model';

/** Validador: CLABE exactamente 18 digitos numericos */
function clabeValidator(control: AbstractControl): Record<string, boolean> | null {
  const val = String(control.value ?? '');
  if (!/^\d{18}$/.test(val)) return { invalidClabe: true };
  return null;
}

/** Validador: monto positivo */
function positiveAmountValidator(control: AbstractControl): Record<string, boolean> | null {
  const num = Number(control.value);
  if (isNaN(num) || num <= 0) return { notPositive: true };
  return null;
}

@Component({
  selector: 'sp-spei-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TransferStatusTrackerComponent,
  ],
  template: `
    <div class="spei-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Dashboard</a>
        <h1 class="page-title">Enviar Transferencia SPEI</h1>
      </header>

      @if (!submittedTransfer()) {
        <!-- Formulario de transferencia -->
        <div class="form-wrapper">
          @if (loadingAccounts()) {
            <div class="form-loading">Cargando cuentas...</div>
          } @else if (submitError()) {
            <div class="form-error" role="alert">
              {{ submitError() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="spei-form">

            <!-- Cuenta origen -->
            <div class="field-group">
              <label class="field-label" for="sourceAccountId">Cuenta Origen *</label>
              <select
                id="sourceAccountId"
                formControlName="sourceAccountId"
                class="field-select"
                [class.field-error]="isInvalid('sourceAccountId')"
              >
                <option value="">Selecciona cuenta origen</option>
                @for (acc of sourceAccounts(); track acc.account_id) {
                  <option [value]="acc.account_id">
                    {{ acc.name ?? acc.account_type }} — saldo: {{ acc.available_balance | number:'1.2-2' }} MXN
                  </option>
                }
              </select>
              @if (isInvalid('sourceAccountId')) {
                <span class="error-msg">Selecciona una cuenta origen.</span>
              }
            </div>

            <!-- CLABE destino -->
            <div class="field-group">
              <label class="field-label" for="destinationClabe">CLABE Destino *</label>
              <input
                id="destinationClabe"
                type="text"
                formControlName="destinationClabe"
                class="field-input"
                [class.field-error]="isInvalid('destinationClabe')"
                placeholder="18 digitos"
                maxlength="18"
              />
              @if (isInvalid('destinationClabe')) {
                <span class="error-msg">Ingresa una CLABE valida de 18 digitos numericos.</span>
              }
            </div>

            <!-- Nombre beneficiario -->
            <div class="field-group">
              <label class="field-label" for="destinationName">Nombre del Beneficiario *</label>
              <input
                id="destinationName"
                type="text"
                formControlName="destinationName"
                class="field-input"
                [class.field-error]="isInvalid('destinationName')"
                placeholder="Nombre completo o razon social"
              />
              @if (isInvalid('destinationName')) {
                <span class="error-msg">El nombre del beneficiario es obligatorio.</span>
              }
            </div>

            <!-- Monto -->
            <div class="field-group">
              <label class="field-label" for="amount">Monto (MXN) *</label>
              <div class="input-prefix-wrap">
                <span class="input-prefix">$</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  formControlName="amount"
                  class="field-input field-input-prefixed"
                  [class.field-error]="isInvalid('amount')"
                  placeholder="0.00"
                />
              </div>
              @if (isInvalid('amount')) {
                <span class="error-msg">Ingresa un monto mayor a cero.</span>
              }
            </div>

            <!-- Concepto -->
            <div class="field-group">
              <label class="field-label" for="concept">Concepto *</label>
              <input
                id="concept"
                type="text"
                formControlName="concept"
                class="field-input"
                [class.field-error]="isInvalid('concept')"
                placeholder="Motivo de la transferencia"
                maxlength="40"
              />
              @if (isInvalid('concept')) {
                <span class="error-msg">El concepto es obligatorio (max 40 caracteres).</span>
              }
            </div>

            <!-- Referencia (opcional) -->
            <div class="field-group">
              <label class="field-label" for="reference">Referencia <span class="optional">(opcional)</span></label>
              <input
                id="reference"
                type="text"
                formControlName="reference"
                class="field-input"
                placeholder="Referencia numerica o texto"
                maxlength="30"
              />
            </div>

            <!-- Acciones -->
            <div class="form-actions">
              <a routerLink="/sp/business" class="btn-cancel">Cancelar</a>
              <button
                type="submit"
                class="btn-submit"
                [disabled]="form.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Enviando...' : 'Enviar SPEI' }}
              </button>
            </div>

          </form>
        </div>
      } @else {
        <!-- Estado de la transferencia enviada -->
        <div class="tracker-wrapper">
          <div class="tracker-header-bar">
            <span class="tracker-label">Tu transferencia fue enviada</span>
            <button class="btn-new-transfer" (click)="resetForm()">
              Nueva transferencia
            </button>
          </div>
          <sp-transfer-status-tracker
            [transfer]="submittedTransfer()"
            [isLoading]="false"
            (refreshRequested)="onRefreshTransfer()"
          />
        </div>
      }
    </div>
  `,
  styles: [`
    .spei-page {
      padding: 24px;
      max-width: 680px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      display: inline-block;
      color: #6b7280;
      font-size: 13px;
      text-decoration: none;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #374151; }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    /* Form wrapper */
    .form-wrapper {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .form-loading {
      padding: 20px 24px;
      color: #6b7280;
      font-size: 14px;
      border-bottom: 1px solid #f3f4f6;
    }

    .form-error {
      padding: 12px 24px;
      background: #fef2f2;
      border-bottom: 1px solid #fecaca;
      color: #991b1b;
      font-size: 14px;
    }

    .spei-form {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* Fields */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .optional {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 400;
    }

    .field-input,
    .field-select {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 14px;
      color: #111827;
      background: #ffffff;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .field-input:focus,
    .field-select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }

    .field-error { border-color: #ef4444 !important; }

    .input-prefix-wrap { position: relative; }

    .input-prefix {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #6b7280;
      font-size: 14px;
      pointer-events: none;
    }

    .field-input-prefixed { padding-left: 26px; }

    .error-msg {
      font-size: 12px;
      color: #ef4444;
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 8px;
    }

    .btn-cancel {
      padding: 9px 20px;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      background: #ffffff;
      text-decoration: none;
      transition: background 0.15s;
    }

    .btn-cancel:hover { background: #f9fafb; }

    .btn-submit {
      padding: 9px 24px;
      border: none;
      border-radius: 7px;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      background: #2563eb;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-submit:hover:not(:disabled) { background: #1d4ed8; }
    .btn-submit:disabled { background: #93c5fd; cursor: not-allowed; }

    /* Tracker */
    .tracker-wrapper { display: flex; flex-direction: column; gap: 16px; }

    .tracker-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tracker-label {
      font-size: 16px;
      font-weight: 600;
      color: #059669;
    }

    .btn-new-transfer {
      padding: 8px 18px;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      background: #ffffff;
      cursor: pointer;
    }

    .btn-new-transfer:hover { background: #f9fafb; }
  `],
})
export class SpeiTransferComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly businessSvc = inject(BusinessService);
  private readonly fb = inject(FormBuilder);

  readonly isSubmitting = signal(false);
  readonly loadingAccounts = signal(true);
  readonly submitError = signal<string | null>(null);
  readonly sourceAccounts = signal<FinancialAccount[]>([]);
  readonly submittedTransfer = signal<SpeiTransfer | null>(null);

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadAccounts();
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.submitError.set('No se encontro organizacion activa.');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const body = {
      source_account_id: raw['sourceAccountId'],
      destination_clabe: raw['destinationClabe'],
      destination_name: raw['destinationName'],
      amount: Number(raw['amount']),
      concept: raw['concept'],
      ...(raw['reference'] ? { reference: raw['reference'] } : {}),
    };

    this.businessSvc.sendSpei(orgId, body).subscribe({
      next: (res) => {
        this.submittedTransfer.set(res.data ?? null);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.submitError.set('Error al enviar la transferencia. Intenta de nuevo.');
        this.isSubmitting.set(false);
      },
    });
  }

  onRefreshTransfer(): void {
    // Consulta el estado actualizado de la transferencia (implementacion futura con polling)
  }

  resetForm(): void {
    this.submittedTransfer.set(null);
    this.submitError.set(null);
    this.form.reset();
  }

  private initForm(): void {
    this.form = this.fb.group({
      sourceAccountId: ['', Validators.required],
      destinationClabe: ['', [Validators.required, clabeValidator]],
      destinationName: ['', [Validators.required, Validators.maxLength(100)]],
      amount: ['', [Validators.required, positiveAmountValidator]],
      concept: ['', [Validators.required, Validators.maxLength(40)]],
      reference: ['', Validators.maxLength(30)],
    });
  }

  private loadAccounts(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.loadingAccounts.set(false);
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        const active = (res.data ?? []).filter(
          (a: FinancialAccount) => a.status === 'ACTIVE'
        );
        this.sourceAccounts.set(active);
        this.loadingAccounts.set(false);
      },
      error: () => this.loadingAccounts.set(false),
    });
  }
}
