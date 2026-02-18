/**
 * ConfirmOfferComponent - Confirmar reserva de efectivo en el marketplace
 *
 * Confirma la entrega de efectivo con el codigo de autorizacion
 * generado al reservar una oferta del Cash Auction.
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
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { SharedStateService } from '@shared-state';
import { CashAuctionService, ConfirmReservationResponse } from '../../services/cash-auction.service';

@Component({
  selector: 'sp-confirm-offer',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confirm-offer-page">
      <header class="page-header">
        <a routerLink="/sp/business/cash-auction" class="back-link">&#8592; Marketplace</a>
        <h1>Confirmar Retiro</h1>
        <p class="subtitle">Ingresa el código para confirmar que recibiste el efectivo</p>
      </header>

      <!-- Estado de exito -->
      @if (completedData()) {
        <div class="success-card">
          <div class="success-icon">&#10003;</div>
          <h2>Transacción Completada</h2>

          <div class="details-section">
            <div class="detail-row">
              <span class="detail-label">ID de Transacción</span>
              <span class="detail-value mono">{{ completedData()!.transaction_id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Monto Recibido</span>
              <span class="detail-value amount">{{ completedData()!.amount | number: '1.2-2' }} MXN</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Completado</span>
              <span class="detail-value">{{ completedData()!.completed_at | date: 'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Estado</span>
              <span class="status-badge completed">{{ completedData()!.status }}</span>
            </div>
          </div>

          <a routerLink="/sp/business/cash-auction" class="btn-primary">
            Volver al Marketplace
          </a>
        </div>
      } @else {

        <!-- Info de la oferta -->
        @if (offerId()) {
          <div class="offer-context">
            <p class="context-label">Confirmando oferta</p>
            <p class="context-id mono">{{ offerId() }}</p>
          </div>
        }

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
                  El código es requerido.
                } @else if (form.get('authorization_code')?.errors?.['minlength'] || form.get('authorization_code')?.errors?.['maxlength']) {
                  El código debe tener exactamente 6 caracteres.
                }
              </p>
            }
            <p class="field-hint">El código de autorización que obtuviste al reservar la oferta</p>
          </div>

          @if (error()) {
            <div class="error-alert">
              <p>{{ error() }}</p>
            </div>
          }

          <div class="actions">
            <button
              type="submit"
              class="btn-primary"
              [disabled]="form.invalid || isLoading() || !offerId()"
            >
              @if (isLoading()) {
                <span class="btn-spinner"></span>
                Confirmando...
              } @else {
                Confirmar Recepción
              }
            </button>

            <a routerLink="/sp/business/cash-auction" class="btn-secondary">
              Cancelar
            </a>
          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    .confirm-offer-page {
      padding: 24px;
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

    .offer-context {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .context-label {
      font-size: 11px;
      color: #0369a1;
      margin: 0 0 4px;
      text-transform: uppercase;
    }

    .context-id {
      font-size: 13px;
      font-weight: 600;
      color: #0c4a6e;
      margin: 0;
      font-family: monospace;
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
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-align: center;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      padding: 18px;
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

    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
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

    .btn-secondary {
      display: block;
      text-align: center;
      background: #f1f5f9;
      color: #475569;
      border-radius: 10px;
      padding: 13px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s;
    }

    .btn-secondary:hover { background: #e2e8f0; }

    /* Success card */
    .success-card {
      background: white;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 20px;
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
      margin: 0 auto;
    }

    .success-card h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      text-align: center;
      margin: 0;
    }

    .details-section {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
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

    .detail-value.mono { font-family: monospace; font-size: 12px; }
    .detail-value.amount { color: #16a34a; font-size: 18px; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.completed { background: #dcfce7; color: #16a34a; }
  `],
})
export class ConfirmOfferComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly auctionService = inject(CashAuctionService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly completedData = signal<ConfirmReservationResponse['data'] | null>(null);
  readonly offerId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    authorization_code: ['', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
    ]],
  });

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('offerId');
    this.offerId.set(paramId ?? null);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.form.get('authorization_code')?.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentOfferId = this.offerId();
    if (!currentOfferId) {
      this.error.set('ID de oferta no encontrado.');
      return;
    }

    const { authorization_code } = this.form.getRawValue();

    this.isLoading.set(true);
    this.error.set(null);

    this.auctionService.confirmReservation(currentOfferId, { authorization_code }).subscribe({
      next: (response) => {
        this.completedData.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Código inválido o reserva expirada. Verifique e intente de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
