/**
 * PayServicePersonalComponent - Flujo de pago de servicios B2C (2 pasos)
 *
 * Paso 1: Ingreso de referencia + consulta del recibo
 * Paso 2: Resultado del pago (exito o fallo)
 *
 * Genera idempotency key automaticamente con Date.now().toString(36).
 * Permite guardar el servicio en localStorage al completar el pago.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ServicesBillpayService,
  BillPayHistoryItem,
} from '../../services/services-billpay.service';
import { SharedStateService } from '@shared-state';

type PayStep = 1 | 2;

interface BillInfo {
  amount: number;
  description: string;
  holder_name?: string;
  due_date?: string;
}

interface PayResult {
  success: boolean;
  folio?: string;
  errorMessage?: string;
  serviceName: string;
  amount: number;
}

@Component({
  selector: 'sp-pay-service-personal',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pay-page">
      <header class="page-header">
        @if (currentStep() === 1) {
          <a routerLink="/sp/personal/services" class="back-link">&#8592; Mis Servicios</a>
        }
        <div class="service-header">
          <span class="service-emoji">{{ serviceEmoji() }}</span>
          <h1>{{ serviceName() }}</h1>
        </div>
      </header>

      <!-- ============ PASO 1: Consulta e Ingreso ============ -->
      @if (currentStep() === 1) {
        <form [formGroup]="referenceForm" (ngSubmit)="consultBill()" class="pay-form">
          <div class="form-group">
            <label class="form-label" for="reference">Numero de contrato / referencia</label>
            <input
              id="reference"
              type="text"
              inputmode="numeric"
              formControlName="reference"
              class="form-input"
              [class.input-error]="refControl.invalid && refControl.touched"
              placeholder="Ej. 1234567890"
              autocomplete="off"
            />
            @if (refControl.touched && refControl.hasError('required')) {
              <span class="field-error">La referencia es obligatoria.</span>
            } @else if (refControl.touched && refControl.hasError('minlength')) {
              <span class="field-error">La referencia debe tener al menos 5 caracteres.</span>
            }
          </div>

          @if (queryError()) {
            <div class="error-banner" role="alert">&#9888; {{ queryError() }}</div>
          }

          <!-- Resultado de la consulta -->
          @if (billInfo()) {
            <div class="bill-result">
              <p class="bill-description">{{ billInfo()!.description }}</p>
              @if (billInfo()!.holder_name) {
                <p class="bill-holder">{{ billInfo()!.holder_name }}</p>
              }
              @if (billInfo()!.due_date) {
                <p class="bill-due">Vence: {{ billInfo()!.due_date | date: 'dd/MM/yyyy' }}</p>
              }
              <p class="bill-amount">\${{ billInfo()!.amount | number: '1.2-2' }}</p>
            </div>
          }

          @if (!billInfo()) {
            <button
              type="submit"
              class="btn-primary"
              [disabled]="referenceForm.invalid || isQuerying()"
            >
              @if (isQuerying()) {
                <span class="spinner-sm"></span> Consultando...
              } @else {
                Consultar recibo
              }
            </button>
          } @else {
            <button
              type="button"
              class="btn-primary"
              [disabled]="isPaying()"
              (click)="executePay()"
            >
              @if (isPaying()) {
                <span class="spinner-sm"></span> Procesando...
              } @else {
                Pagar \${{ billInfo()!.amount | number: '1.2-2' }}
              }
            </button>

            <button type="button" class="btn-secondary" (click)="clearBillInfo()">
              Cambiar referencia
            </button>
          }
        </form>
      }

      <!-- ============ PASO 2: Resultado ============ -->
      @if (currentStep() === 2 && payResult()) {

        @if (payResult()!.success) {
          <!-- Exito -->
          <div class="result-card result-success">
            <span class="result-icon">✅</span>
            <h2>¡Pago exitoso! 🎉</h2>
            <p class="result-service">{{ payResult()!.serviceName }}</p>
            <p class="result-amount">\${{ payResult()!.amount | number: '1.2-2' }}</p>
            @if (payResult()!.folio) {
              <p class="result-folio">Folio: {{ payResult()!.folio }}</p>
            }
          </div>

          <!-- Guardar servicio -->
          <div class="save-service-box">
            <label class="save-checkbox-label">
              <input
                type="checkbox"
                class="save-checkbox"
                [checked]="wantToSave()"
                (change)="toggleSave()"
              />
              <span>Guardar este servicio para la proxima vez</span>
            </label>

            @if (wantToSave()) {
              <div class="form-group" style="margin-top: 12px;">
                <label class="form-label" for="nickname">Nombre para identificarlo (opcional)</label>
                <input
                  id="nickname"
                  type="text"
                  class="form-input"
                  [value]="nickname()"
                  (input)="setNickname($event)"
                  placeholder="Ej. Casa, Oficina..."
                  maxlength="30"
                />
              </div>
              <button class="btn-save" (click)="saveCurrentService()">
                Guardar servicio
              </button>
            }
          </div>

        } @else {
          <!-- Fallo -->
          <div class="result-card result-failed">
            <span class="result-icon">❌</span>
            <h2>No pudimos procesar el pago</h2>
            <p class="result-error">{{ payResult()!.errorMessage }}</p>
          </div>

          <button class="btn-primary" (click)="retryPay()">
            Intentar de nuevo
          </button>
        }

        <a routerLink="/sp/personal/services" class="btn-back-services">
          Volver a Mis Servicios
        </a>
      }
    </div>
  `,
  styles: [`
    .pay-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 28px; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 12px;
    }

    .back-link:hover { color: #2563eb; }

    .service-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .service-emoji { font-size: 32px; }

    .service-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    /* Form */
    .pay-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .form-input {
      padding: 14px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font-size: 16px;
      color: #111827;
      width: 100%;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
      min-height: 50px;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input.input-error { border-color: #dc2626; }

    .field-error { font-size: 12px; color: #dc2626; }

    /* Error banner */
    .error-banner {
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 14px;
    }

    /* Bill result */
    .bill-result {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bill-description { font-size: 14px; color: #15803d; margin: 0; }
    .bill-holder      { font-size: 13px; color: #166534; margin: 0; }
    .bill-due         { font-size: 12px; color: #16a34a; margin: 0; }

    .bill-amount {
      font-size: 30px;
      font-weight: 700;
      color: #15803d;
      margin: 8px 0 0;
    }

    /* Buttons */
    .btn-primary {
      padding: 16px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 52px;
      transition: opacity 0.15s;
      width: 100%;
    }

    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-secondary {
      padding: 14px;
      background: white;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      min-height: 48px;
      width: 100%;
      transition: background 0.15s;
    }

    .btn-secondary:hover { background: #f8fafc; }

    .spinner-sm {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Result cards */
    .result-card {
      border-radius: 16px;
      padding: 32px 24px;
      text-align: center;
      margin-bottom: 20px;
    }

    .result-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .result-failed {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .result-icon { font-size: 48px; display: block; margin-bottom: 12px; }

    .result-card h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .result-success h2 { color: #15803d; }
    .result-failed h2  { color: #b91c1c; }

    .result-service { font-size: 14px; color: #16a34a; margin: 0 0 4px; }

    .result-amount {
      font-size: 32px;
      font-weight: 700;
      color: #15803d;
      margin: 8px 0;
    }

    .result-folio {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
      font-family: monospace;
    }

    .result-error { font-size: 14px; color: #b91c1c; margin: 8px 0 0; }

    /* Save service */
    .save-service-box {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .save-checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;
    }

    .save-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .btn-save {
      padding: 12px 20px;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      width: 100%;
      min-height: 44px;
      transition: opacity 0.15s;
    }

    .btn-save:hover { opacity: 0.88; }

    .btn-back-services {
      display: block;
      text-align: center;
      padding: 14px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 12px;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      margin-top: 12px;
      min-height: 48px;
      line-height: 20px;
      transition: background 0.15s;
    }

    .btn-back-services:hover { background: #e2e8f0; }
  `],
})
export class PayServicePersonalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly billpayService = inject(ServicesBillpayService);
  private readonly sharedState = inject(SharedStateService);

  readonly currentStep = signal<PayStep>(1);
  readonly isQuerying = signal(false);
  readonly isPaying = signal(false);
  readonly queryError = signal<string | null>(null);
  readonly billInfo = signal<BillInfo | null>(null);
  readonly payResult = signal<PayResult | null>(null);
  readonly wantToSave = signal(false);
  readonly nickname = signal('');

  readonly serviceName = signal('Servicio');
  readonly serviceEmoji = signal('🏛️');

  private serviceId = '';
  private reference = '';

  readonly referenceForm: FormGroup = this.fb.group({
    reference: ['', [Validators.required, Validators.minLength(5)]],
  });

  get refControl() {
    return this.referenceForm.controls['reference'];
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.serviceId = params['service_id'] ?? '';
      if (params['name']) this.serviceName.set(params['name']);
      if (params['emoji']) this.serviceEmoji.set(params['emoji']);
      if (params['reference']) {
        this.referenceForm.patchValue({ reference: params['reference'] });
      }
    });
  }

  consultBill(): void {
    if (this.referenceForm.invalid) {
      this.referenceForm.markAllAsTouched();
      return;
    }

    this.reference = this.refControl.value;
    this.queryError.set(null);
    this.isQuerying.set(true);

    this.billpayService.queryBill(this.serviceId, this.reference).subscribe({
      next: (response) => {
        this.billInfo.set({
          amount: response.data.amount,
          description: response.data.description,
          holder_name: response.data.holder_name,
          due_date: response.data.due_date,
        });
        this.isQuerying.set(false);
      },
      error: () => {
        this.queryError.set('No encontramos un adeudo con esa referencia. Verifica el numero e intenta de nuevo.');
        this.isQuerying.set(false);
      },
    });
  }

  executePay(): void {
    const bill = this.billInfo();
    if (!bill) return;

    const accountId = this.billpayService.getActiveAccountId();
    const idempotencyKey = Date.now().toString(36);

    this.isPaying.set(true);
    this.queryError.set(null);

    this.billpayService.payBill({
      service_id: this.serviceId,
      reference: this.reference,
      amount: bill.amount,
      account_id: accountId,
      idempotency_key: idempotencyKey,
    }).subscribe({
      next: (response) => {
        this.payResult.set({
          success: true,
          folio: response.data?.folio,
          serviceName: this.serviceName(),
          amount: bill.amount,
        });
        this.isPaying.set(false);
        this.currentStep.set(2);
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Ocurrio un error inesperado. Intenta de nuevo.';
        this.payResult.set({
          success: false,
          errorMessage: msg,
          serviceName: this.serviceName(),
          amount: bill.amount,
        });
        this.isPaying.set(false);
        this.currentStep.set(2);
      },
    });
  }

  clearBillInfo(): void {
    this.billInfo.set(null);
    this.queryError.set(null);
  }

  retryPay(): void {
    this.payResult.set(null);
    this.billInfo.set(null);
    this.queryError.set(null);
    this.currentStep.set(1);
  }

  toggleSave(): void {
    this.wantToSave.set(!this.wantToSave());
  }

  setNickname(event: Event): void {
    this.nickname.set((event.target as HTMLInputElement).value);
  }

  saveCurrentService(): void {
    this.billpayService.saveService({
      service_id: this.serviceId,
      name: this.serviceName(),
      emoji: this.serviceEmoji(),
      reference: this.reference,
      nickname: this.nickname() || this.serviceName(),
      saved_at: new Date().toISOString(),
    });
    this.wantToSave.set(false);
  }
}
