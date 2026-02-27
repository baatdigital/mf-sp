/**
 * CreateAccountComponent
 *
 * Formulario para crear nueva cuenta o subwallet dentro de la organizacion.
 * EP-SP-011: US-SP-038
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type AccountType = 'SUB' | 'WALLET';

interface ParentAccountOption {
  id: string;
  label: string;
  clabe: string;
  type: string;
}

interface CreateAccountFormData {
  label: string;
  parent_account_id: string;
  currency: string;
  type: AccountType;
}

@Component({
  selector: 'sp-create-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="sp-create-account">

      <!-- Header -->
      <div class="sp-create-account__header">
        <a routerLink="/sp/business/accounts" class="sp-create-account__back">
          ← Volver a Cuentas
        </a>
        <h1 class="sp-create-account__title">Nueva Cuenta</h1>
        <p class="sp-create-account__subtitle">Crea una subcuenta o wallet dentro de tu organizacion</p>
      </div>

      <!-- Formulario -->
      <div class="sp-create-account__form-card">
        @if (submitted() && success()) {
          <div class="sp-create-account__success">
            <span class="sp-create-account__success-icon">✓</span>
            <div>
              <strong>Cuenta creada exitosamente</strong>
              <p>La cuenta "{{ formData().label }}" ha sido creada.</p>
            </div>
            <a routerLink="/sp/business/accounts" class="sp-create-account__btn sp-create-account__btn--primary">
              Ver cuentas
            </a>
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" class="sp-create-account__form">

            <!-- Nombre -->
            <div class="sp-create-account__field">
              <label class="sp-create-account__label" for="label">
                Nombre de la cuenta <span class="sp-create-account__required">*</span>
              </label>
              <input
                id="label"
                type="text"
                [ngModel]="formData().label"
                (ngModelChange)="updateField('label', $event)"
                name="label"
                maxlength="60"
                placeholder="Ej. Subcuenta Operaciones Norte"
                class="sp-create-account__input"
                [class.sp-create-account__input--error]="submitted() && !formData().label"
              />
              @if (submitted() && !formData().label) {
                <span class="sp-create-account__error">El nombre es obligatorio</span>
              }
              <span class="sp-create-account__hint">{{ formData().label.length }}/60</span>
            </div>

            <!-- Tipo de cuenta -->
            <div class="sp-create-account__field">
              <label class="sp-create-account__label">
                Tipo de cuenta <span class="sp-create-account__required">*</span>
              </label>
              <div class="sp-create-account__type-options">
                <label
                  [class]="'sp-create-account__type-option' + (formData().type === 'SUB' ? ' selected' : '')"
                  (click)="updateField('type', 'SUB')">
                  <input type="radio" name="type" value="SUB" [checked]="formData().type === 'SUB'" style="display:none"/>
                  <span class="sp-create-account__type-icon">🏢</span>
                  <div>
                    <strong>Subcuenta</strong>
                    <p>Cuenta hija de una cuenta maestra. Tiene CLABE propia.</p>
                  </div>
                </label>
                <label
                  [class]="'sp-create-account__type-option' + (formData().type === 'WALLET' ? ' selected' : '')"
                  (click)="updateField('type', 'WALLET')">
                  <input type="radio" name="type" value="WALLET" [checked]="formData().type === 'WALLET'" style="display:none"/>
                  <span class="sp-create-account__type-icon">👛</span>
                  <div>
                    <strong>Wallet</strong>
                    <p>Balance virtual sin CLABE. Ideal para partidas presupuestales.</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Cuenta padre -->
            <div class="sp-create-account__field">
              <label class="sp-create-account__label" for="parent">
                Cuenta padre <span class="sp-create-account__required">*</span>
              </label>
              <select
                id="parent"
                [ngModel]="formData().parent_account_id"
                (ngModelChange)="updateField('parent_account_id', $event)"
                name="parent_account_id"
                class="sp-create-account__select"
                [class.sp-create-account__input--error]="submitted() && !formData().parent_account_id">
                <option value="">-- Selecciona cuenta padre --</option>
                @for (parent of parentAccounts(); track parent.id) {
                  <option [value]="parent.id">{{ parent.label }} · {{ parent.clabe }}</option>
                }
              </select>
              @if (submitted() && !formData().parent_account_id) {
                <span class="sp-create-account__error">Selecciona una cuenta padre</span>
              }
            </div>

            <!-- Moneda -->
            <div class="sp-create-account__field">
              <label class="sp-create-account__label" for="currency">Moneda</label>
              <select
                id="currency"
                [ngModel]="formData().currency"
                (ngModelChange)="updateField('currency', $event)"
                name="currency"
                class="sp-create-account__select">
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="USD">USD - Dolar Americano</option>
              </select>
              <span class="sp-create-account__hint">Solo MXN disponible para cuentas SPEI</span>
            </div>

            <!-- Resumen -->
            @if (canSubmit()) {
              <div class="sp-create-account__summary">
                <h3 class="sp-create-account__summary-title">Resumen</h3>
                <div class="sp-create-account__summary-row">
                  <span>Nombre</span><strong>{{ formData().label }}</strong>
                </div>
                <div class="sp-create-account__summary-row">
                  <span>Tipo</span><strong>{{ formData().type === 'SUB' ? 'Subcuenta' : 'Wallet' }}</strong>
                </div>
                <div class="sp-create-account__summary-row">
                  <span>Padre</span><strong>{{ selectedParentLabel() }}</strong>
                </div>
                <div class="sp-create-account__summary-row">
                  <span>Moneda</span><strong>{{ formData().currency }}</strong>
                </div>
              </div>
            }

            <!-- Acciones -->
            <div class="sp-create-account__actions">
              <a routerLink="/sp/business/accounts" class="sp-create-account__btn sp-create-account__btn--cancel">
                Cancelar
              </a>
              <button
                type="submit"
                class="sp-create-account__btn sp-create-account__btn--primary"
                [disabled]="loading()">
                @if (loading()) { Creando... } @else { Crear cuenta }
              </button>
            </div>

          </form>
        }
      </div>

    </div>
  `,
  styles: [`
    .sp-create-account { padding: 24px; max-width: 640px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-create-account__back { font-size: 13px; color: #3182ce; text-decoration: none; display: block; margin-bottom: 16px; }
    .sp-create-account__back:hover { text-decoration: underline; }
    .sp-create-account__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-create-account__subtitle { font-size: 13px; color: #718096; margin: 0 0 24px; }

    /* Form card */
    .sp-create-account__form-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* Fields */
    .sp-create-account__form { display: flex; flex-direction: column; gap: 20px; }
    .sp-create-account__field { display: flex; flex-direction: column; gap: 6px; }
    .sp-create-account__label { font-size: 13px; font-weight: 600; color: #4a5568; }
    .sp-create-account__required { color: #e53e3e; }
    .sp-create-account__input,
    .sp-create-account__select {
      padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    .sp-create-account__input:focus,
    .sp-create-account__select:focus { border-color: #3182ce; }
    .sp-create-account__input--error { border-color: #e53e3e; }
    .sp-create-account__hint { font-size: 11px; color: #a0aec0; }
    .sp-create-account__error { font-size: 11px; color: #e53e3e; }

    /* Type options */
    .sp-create-account__type-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .sp-create-account__type-option {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 14px; border: 2px solid #e2e8f0; border-radius: 10px;
      cursor: pointer; transition: all 0.15s;
    }
    .sp-create-account__type-option:hover { border-color: #90cdf4; }
    .sp-create-account__type-option.selected { border-color: #3182ce; background: #ebf8ff; }
    .sp-create-account__type-icon { font-size: 22px; flex-shrink: 0; }
    .sp-create-account__type-option strong { font-size: 13px; color: #2d3748; display: block; }
    .sp-create-account__type-option p { font-size: 11px; color: #718096; margin: 2px 0 0; }

    /* Summary */
    .sp-create-account__summary {
      background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;
    }
    .sp-create-account__summary-title { font-size: 13px; font-weight: 700; color: #4a5568; margin: 0 0 10px; }
    .sp-create-account__summary-row {
      display: flex; justify-content: space-between; font-size: 13px;
      padding: 5px 0; border-bottom: 1px solid #edf2f7;
    }
    .sp-create-account__summary-row:last-child { border-bottom: none; }
    .sp-create-account__summary-row span { color: #718096; }

    /* Actions */
    .sp-create-account__actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
    .sp-create-account__btn {
      padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center;
    }
    .sp-create-account__btn--primary { background: #3182ce; color: white; }
    .sp-create-account__btn--primary:hover { background: #2b6cb0; }
    .sp-create-account__btn--primary:disabled { background: #a0aec0; cursor: not-allowed; }
    .sp-create-account__btn--cancel { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-create-account__btn--cancel:hover { background: #f7fafc; }

    /* Success */
    .sp-create-account__success {
      display: flex; gap: 16px; align-items: center;
      background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 10px; padding: 20px;
    }
    .sp-create-account__success-icon {
      width: 40px; height: 40px; background: #38a169; color: white; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
    }
    .sp-create-account__success strong { font-size: 15px; color: #276749; }
    .sp-create-account__success p { font-size: 13px; color: #4a5568; margin: 4px 0 0; }
  `],
})
export class CreateAccountComponent {
  readonly formData = signal<CreateAccountFormData>({
    label: '',
    parent_account_id: '',
    currency: 'MXN',
    type: 'SUB',
  });

  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);

  readonly parentAccounts = signal<ParentAccountOption[]>([
    { id: 'acc-master-001', label: 'Cuenta Maestra Principal', clabe: '646180110400000001', type: 'MASTER' },
    { id: 'acc-sub-001', label: 'Subcuenta Operaciones', clabe: '646180110400000002', type: 'SUB' },
    { id: 'acc-sub-002', label: 'Subcuenta Nomina', clabe: '646180110400000003', type: 'SUB' },
  ]);

  readonly canSubmit = computed(() => {
    const d = this.formData();
    return !!d.label && !!d.parent_account_id && !!d.type;
  });

  readonly selectedParentLabel = computed(() => {
    const parent = this.parentAccounts().find((p) => p.id === this.formData().parent_account_id);
    return parent?.label ?? '';
  });

  updateField<K extends keyof CreateAccountFormData>(field: K, value: CreateAccountFormData[K]): void {
    this.formData.update((current) => ({ ...current, [field]: value }));
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (!this.canSubmit()) return;

    this.loading.set(true);
    // Simular llamada al backend
    setTimeout(() => {
      this.loading.set(false);
      this.success.set(true);
    }, 1200);
  }
}
