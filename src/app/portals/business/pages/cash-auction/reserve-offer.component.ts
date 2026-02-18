/**
 * ReserveOfferComponent - Reservar una oferta de efectivo
 *
 * Permite reservar un monto de efectivo de una oferta del marketplace.
 * Genera un authorization_code valido por 15 minutos.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  Input,
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
import { CashAuctionService, ReserveOfferResponse } from '../../services/cash-auction.service';

@Component({
  selector: 'sp-reserve-offer',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reserve-offer-page">
      <header class="page-header">
        <a routerLink="/sp/business/cash-auction" class="back-link">&#8592; Marketplace</a>
        <h1>Reservar Efectivo</h1>
        <p class="subtitle">Ingresa el monto que necesitas retirar de esta oferta</p>
      </header>

      <!-- Estado de exito: mostrar auth code con countdown de 15 min -->
      @if (reservationData()) {
        <div class="auth-card">
          <p class="auth-label">Código de Autorización</p>
          <p class="auth-code">{{ reservationData()!.authorization_code }}</p>

          <div class="countdown-section">
            @if (timeRemaining() > 0) {
              <p class="countdown-label">Válido por:</p>
              <p class="countdown-timer" [class.urgent]="timeRemaining() < 120">
                {{ formattedTime() }}
              </p>
              <p class="countdown-note">
                Dirígete al punto de pago con este código antes de que expire
              </p>
            } @else {
              <div class="expired-notice">
                <p>El código ha expirado.</p>
                <button type="button" (click)="resetReservation()" class="btn-outline">
                  Nueva reserva
                </button>
              </div>
            }
          </div>

          <div class="reservation-details">
            <div class="detail-row">
              <span class="detail-label">Monto</span>
              <span class="detail-value">{{ reservationData()!.amount | number: '1.2-2' }} MXN</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ID de Reserva</span>
              <span class="detail-value mono">{{ reservationData()!.reservation_id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vence</span>
              <span class="detail-value">{{ reservationData()!.expires_at | date: 'dd/MM HH:mm' }}</span>
            </div>
          </div>

          <a [routerLink]="['/sp/business/cash-auction/confirm', reservationData()!.offer_id]" class="btn-primary">
            Confirmar Retiro
          </a>
        </div>
      } @else {

        <!-- Info de la oferta (si se cargo) -->
        @if (offerId()) {
          <div class="offer-info-card">
            <p class="offer-info-label">Oferta ID</p>
            <p class="offer-info-value mono">{{ offerId() }}</p>
          </div>
        }

        <!-- Formulario de reserva -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="reserve-form">

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
                  El monto debe ser mayor a $0.
                }
              </p>
            }
            <p class="field-hint">Debe estar entre los límites min/max de la oferta</p>
          </div>

          @if (error()) {
            <div class="error-alert">
              <p>{{ error() }}</p>
            </div>
          }

          <button
            type="submit"
            class="btn-primary"
            [disabled]="form.invalid || isLoading() || !offerId()"
          >
            @if (isLoading()) {
              <span class="btn-spinner"></span>
              Reservando...
            } @else {
              Reservar Efectivo
            }
          </button>

        </form>
      }
    </div>
  `,
  styles: [`
    .reserve-offer-page {
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

    .offer-info-card {
      background: #f8fafc;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .offer-info-label {
      font-size: 11px;
      color: #94a3b8;
      margin: 0 0 4px;
      text-transform: uppercase;
    }

    .offer-info-value {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .offer-info-value.mono { font-family: monospace; }

    .reserve-form {
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

    /* Auth code card */
    .auth-card {
      background: white;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .auth-label {
      font-size: 12px;
      text-align: center;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .auth-code {
      font-size: 44px;
      font-weight: 900;
      letter-spacing: 0.15em;
      text-align: center;
      font-family: 'Courier New', monospace;
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      color: #1e293b;
      margin: 0;
    }

    .countdown-section { text-align: center; }

    .countdown-label {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 6px;
    }

    .countdown-timer {
      font-size: 36px;
      font-weight: 700;
      color: #2563eb;
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
      background: #fef2f2;
      border-radius: 8px;
      padding: 12px;
      color: #b91c1c;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .btn-outline {
      background: transparent;
      border: 1.5px solid #2563eb;
      color: #2563eb;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }

    .reservation-details {
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

    .detail-value.mono { font-family: monospace; font-size: 12px; }
  `],
})
export class ReserveOfferComponent implements OnInit, OnDestroy {
  @Input() offerId_input?: string;
  @Input() postingOrgId?: string;

  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly auctionService = inject(CashAuctionService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly reservationData = signal<ReserveOfferResponse['data'] | null>(null);
  readonly offerId = signal<string | null>(null);
  readonly timeRemaining = signal(0);
  readonly formattedTime = signal('15:00');

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  readonly form = this.fb.nonNullable.group({
    amount: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit(): void {
    // Obtener offerId desde los parametros de ruta
    const paramId = this.route.snapshot.paramMap.get('offerId');
    this.offerId.set(paramId ?? this.offerId_input ?? null);
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

    const currentOfferId = this.offerId();
    if (!currentOfferId) {
      this.error.set('ID de oferta no encontrado.');
      return;
    }

    const { amount } = this.form.getRawValue();

    this.isLoading.set(true);
    this.error.set(null);

    this.auctionService.reserveOffer(currentOfferId, { amount }).subscribe({
      next: (response) => {
        this.reservationData.set(response.data);
        this.isLoading.set(false);
        this.startCountdown(response.data.expires_at);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al reservar la oferta. Intente de nuevo.');
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

    // Verificar si el tiempo ya paso
    updateTimer();
    if (this.timeRemaining() <= 0) {
      // Usar 15 minutos como fallback
      this.timeRemaining.set(15 * 60);
      this.formattedTime.set('15:00');
    }

    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  resetReservation(): void {
    this.reservationData.set(null);
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
