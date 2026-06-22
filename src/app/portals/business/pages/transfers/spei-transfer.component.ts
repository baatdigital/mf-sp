/**
 * SpeiTransferComponent - Formulario de transferencia SPEI
 *
 * Permite al usuario B2B enviar una transferencia SPEI a un banco destino.
 * Usa el formulario reactivo propio (no usa TransferFormComponent que es para
 * transferencias internas). Tras el envio muestra TransferStatusTrackerComponent.
 *
 * Fixes aplicados:
 *   DJ-FQ-01: lock atomico _submitLock + idempotency key generado en initForm()
 *   DJ-FQ-03: validador CLABE con checksum mod-10 (clabeChecksumValidator)
 *   DJ-FQ-06: error handler extrae mensaje real del backend
 *   DJ-FQ-08: submitError se limpia al primer cambio del formulario
 *   DJ-FQ-11: signal loadError + boton Reintentar cuando falla loadAccounts
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
import { take } from 'rxjs/operators';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { TransferStatusTrackerComponent } from '../../../../shared/components/index';
import { BusinessService } from '../../services/business.service';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';
import { SpeiTransfer } from '../../../../domain/models/transfer.model';
import { clabeChecksumValidator } from '../../../../core/clabe';
import { generateIdempotencyKey } from '../../../../core/idempotency';

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
          } @else if (loadError()) {
            <div class="form-error" role="alert">
              {{ loadError() }}
              <button class="btn-retry" type="button" (click)="loadAccounts()">Reintentar</button>
            </div>
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
                @if (form.get('destinationClabe')?.hasError('required')) {
                  <span class="error-msg">La CLABE es obligatoria.</span>
                } @else if (form.get('destinationClabe')?.hasError('clabeInvalid')) {
                  <span class="error-msg">Ingresa una CLABE de exactamente 18 digitos numericos.</span>
                } @else if (form.get('destinationClabe')?.hasError('clabeChecksum')) {
                  <span class="error-msg">El digito verificador de la CLABE es incorrecto. Verifica los 18 digitos.</span>
                }
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

          <!-- Modal de confirmación -->
          @if (confirming()) {
            <div class="confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
              <div class="confirmation-card">
                <h2 id="confirmation-title" class="confirmation-title">Confirmar transferencia SPEI</h2>
                <div class="confirmation-body">
                  <div class="confirm-row">
                    <span class="confirm-label">Cuenta origen</span>
                    <span class="confirm-value">
                      {{ getSourceAccountName() }}
                    </span>
                  </div>
                  <div class="confirm-row">
                    <span class="confirm-label">CLABE destino</span>
                    <span class="confirm-value">
                      ****{{ form.get('destinationClabe')?.value?.toString().slice(-4) ?? '____' }}
                    </span>
                  </div>
                  <div class="confirm-row">
                    <span class="confirm-label">Beneficiario</span>
                    <span class="confirm-value">{{ form.get('destinationName')?.value }}</span>
                  </div>
                  <div class="confirm-row highlight">
                    <span class="confirm-label">Monto</span>
                    <span class="confirm-value amount">\${{ form.get('amount')?.value | number:'1.2-2' }} MXN</span>
                  </div>
                  <div class="confirm-row">
                    <span class="confirm-label">Concepto</span>
                    <span class="confirm-value">{{ form.get('concept')?.value }}</span>
                  </div>
                  @if (form.get('reference')?.value) {
                    <div class="confirm-row">
                      <span class="confirm-label">Referencia</span>
                      <span class="confirm-value">{{ form.get('reference')?.value }}</span>
                    </div>
                  }
                </div>
                <div class="confirmation-actions">
                  <button
                    type="button"
                    class="btn-cancel-confirm"
                    (click)="cancelConfirmation()"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    class="btn-confirm-submit"
                    (click)="confirmedSubmit()"
                    [disabled]="isSubmitting()"
                  >
                    {{ isSubmitting() ? 'Enviando...' : 'Confirmar y enviar' }}
                  </button>
                </div>
              </div>
            </div>
          }
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
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-retry {
      margin-left: auto;
      padding: 4px 12px;
      border: 1px solid #fca5a5;
      border-radius: 5px;
      background: #fff;
      color: #991b1b;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-retry:hover { background: #fee2e2; }

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

    /* Modal de confirmación */
    .confirmation-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
      animation: fadeIn 0.2s ease;
    }

    .confirmation-card {
      background: #ffffff;
      border-radius: 16px;
      max-width: 480px;
      width: 100%;
      padding: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .confirmation-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 20px;
    }

    .confirmation-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .confirm-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }

    .confirm-row:last-child { border-bottom: none; }
    .confirm-row.highlight { background: #eff6ff; margin: 4px -16px; padding: 10px 16px; border-radius: 8px; }

    .confirm-label { color: #6b7280; font-weight: 500; }
    .confirm-value { font-weight: 600; color: #111827; }
    .confirm-value.amount { color: #2563eb; font-size: 18px; }

    .confirmation-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-cancel-confirm {
      padding: 9px 20px;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      background: #ffffff;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-cancel-confirm:hover { background: #f9fafb; }

    .btn-confirm-submit {
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

    .btn-confirm-submit:hover:not(:disabled) { background: #1d4ed8; }
    .btn-confirm-submit:disabled { background: #93c5fd; cursor: not-allowed; }
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
  readonly loadError = signal<string | null>(null);
  readonly sourceAccounts = signal<FinancialAccount[]>([]);
  readonly submittedTransfer = signal<SpeiTransfer | null>(null);
  readonly confirming = signal(false); // Estado del modal de confirmación

  form!: FormGroup;

  /**
   * Lock atomico para prevenir doble-submit (DJ-FQ-01).
   * Se evalua y setea sincronicamente como primera linea de onSubmit(),
   * antes de cualquier llamada async, garantizando atomicidad en el event loop de JS.
   */
  private _submitLock = false;

  /** Idempotency key generado al cargar el formulario, no al momento del click (DJ-FQ-01). */
  private _idempotencyKey = '';

  ngOnInit(): void {
    this.initForm();
    this.loadAccounts();
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onSubmit(): void {
    // Validar formulario antes de mostrar confirmación
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.submitError.set('No se encontro organizacion activa.');
      return;
    }

    // Mostrar modal de confirmación (NO enviar aún)
    this.confirming.set(true);
  }

  /** Confirma y envía la transferencia SPEI (ejecutado al clicar "Confirmar y enviar") */
  confirmedSubmit(): void {
    // DJ-FQ-01: lock atomico — evaluado y seteado sincronicamente antes de cualquier async
    if (this._submitLock) return;
    this._submitLock = true;

    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.submitError.set('No se encontro organizacion activa.');
      this._submitLock = false;
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

    // DJ-FQ-01: enviar idempotency key generado al cargar el formulario
    const headers = { 'X-Idempotency-Key': this._idempotencyKey };

    this.businessSvc.sendSpei(orgId, body, headers).subscribe({
      next: (res) => {
        this.submittedTransfer.set(res.data ?? null);
        this.isSubmitting.set(false);
        this._submitLock = false;
        this.confirming.set(false);
      },
      error: (err) => {
        // DJ-FQ-06: extraer mensaje real del backend en lugar de mensaje fijo
        const msg =
          err?.error?.detail ??
          err?.error?.message ??
          err?.message ??
          'Error al enviar la transferencia. Intenta de nuevo.';
        this.submitError.set(msg);
        this.isSubmitting.set(false);
        this._submitLock = false;
        this.confirming.set(false);
        // DJ-FQ-08: limpiar el error al primer cambio siguiente del formulario
        this.form.valueChanges.pipe(take(1)).subscribe(() => {
          this.submitError.set(null);
        });
      },
    });
  }

  /** Cancela el modal de confirmación y regresa al formulario */
  cancelConfirmation(): void {
    this.confirming.set(false);
  }

  /**
   * Obtiene el nombre de la cuenta origen para el modal de confirmación.
   * Usado en el template donde Angular no soporta expresiones complejas.
   */
  getSourceAccountName(): string {
    const sourceId = this.form.get('sourceAccountId')?.value;
    if (!sourceId) return 'Cuenta desconocida';
    const account = this.sourceAccounts().find((a) => a.account_id === sourceId);
    return account?.name ?? account?.account_type ?? 'Cuenta';
  }

  onRefreshTransfer(): void {
    // Consulta el estado actualizado de la transferencia (implementacion futura con polling)
  }

  resetForm(): void {
    this.submittedTransfer.set(null);
    this.submitError.set(null);
    this._submitLock = false;
    // Regenerar idempotency key para nueva transferencia
    this._idempotencyKey = generateIdempotencyKey();
    this.form.reset();
  }

  loadAccounts(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.loadingAccounts.set(false);
      return;
    }

    this.loadingAccounts.set(true);
    this.loadError.set(null);

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        const active = (res.data ?? []).filter(
          (a: FinancialAccount) => a.status === 'ACTIVE'
        );
        this.sourceAccounts.set(active);
        this.loadingAccounts.set(false);
      },
      error: () => {
        // DJ-FQ-11: setear loadError para mostrar estado de error con boton Reintentar
        this.loadingAccounts.set(false);
        this.loadError.set('No se pudieron cargar las cuentas. Verifica tu conexion.');
      },
    });
  }

  private initForm(): void {
    // DJ-FQ-01: generar idempotency key al inicializar el formulario (no al click)
    this._idempotencyKey = generateIdempotencyKey();

    this.form = this.fb.group({
      sourceAccountId: ['', Validators.required],
      // DJ-FQ-03: usar validador con checksum mod-10 en lugar de solo formato
      destinationClabe: ['', [Validators.required, clabeChecksumValidator]],
      destinationName: ['', [Validators.required, Validators.maxLength(100)]],
      amount: ['', [Validators.required, positiveAmountValidator]],
      concept: ['', [Validators.required, Validators.maxLength(40)]],
      reference: ['', Validators.maxLength(30)],
    });

  }
}
