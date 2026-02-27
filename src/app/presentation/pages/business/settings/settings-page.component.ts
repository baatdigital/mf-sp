/**
 * SettingsPageComponent
 *
 * Configuracion de la organizacion: datos empresa, limites de transferencia y notificaciones.
 * EP-SP-011: US-SP-047
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CompanyData {
  name: string;
  rfc: string;
  address: string;
  phone: string;
  contact_email: string;
}

interface TransferLimits {
  single_transfer_max: number;
  daily_transfer_max: number;
  single_approval_threshold: number;
  allowed_hours_from: string;
  allowed_hours_to: string;
  allow_weekends: boolean;
}

interface NotificationSettings {
  email_on_transfer: boolean;
  email_on_approval_required: boolean;
  email_on_approval_resolved: boolean;
  email_on_new_user: boolean;
  email_on_low_balance: boolean;
  low_balance_threshold: number;
}

type ActiveSection = 'company' | 'limits' | 'notifications';

@Component({
  selector: 'sp-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sp-settings">

      <!-- Header -->
      <div class="sp-settings__header">
        <h1 class="sp-settings__title">Configuracion</h1>
        <p class="sp-settings__subtitle">Gestiona los datos y preferencias de tu organizacion</p>
      </div>

      <!-- Pestanas de seccion -->
      <div class="sp-settings__sections-nav">
        <button
          [class]="'sp-settings__section-tab' + (activeSection() === 'company' ? ' active' : '')"
          (click)="activeSection.set('company')">
          🏢 Datos de empresa
        </button>
        <button
          [class]="'sp-settings__section-tab' + (activeSection() === 'limits' ? ' active' : '')"
          (click)="activeSection.set('limits')">
          💰 Limites de transferencia
        </button>
        <button
          [class]="'sp-settings__section-tab' + (activeSection() === 'notifications' ? ' active' : '')"
          (click)="activeSection.set('notifications')">
          🔔 Notificaciones
        </button>
      </div>

      <!-- Seccion: Datos de empresa -->
      @if (activeSection() === 'company') {
        <div class="sp-settings__section-card">
          <h2 class="sp-settings__section-title">Datos de empresa</h2>
          <p class="sp-settings__section-desc">Informacion de tu organizacion registrada en SuperPago.</p>

          <div class="sp-settings__form-grid">
            <div class="sp-settings__field sp-settings__field--full">
              <label>Razon social <span class="sp-settings__required">*</span></label>
              <input
                type="text"
                [ngModel]="companyData().name"
                (ngModelChange)="updateCompany('name', $event)"
                name="name"
                class="sp-settings__input"
              />
            </div>
            <div class="sp-settings__field">
              <label>RFC <span class="sp-settings__required">*</span></label>
              <input
                type="text"
                [ngModel]="companyData().rfc"
                (ngModelChange)="updateCompany('rfc', $event)"
                name="rfc"
                maxlength="13"
                placeholder="XAXX010101000"
                class="sp-settings__input"
              />
            </div>
            <div class="sp-settings__field">
              <label>Telefono</label>
              <input
                type="tel"
                [ngModel]="companyData().phone"
                (ngModelChange)="updateCompany('phone', $event)"
                name="phone"
                placeholder="+52 55 0000 0000"
                class="sp-settings__input"
              />
            </div>
            <div class="sp-settings__field sp-settings__field--full">
              <label>Direccion fiscal</label>
              <input
                type="text"
                [ngModel]="companyData().address"
                (ngModelChange)="updateCompany('address', $event)"
                name="address"
                placeholder="Calle, numero, ciudad, estado, CP"
                class="sp-settings__input"
              />
            </div>
            <div class="sp-settings__field sp-settings__field--full">
              <label>Email de contacto</label>
              <input
                type="email"
                [ngModel]="companyData().contact_email"
                (ngModelChange)="updateCompany('contact_email', $event)"
                name="contact_email"
                class="sp-settings__input"
              />
            </div>
          </div>

          <div class="sp-settings__save-row">
            @if (companySaved()) {
              <span class="sp-settings__saved-msg">✓ Cambios guardados</span>
            }
            <button (click)="saveCompany()" class="sp-settings__btn sp-settings__btn--primary">
              Guardar cambios
            </button>
          </div>
        </div>
      }

      <!-- Seccion: Limites de transferencia -->
      @if (activeSection() === 'limits') {
        <div class="sp-settings__section-card">
          <h2 class="sp-settings__section-title">Limites de transferencia</h2>
          <p class="sp-settings__section-desc">
            Define los topes maximos y horarios permitidos para transferencias SPEI.
          </p>

          <div class="sp-settings__form-grid">
            <div class="sp-settings__field">
              <label>Limite por transferencia (MXN)</label>
              <div class="sp-settings__input-prefix-wrap">
                <span class="sp-settings__prefix">$</span>
                <input
                  type="number"
                  [ngModel]="limits().single_transfer_max"
                  (ngModelChange)="updateLimits('single_transfer_max', +$event)"
                  name="single_max"
                  min="1000"
                  class="sp-settings__input sp-settings__input--prefixed"
                />
              </div>
              <span class="sp-settings__hint">Maximo permitido por una sola transferencia.</span>
            </div>
            <div class="sp-settings__field">
              <label>Limite diario total (MXN)</label>
              <div class="sp-settings__input-prefix-wrap">
                <span class="sp-settings__prefix">$</span>
                <input
                  type="number"
                  [ngModel]="limits().daily_transfer_max"
                  (ngModelChange)="updateLimits('daily_transfer_max', +$event)"
                  name="daily_max"
                  class="sp-settings__input sp-settings__input--prefixed"
                />
              </div>
              <span class="sp-settings__hint">Suma maxima de todas las transferencias del dia.</span>
            </div>
            <div class="sp-settings__field">
              <label>Umbral de aprobacion (MXN)</label>
              <div class="sp-settings__input-prefix-wrap">
                <span class="sp-settings__prefix">$</span>
                <input
                  type="number"
                  [ngModel]="limits().single_approval_threshold"
                  (ngModelChange)="updateLimits('single_approval_threshold', +$event)"
                  name="approval_threshold"
                  class="sp-settings__input sp-settings__input--prefixed"
                />
              </div>
              <span class="sp-settings__hint">Transferencias mayores a este monto requieren aprobacion.</span>
            </div>
            <div class="sp-settings__field">
              <label>Horario permitido desde</label>
              <input
                type="time"
                [ngModel]="limits().allowed_hours_from"
                (ngModelChange)="updateLimits('allowed_hours_from', $event)"
                name="hours_from"
                class="sp-settings__input"
              />
            </div>
            <div class="sp-settings__field">
              <label>Horario permitido hasta</label>
              <input
                type="time"
                [ngModel]="limits().allowed_hours_to"
                (ngModelChange)="updateLimits('allowed_hours_to', $event)"
                name="hours_to"
                class="sp-settings__input"
              />
            </div>
            <div class="sp-settings__field sp-settings__field--full">
              <label class="sp-settings__checkbox-label">
                <input
                  type="checkbox"
                  [ngModel]="limits().allow_weekends"
                  (ngModelChange)="updateLimits('allow_weekends', $event)"
                  name="allow_weekends"
                />
                Permitir transferencias en sabados (fuera de horario SPEI normal)
              </label>
            </div>
          </div>

          <!-- Resumen de limites -->
          <div class="sp-settings__limits-summary">
            <h4>Configuracion actual</h4>
            <div class="sp-settings__limits-row">
              <span>Transferencia maxima</span>
              <strong>$ {{ limits().single_transfer_max | number:'1.0-0' }} MXN</strong>
            </div>
            <div class="sp-settings__limits-row">
              <span>Limite diario</span>
              <strong>$ {{ limits().daily_transfer_max | number:'1.0-0' }} MXN</strong>
            </div>
            <div class="sp-settings__limits-row">
              <span>Umbral aprobacion</span>
              <strong>$ {{ limits().single_approval_threshold | number:'1.0-0' }} MXN</strong>
            </div>
          </div>

          <div class="sp-settings__save-row">
            @if (limitsSaved()) {
              <span class="sp-settings__saved-msg">✓ Limites actualizados</span>
            }
            <button (click)="saveLimits()" class="sp-settings__btn sp-settings__btn--primary">
              Guardar limites
            </button>
          </div>
        </div>
      }

      <!-- Seccion: Notificaciones -->
      @if (activeSection() === 'notifications') {
        <div class="sp-settings__section-card">
          <h2 class="sp-settings__section-title">Notificaciones por email</h2>
          <p class="sp-settings__section-desc">
            Configura cuando deseas recibir alertas por correo electronico.
          </p>

          <div class="sp-settings__notifications-list">

            <div class="sp-settings__notif-item">
              <div class="sp-settings__notif-info">
                <strong>Transferencia realizada</strong>
                <p>Recibir confirmacion cuando se ejecuta una transferencia SPEI.</p>
              </div>
              <label class="sp-settings__toggle">
                <input
                  type="checkbox"
                  [ngModel]="notifications().email_on_transfer"
                  (ngModelChange)="updateNotification('email_on_transfer', $event)"
                  name="on_transfer"
                />
                <span class="sp-settings__toggle-slider"></span>
              </label>
            </div>

            <div class="sp-settings__notif-item">
              <div class="sp-settings__notif-info">
                <strong>Aprobacion requerida</strong>
                <p>Notificar a administradores cuando una transferencia supera el umbral.</p>
              </div>
              <label class="sp-settings__toggle">
                <input
                  type="checkbox"
                  [ngModel]="notifications().email_on_approval_required"
                  (ngModelChange)="updateNotification('email_on_approval_required', $event)"
                  name="on_approval_req"
                />
                <span class="sp-settings__toggle-slider"></span>
              </label>
            </div>

            <div class="sp-settings__notif-item">
              <div class="sp-settings__notif-info">
                <strong>Aprobacion resuelta</strong>
                <p>Notificar al operador cuando su transferencia es aprobada o rechazada.</p>
              </div>
              <label class="sp-settings__toggle">
                <input
                  type="checkbox"
                  [ngModel]="notifications().email_on_approval_resolved"
                  (ngModelChange)="updateNotification('email_on_approval_resolved', $event)"
                  name="on_approval_res"
                />
                <span class="sp-settings__toggle-slider"></span>
              </label>
            </div>

            <div class="sp-settings__notif-item">
              <div class="sp-settings__notif-info">
                <strong>Nuevo usuario invitado</strong>
                <p>Notificar cuando un nuevo usuario acepta la invitacion.</p>
              </div>
              <label class="sp-settings__toggle">
                <input
                  type="checkbox"
                  [ngModel]="notifications().email_on_new_user"
                  (ngModelChange)="updateNotification('email_on_new_user', $event)"
                  name="on_new_user"
                />
                <span class="sp-settings__toggle-slider"></span>
              </label>
            </div>

            <div class="sp-settings__notif-item">
              <div class="sp-settings__notif-info">
                <strong>Alerta de saldo bajo</strong>
                <p>
                  Notificar cuando el saldo disponible baje del umbral configurado.
                </p>
                @if (notifications().email_on_low_balance) {
                  <div class="sp-settings__notif-threshold">
                    <label>Umbral minimo ($)</label>
                    <input
                      type="number"
                      [ngModel]="notifications().low_balance_threshold"
                      (ngModelChange)="updateNotification('low_balance_threshold', +$event)"
                      name="low_balance_threshold"
                      class="sp-settings__input sp-settings__input--inline"
                    />
                  </div>
                }
              </div>
              <label class="sp-settings__toggle">
                <input
                  type="checkbox"
                  [ngModel]="notifications().email_on_low_balance"
                  (ngModelChange)="updateNotification('email_on_low_balance', $event)"
                  name="on_low_balance"
                />
                <span class="sp-settings__toggle-slider"></span>
              </label>
            </div>

          </div>

          <div class="sp-settings__save-row">
            @if (notifSaved()) {
              <span class="sp-settings__saved-msg">✓ Preferencias guardadas</span>
            }
            <button (click)="saveNotifications()" class="sp-settings__btn sp-settings__btn--primary">
              Guardar preferencias
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-settings { padding: 24px; max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-settings__header { margin-bottom: 24px; }
    .sp-settings__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-settings__subtitle { font-size: 13px; color: #718096; margin: 0; }

    /* Section nav */
    .sp-settings__sections-nav {
      display: flex; gap: 2px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px;
    }
    .sp-settings__section-tab {
      padding: 10px 20px; border: none; background: none; cursor: pointer;
      font-size: 13px; font-weight: 600; color: #718096;
      border-bottom: 2px solid transparent; margin-bottom: -2px; border-radius: 8px 8px 0 0;
    }
    .sp-settings__section-tab:hover { color: #4a5568; background: #f7fafc; }
    .sp-settings__section-tab.active { color: #3182ce; border-bottom-color: #3182ce; background: #ebf8ff; }

    /* Section card */
    .sp-settings__section-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-settings__section-title { font-size: 17px; font-weight: 700; color: #1a202c; margin: 0 0 6px; }
    .sp-settings__section-desc { font-size: 13px; color: #718096; margin: 0 0 24px; }

    /* Form */
    .sp-settings__form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .sp-settings__field { display: flex; flex-direction: column; gap: 5px; }
    .sp-settings__field--full { grid-column: 1 / -1; }
    .sp-settings__field label { font-size: 12px; font-weight: 600; color: #4a5568; }
    .sp-settings__required { color: #e53e3e; }
    .sp-settings__input {
      padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    .sp-settings__input:focus { border-color: #3182ce; }
    .sp-settings__input--prefixed { padding-left: 8px; }
    .sp-settings__input--inline { width: 120px; padding: 5px 8px; font-size: 13px; margin-top: 4px; }
    .sp-settings__input-prefix-wrap { display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .sp-settings__input-prefix-wrap .sp-settings__input { border: none; flex: 1; }
    .sp-settings__prefix { padding: 9px 10px; background: #f7fafc; color: #4a5568; font-weight: 700; font-size: 14px; }
    .sp-settings__hint { font-size: 11px; color: #a0aec0; }
    .sp-settings__checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }

    /* Limits summary */
    .sp-settings__limits-summary {
      background: #f7fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;
    }
    .sp-settings__limits-summary h4 { font-size: 12px; font-weight: 700; color: #718096; margin: 0 0 8px; text-transform: uppercase; }
    .sp-settings__limits-row {
      display: flex; justify-content: space-between; font-size: 13px;
      padding: 5px 0; border-bottom: 1px solid #edf2f7;
    }
    .sp-settings__limits-row:last-child { border-bottom: none; }
    .sp-settings__limits-row span { color: #718096; }

    /* Save row */
    .sp-settings__save-row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
    .sp-settings__saved-msg { font-size: 13px; color: #38a169; font-weight: 600; }
    .sp-settings__btn {
      padding: 9px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none;
    }
    .sp-settings__btn--primary { background: #3182ce; color: white; }
    .sp-settings__btn--primary:hover { background: #2b6cb0; }

    /* Notifications */
    .sp-settings__notifications-list { display: flex; flex-direction: column; gap: 0; margin-bottom: 24px; }
    .sp-settings__notif-item {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      padding: 16px 0; border-bottom: 1px solid #f7fafc;
    }
    .sp-settings__notif-item:last-child { border-bottom: none; }
    .sp-settings__notif-info { flex: 1; }
    .sp-settings__notif-info strong { font-size: 13px; color: #2d3748; display: block; margin-bottom: 3px; }
    .sp-settings__notif-info p { font-size: 12px; color: #718096; margin: 0; }
    .sp-settings__notif-threshold { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; color: #4a5568; }

    /* Toggle switch */
    .sp-settings__toggle { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; flex-shrink: 0; }
    .sp-settings__toggle input { opacity: 0; width: 0; height: 0; }
    .sp-settings__toggle-slider {
      position: absolute; inset: 0; background: #cbd5e0; border-radius: 22px;
      transition: background 0.2s;
    }
    .sp-settings__toggle-slider::before {
      content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px;
      background: white; border-radius: 50%; transition: transform 0.2s;
    }
    .sp-settings__toggle input:checked + .sp-settings__toggle-slider { background: #3182ce; }
    .sp-settings__toggle input:checked + .sp-settings__toggle-slider::before { transform: translateX(18px); }

    @media (max-width: 640px) {
      .sp-settings__form-grid { grid-template-columns: 1fr; }
      .sp-settings__field--full { grid-column: 1; }
      .sp-settings__sections-nav { flex-wrap: wrap; }
    }
  `],
})
export class SettingsPageComponent {
  readonly activeSection = signal<ActiveSection>('company');
  readonly companySaved = signal(false);
  readonly limitsSaved = signal(false);
  readonly notifSaved = signal(false);

  readonly companyData = signal<CompanyData>({
    name: 'Empresa Ejemplo SA de CV',
    rfc: 'EEJ200101AB3',
    address: 'Insurgentes Sur 1234, Col. Del Valle, CDMX, 03100',
    phone: '+52 55 1234 5678',
    contact_email: 'finanzas@empresa.com',
  });

  readonly limits = signal<TransferLimits>({
    single_transfer_max: 500_000,
    daily_transfer_max: 2_000_000,
    single_approval_threshold: 100_000,
    allowed_hours_from: '08:00',
    allowed_hours_to: '18:00',
    allow_weekends: false,
  });

  readonly notifications = signal<NotificationSettings>({
    email_on_transfer: true,
    email_on_approval_required: true,
    email_on_approval_resolved: true,
    email_on_new_user: false,
    email_on_low_balance: true,
    low_balance_threshold: 50_000,
  });

  updateCompany<K extends keyof CompanyData>(field: K, value: CompanyData[K]): void {
    this.companyData.update((d) => ({ ...d, [field]: value }));
    this.companySaved.set(false);
  }

  updateLimits<K extends keyof TransferLimits>(field: K, value: TransferLimits[K]): void {
    this.limits.update((d) => ({ ...d, [field]: value }));
    this.limitsSaved.set(false);
  }

  updateNotification<K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]): void {
    this.notifications.update((d) => ({ ...d, [field]: value }));
    this.notifSaved.set(false);
  }

  saveCompany(): void {
    this.companySaved.set(true);
    setTimeout(() => this.companySaved.set(false), 3000);
  }

  saveLimits(): void {
    this.limitsSaved.set(true);
    setTimeout(() => this.limitsSaved.set(false), 3000);
  }

  saveNotifications(): void {
    this.notifSaved.set(true);
    setTimeout(() => this.notifSaved.set(false), 3000);
  }
}
