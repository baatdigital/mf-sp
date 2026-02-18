/**
 * PostOfferComponent - Publicar oferta de disponibilidad de efectivo
 *
 * Permite a una organizacion B2B publicar disponibilidad de efectivo
 * en el marketplace de liquidez (Cash Auction).
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
import { CashAuctionService, PostOfferResponse } from '../../services/cash-auction.service';

@Component({
  selector: 'sp-post-offer',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="post-offer-page">
      <header class="page-header">
        <a routerLink="/sp/business/cash-auction" class="back-link">&#8592; Marketplace</a>
        <h1>Publicar Oferta de Efectivo</h1>
        <p class="subtitle">Pon disponible el efectivo de tu punto de pago para otras empresas</p>
      </header>

      <!-- Estado de exito -->
      @if (successData()) {
        <div class="success-card">
          <div class="success-icon">&#10003;</div>
          <h2>Oferta Publicada</h2>

          <div class="detail-row">
            <span class="detail-label">ID de Oferta</span>
            <span class="detail-value mono">{{ successData()!.offer_id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Monto Disponible</span>
            <span class="detail-value amount">{{ successData()!.available_amount | number: '1.2-2' }} MXN</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Comisión</span>
            <span class="detail-value">{{ successData()!.commission_rate }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Estado</span>
            <span class="status-badge open">{{ successData()!.status }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Válido hasta</span>
            <span class="detail-value">{{ successData()!.expires_at | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>

          <a routerLink="/sp/business/cash-auction" class="btn-primary full-width">
            Ver Marketplace
          </a>
        </div>
      } @else {

        <!-- Formulario -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="offer-form">

          <div class="form-section">
            <h3 class="section-title">Información del Punto de Pago</h3>

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
              <label for="available_amount" class="form-label">Monto Disponible Total (MXN) *</label>
              <div class="input-prefix-wrapper">
                <span class="input-prefix">$</span>
                <input
                  id="available_amount"
                  type="number"
                  formControlName="available_amount"
                  class="form-input with-prefix"
                  [class.invalid]="isFieldInvalid('available_amount')"
                  placeholder="0.00"
                  min="100"
                  step="1"
                />
              </div>
              @if (isFieldInvalid('available_amount')) {
                <p class="field-error">Monto mínimo: $100 MXN.</p>
              }
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Límites por Transacción</h3>

            <div class="form-row">
              <div class="form-group">
                <label for="min_amount" class="form-label">Monto Mínimo (MXN) *</label>
                <div class="input-prefix-wrapper">
                  <span class="input-prefix">$</span>
                  <input
                    id="min_amount"
                    type="number"
                    formControlName="min_amount"
                    class="form-input with-prefix"
                    [class.invalid]="isFieldInvalid('min_amount')"
                    placeholder="100"
                    min="1"
                    step="1"
                  />
                </div>
                @if (isFieldInvalid('min_amount')) {
                  <p class="field-error">Mínimo requerido: $1 MXN.</p>
                }
              </div>

              <div class="form-group">
                <label for="max_amount" class="form-label">Monto Máximo (MXN) *</label>
                <div class="input-prefix-wrapper">
                  <span class="input-prefix">$</span>
                  <input
                    id="max_amount"
                    type="number"
                    formControlName="max_amount"
                    class="form-input with-prefix"
                    [class.invalid]="isFieldInvalid('max_amount')"
                    placeholder="5000"
                    min="1"
                    step="1"
                  />
                </div>
                @if (isFieldInvalid('max_amount')) {
                  <p class="field-error">Máximo requerido: $1 MXN.</p>
                }
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Condiciones Comerciales</h3>

            <div class="form-row">
              <div class="form-group">
                <label for="commission_rate" class="form-label">Tasa de Comisión (%) *</label>
                <div class="input-suffix-wrapper">
                  <input
                    id="commission_rate"
                    type="number"
                    formControlName="commission_rate"
                    class="form-input with-suffix"
                    [class.invalid]="isFieldInvalid('commission_rate')"
                    placeholder="0.5"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                  <span class="input-suffix">%</span>
                </div>
                @if (isFieldInvalid('commission_rate')) {
                  <p class="field-error">Tasa entre 0% y 10%.</p>
                }
                <p class="field-hint">Comisión que cobras por la operacion. Default: 0.5%</p>
              </div>

              <div class="form-group">
                <label for="expires_in_hours" class="form-label">Validez (horas) *</label>
                <input
                  id="expires_in_hours"
                  type="number"
                  formControlName="expires_in_hours"
                  class="form-input"
                  [class.invalid]="isFieldInvalid('expires_in_hours')"
                  placeholder="24"
                  min="1"
                  max="168"
                  step="1"
                />
                @if (isFieldInvalid('expires_in_hours')) {
                  <p class="field-error">Entre 1 y 168 horas (7 días).</p>
                }
                <p class="field-hint">La oferta expirará en este número de horas.</p>
              </div>
            </div>
          </div>

          @if (error()) {
            <div class="error-alert">
              <p>{{ error() }}</p>
            </div>
          }

          <button
            type="submit"
            class="btn-primary full-width"
            [disabled]="form.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="btn-spinner"></span>
              Publicando oferta...
            } @else {
              Publicar Oferta
            }
          </button>

        </form>
      }
    </div>
  `,
  styles: [`
    .post-offer-page {
      padding: 24px;
      max-width: 600px;
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

    .offer-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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
      padding: 10px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1e293b;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input.invalid { border-color: #dc2626; }

    .input-prefix-wrapper, .input-suffix-wrapper { position: relative; }

    .input-prefix {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 14px;
    }

    .input-suffix {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 14px;
    }

    .form-input.with-prefix { padding-left: 26px; }
    .form-input.with-suffix { padding-right: 28px; }

    .field-error {
      color: #dc2626;
      font-size: 11px;
      margin: 0;
    }

    .field-hint {
      font-size: 11px;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 13px 24px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
    }

    .btn-primary.full-width { width: 100%; box-sizing: border-box; }
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

    /* Success */
    .success-card {
      background: white;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .success-icon {
      width: 52px;
      height: 52px;
      background: #dcfce7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
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

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-row:last-of-type { border-bottom: none; }

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
    .detail-value.amount { color: #2563eb; font-size: 18px; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.open { background: #dcfce7; color: #16a34a; }
  `],
})
export class PostOfferComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly auctionService = inject(CashAuctionService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly successData = signal<PostOfferResponse['data'] | null>(null);

  readonly form = this.fb.nonNullable.group({
    point_id: ['', [Validators.required]],
    available_amount: [null as unknown as number, [Validators.required, Validators.min(100)]],
    min_amount: [100, [Validators.required, Validators.min(1)]],
    max_amount: [5000, [Validators.required, Validators.min(1)]],
    commission_rate: [0.5, [Validators.required, Validators.min(0), Validators.max(10)]],
    expires_in_hours: [24, [Validators.required, Validators.min(1), Validators.max(168)]],
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

    const formValue = this.form.getRawValue();

    this.isLoading.set(true);
    this.error.set(null);

    this.auctionService.postOffer(orgId, formValue).subscribe({
      next: (response) => {
        this.successData.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al publicar la oferta. Intente de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
