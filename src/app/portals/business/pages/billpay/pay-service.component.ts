/**
 * PayServiceComponent - Flujo de pago de servicio en 3 pasos (B2B)
 *
 * Paso 1 (Consultar): referencia + consulta de deuda con monto/fecha
 * Paso 2 (Confirmar): resumen + seleccion de cuenta + confirmar pago
 * Paso 3 (Resultado): exito con txn_id / error con reintento
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BillpayServiceApi,
  BillQueryResult,
  BillPayResult,
} from '../../services/billpay.service';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { SharedStateService } from '@shared-state';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';

@Component({
  selector: 'sp-pay-service',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pay-page">
      <header class="page-header">
        <a routerLink="/sp/business/billpay" class="back-link">&#8592; Catalogo de servicios</a>
        <h1>{{ serviceName }} <span class="service-id">{{ serviceId }}</span></h1>
      </header>

      <!-- Indicador de pasos -->
      <nav class="steps-nav" aria-label="Pasos del pago">
        @for (step of stepLabels; track $index) {
          <div
            class="step-indicator"
            [class.active]="currentStep() === $index + 1"
            [class.done]="currentStep() > $index + 1"
          >
            <span class="step-num">{{ currentStep() > $index + 1 ? '✓' : $index + 1 }}</span>
            <span class="step-label">{{ step }}</span>
          </div>
        }
      </nav>

      <!-- PASO 1: Consultar -->
      @if (currentStep() === 1) {
        <section class="step-section" aria-label="Paso 1: Consultar servicio">
          <h2 class="step-title">Ingresa tu numero de referencia</h2>
          <div class="form-group">
            <label for="reference" class="form-label">Numero de referencia o contrato</label>
            <input
              id="reference"
              type="text"
              [(ngModel)]="reference"
              placeholder="Ej. 1234567890"
              class="form-input"
              [disabled]="isLoading()"
              aria-describedby="reference-help"
            />
            <span id="reference-help" class="input-help">
              Encuentra tu numero en el recibo fisico del servicio
            </span>
          </div>

          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }

          @if (queryResult()) {
            <div class="query-result-card" aria-live="polite">
              <div class="result-row">
                <span class="result-label">Servicio</span>
                <span class="result-value">{{ queryResult()!.service_name }}</span>
              </div>
              <div class="result-row">
                <span class="result-label">Referencia</span>
                <span class="result-value">{{ queryResult()!.reference }}</span>
              </div>
              <div class="result-row highlight">
                <span class="result-label">Monto a pagar</span>
                <span class="result-value amount">
                  {{ queryResult()!.amount_due | currency:'MXN':'symbol':'1.2-2' }}
                </span>
              </div>
              <div class="result-row">
                <span class="result-label">Fecha limite</span>
                <span class="result-value">{{ queryResult()!.due_date }}</span>
              </div>
              @if (queryResult()!.period) {
                <div class="result-row">
                  <span class="result-label">Periodo</span>
                  <span class="result-value">{{ queryResult()!.period }}</span>
                </div>
              }
            </div>
          }

          <div class="step-actions">
            <button
              type="button"
              class="btn-secondary"
              (click)="consultarBill()"
              [disabled]="isLoading() || !reference.trim()"
            >
              @if (isLoading()) { Consultando... } @else { Consultar }
            </button>
            @if (queryResult()) {
              <button type="button" class="btn-primary" (click)="goToStep2()">
                Continuar &#8594;
              </button>
            }
          </div>
        </section>
      }

      <!-- PASO 2: Confirmar -->
      @if (currentStep() === 2) {
        <section class="step-section" aria-label="Paso 2: Confirmar pago">
          <h2 class="step-title">Confirma los datos del pago</h2>

          <div class="summary-card">
            <div class="summary-row">
              <span>Servicio</span>
              <strong>{{ queryResult()?.service_name }}</strong>
            </div>
            <div class="summary-row">
              <span>Referencia</span>
              <strong>{{ queryResult()?.reference }}</strong>
            </div>
            <div class="summary-row highlight">
              <span>Monto</span>
              <strong class="amount">
                {{ queryResult()?.amount_due | currency:'MXN':'symbol':'1.2-2' }}
              </strong>
            </div>
          </div>

          <div class="form-group">
            <label for="account" class="form-label">Cuenta de origen</label>
            @if (isLoading()) {
              <div class="skeleton-select"></div>
            } @else {
              <select
                id="account"
                [(ngModel)]="selectedAccountId"
                class="form-input"
                aria-label="Seleccionar cuenta de origen"
              >
                <option value="">-- Selecciona una cuenta --</option>
                @for (acc of accounts(); track acc.account_id) {
                  <option [value]="acc.account_id">
                    {{ acc.name || acc.account_type }} —
                    {{ acc.available_balance | currency:'MXN':'symbol':'1.2-2' }} disponible
                  </option>
                }
              </select>
            }
          </div>

          @if (selectedAccount()) {
            <div class="balance-info">
              <span class="balance-label">Saldo disponible:</span>
              <span class="balance-value">
                {{ selectedAccount()!.available_balance | currency:'MXN':'symbol':'1.2-2' }}
              </span>
            </div>
          }

          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }

          <div class="step-actions">
            <button type="button" class="btn-outline" (click)="goToStep1()">
              &#8592; Atras
            </button>
            <button
              type="button"
              class="btn-primary"
              (click)="confirmarPago()"
              [disabled]="isLoading() || !selectedAccountId"
            >
              @if (isLoading()) { Procesando... } @else { Confirmar Pago }
            </button>
          </div>
        </section>
      }

      <!-- PASO 3: Resultado -->
      @if (currentStep() === 3) {
        <section class="step-section" aria-label="Paso 3: Resultado del pago">
          @if (payResult()?.status === 'COMPLETED' || payResult()?.status === 'PENDING') {
            <div class="result-success">
              <div class="result-icon success-icon" aria-hidden="true">✓</div>
              <h2>Pago realizado con exito</h2>
              <div class="txn-info">
                <p><strong>ID de transaccion:</strong> {{ payResult()?.transaction_id }}</p>
                <p>
                  <strong>Monto:</strong>
                  {{ payResult()?.amount | currency:'MXN':'symbol':'1.2-2' }}
                </p>
                <p><strong>Fecha:</strong> {{ payResult()?.completed_at | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>

              <div class="save-service-form">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="wantToSave" />
                  Guardar este servicio para pagos rapidos
                </label>
                @if (wantToSave) {
                  <div class="form-group">
                    <label for="nickname" class="form-label">Nombre del servicio (apodo)</label>
                    <input
                      id="nickname"
                      type="text"
                      [(ngModel)]="serviceNickname"
                      placeholder="Ej. Oficina Norte"
                      class="form-input"
                    />
                    <button
                      type="button"
                      class="btn-secondary btn-sm"
                      (click)="guardarServicio()"
                      [disabled]="!serviceNickname.trim() || isSaving()"
                    >
                      @if (isSaving()) { Guardando... } @else { Guardar }
                    </button>
                  </div>
                }
                @if (savedMessage()) {
                  <p class="saved-ok" aria-live="polite">{{ savedMessage() }}</p>
                }
              </div>
            </div>
          } @else {
            <div class="result-error">
              <div class="result-icon error-icon" aria-hidden="true">✗</div>
              <h2>Pago fallido</h2>
              <p class="error-msg">{{ payResult()?.error_message || 'Ocurrio un error al procesar el pago.' }}</p>
              <button type="button" class="btn-secondary" (click)="goToStep2()">
                Reintentar
              </button>
            </div>
          }

          <div class="result-footer">
            <a routerLink="/sp/business/billpay" class="back-catalog-link">
              &#8592; Volver al catalogo
            </a>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .pay-page {
      padding: 24px;
      max-width: 560px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 20px; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .page-header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .service-id {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 400;
      margin-left: 6px;
    }

    /* Steps nav */
    .steps-nav {
      display: flex;
      gap: 0;
      margin-bottom: 28px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      font-size: 12px;
      color: #94a3b8;
      padding: 0 8px;
      border-right: 1px solid #e2e8f0;
    }

    .step-indicator:last-child { border-right: none; }

    .step-indicator.active { color: #2563eb; font-weight: 700; }
    .step-indicator.done { color: #16a34a; }

    .step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-indicator.active .step-num { background: #2563eb; color: white; }
    .step-indicator.done .step-num { background: #16a34a; color: white; }

    /* Step sections */
    .step-section { animation: fadeIn 0.2s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .step-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 20px;
    }

    /* Form */
    .form-group { margin-bottom: 16px; }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      color: #1e293b;
      background: white;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input:disabled { background: #f8fafc; color: #94a3b8; }

    .input-help {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      display: block;
    }

    /* Query result */
    .query-result-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }

    .result-row:last-child { border-bottom: none; }
    .result-row.highlight { background: #eff6ff; margin: 4px -16px; padding: 8px 16px; }

    .result-label { color: #64748b; }
    .result-value { font-weight: 600; color: #1e293b; }
    .result-value.amount { color: #2563eb; font-size: 18px; }

    /* Summary */
    .summary-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;
      border-bottom: 1px solid #f1f5f9;
    }

    .summary-row:last-child { border-bottom: none; }
    .summary-row.highlight { color: #1e293b; }
    .summary-row .amount { color: #2563eb; font-size: 18px; }

    .skeleton-select {
      width: 100%;
      height: 42px;
      background: #e2e8f0;
      border-radius: 10px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .balance-info {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
      margin-bottom: 16px;
      color: #16a34a;
    }

    .balance-label { color: #64748b; }
    .balance-value { font-weight: 700; }

    /* Alerts */
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .alert-error {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
    }

    /* Actions */
    .step-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 11px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-secondary {
      background: #f1f5f9;
      color: #1e293b;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 11px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-secondary:hover:not(:disabled) { background: #e2e8f0; }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-outline {
      background: transparent;
      color: #2563eb;
      border: 1.5px solid #2563eb;
      border-radius: 10px;
      padding: 11px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-sm { padding: 7px 14px; font-size: 12px; margin-top: 8px; }

    /* Resultado */
    .result-success, .result-error {
      text-align: center;
      padding: 32px 24px;
      border-radius: 16px;
      margin-bottom: 24px;
    }

    .result-success {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
    }

    .result-error {
      background: #fef2f2;
      border: 1.5px solid #fca5a5;
    }

    .result-icon {
      font-size: 40px;
      font-weight: 700;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .success-icon { background: #16a34a; color: white; }
    .error-icon { background: #dc2626; color: white; }

    .result-success h2 { color: #15803d; font-size: 18px; margin: 0 0 16px; }
    .result-error h2 { color: #b91c1c; font-size: 18px; margin: 0 0 12px; }

    .txn-info {
      text-align: left;
      background: white;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #374151;
    }

    .txn-info p { margin: 4px 0; }

    .save-service-form {
      text-align: left;
      margin-top: 16px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #374151;
      cursor: pointer;
    }

    .saved-ok {
      color: #16a34a;
      font-size: 12px;
      margin-top: 6px;
      font-weight: 600;
    }

    .error-msg {
      color: #b91c1c;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .result-footer {
      text-align: center;
    }

    .back-catalog-link {
      color: #2563eb;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }

    @media (max-width: 480px) {
      .pay-page { padding: 16px; }
      .steps-nav { overflow-x: auto; }
      .step-label { display: none; }
    }
  `],
})
export class PayServiceComponent implements OnInit {
  private readonly billpayService = inject(BillpayServiceApi);
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly sharedState = inject(SharedStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Parametros desde query params
  serviceId = '';
  serviceName = '';
  reference = '';

  // Estado del formulario paso 2
  selectedAccountId = '';
  wantToSave = false;
  serviceNickname = '';

  // Signals
  readonly currentStep = signal(1);
  readonly queryResult = signal<BillQueryResult | null>(null);
  readonly payResult = signal<BillPayResult | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly accounts = signal<FinancialAccount[]>([]);
  readonly isSaving = signal(false);
  readonly savedMessage = signal<string | null>(null);

  readonly stepLabels = ['Consultar', 'Confirmar', 'Resultado'];

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.serviceId = params['service_id'] ?? '';
      this.serviceName = params['service_name'] ?? this.serviceId;
      // Si viene referencia precargada desde servicios guardados
      if (params['reference']) {
        this.reference = params['reference'];
      }
    });
  }

  /** Computa la cuenta seleccionada para mostrar saldo disponible */
  selectedAccount(): FinancialAccount | undefined {
    return this.accounts().find((a) => a.account_id === this.selectedAccountId);
  }

  /** Paso 1: Consultar el monto adeudado del servicio */
  consultarBill(): void {
    if (!this.reference.trim()) { return; }
    const orgId = this.sharedState.currentOrganizationId();
    this.isLoading.set(true);
    this.error.set(null);
    this.queryResult.set(null);

    this.billpayService.queryBill(orgId, this.serviceId, this.reference.trim()).subscribe({
      next: (res) => {
        this.queryResult.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudo consultar el servicio. Verifica la referencia e intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  /** Avanzar al paso 2 y cargar cuentas disponibles */
  goToStep2(): void {
    this.currentStep.set(2);
    this.loadAccounts();
  }

  /** Regresar al paso 1 */
  goToStep1(): void {
    this.currentStep.set(1);
    this.error.set(null);
  }

  /** Cargar cuentas de la organizacion para el dropdown */
  private loadAccounts(): void {
    const orgId = this.sharedState.currentOrganizationId();
    this.isLoading.set(true);

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (res) => {
        const active = (res.data ?? []).filter((a) => a.status === 'ACTIVE');
        this.accounts.set(active);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las cuentas. Intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  /** Paso 2: Confirmar y ejecutar el pago */
  confirmarPago(): void {
    if (!this.selectedAccountId) { return; }
    const orgId = this.sharedState.currentOrganizationId();
    const query = this.queryResult();
    if (!query) { return; }

    this.isLoading.set(true);
    this.error.set(null);

    const body = {
      service_id: this.serviceId,
      reference: query.reference,
      amount: query.amount_due,
      account_id: this.selectedAccountId,
      idempotency_key: Date.now().toString(36),
    };

    this.billpayService.payBill(orgId, body).subscribe({
      next: (res) => {
        this.payResult.set(res.data);
        this.currentStep.set(3);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Error al procesar el pago. Por favor intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  /** Paso 3: Guardar el servicio para pagos rapidos futuros */
  guardarServicio(): void {
    if (!this.serviceNickname.trim()) { return; }
    const orgId = this.sharedState.currentOrganizationId();
    const query = this.queryResult();
    if (!query) { return; }

    this.isSaving.set(true);

    const saveData = {
      service_id: this.serviceId,
      service_name: this.serviceName,
      reference: query.reference,
      nickname: this.serviceNickname.trim(),
    };

    this.billpayService.saveService(orgId, saveData).subscribe({
      next: () => {
        this.savedMessage.set('Servicio guardado correctamente para pagos rapidos.');
        this.isSaving.set(false);
      },
      error: () => {
        this.savedMessage.set('No se pudo guardar el servicio. Intenta mas tarde.');
        this.isSaving.set(false);
      },
    });
  }
}
