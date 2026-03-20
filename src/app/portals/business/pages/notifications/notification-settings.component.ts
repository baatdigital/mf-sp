/**
 * NotificationSettingsComponent - Configuracion de webhooks y preferencias (Business Tier 2)
 *
 * Permite a organizaciones B2B configurar sus endpoints de webhook, el token secreto,
 * los tipos de eventos suscritos y los canales de notificacion (Email, Push, In-App).
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  NotificationsConfigService,
  WebhookEventType,
} from '../../../notifications/notifications-config.service';
import { SharedStateService } from '@shared-state';

interface EventTypeOption {
  key: WebhookEventType;
  label: string;
}

@Component({
  selector: 'sp-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Portal Empresarial</a>
        <h1>Configurar Notificaciones</h1>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando configuracion...</div>
      } @else {
        <!-- Seccion Webhook -->
        <section class="settings-card">
          <h2 class="section-title">Webhook Endpoint</h2>
          <p class="section-desc">
            Configura la URL a la que enviaremos eventos en tiempo real sobre tus transacciones.
          </p>

          <div class="form-group">
            <label class="form-label" for="webhookUrl">URL del Webhook</label>
            <input
              id="webhookUrl"
              type="url"
              class="form-input"
              [class.input-error]="webhookUrlError()"
              [(ngModel)]="webhookUrl"
              (ngModelChange)="validateWebhookUrl()"
              placeholder="https://mi-servidor.com/webhook"
            />
            @if (webhookUrlError()) {
              <span class="field-error">La URL debe comenzar con https://</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="secretToken">Token Secreto</label>
            <div class="input-row">
              <input
                id="secretToken"
                [type]="showToken() ? 'text' : 'password'"
                class="form-input"
                [(ngModel)]="secretToken"
                placeholder="Token para verificar firmas"
              />
              <button
                type="button"
                class="toggle-btn"
                (click)="toggleTokenVisibility()"
                [attr.aria-label]="showToken() ? 'Ocultar token' : 'Mostrar token'"
              >
                {{ showToken() ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <p class="form-label">Eventos a suscribir</p>
            <div class="checkbox-list">
              @for (evt of eventTypeOptions; track evt.key) {
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    [checked]="isEventSelected(evt.key)"
                    (change)="toggleEvent(evt.key)"
                  />
                  <span>{{ evt.label }}</span>
                </label>
              }
            </div>
          </div>

          <div class="action-row">
            <button
              class="btn-primary"
              [disabled]="isSaving() || webhookUrlError()"
              (click)="testAndSaveWebhook()"
            >
              @if (isSaving()) {
                <span>Guardando...</span>
              } @else {
                <span>Probar y Guardar Webhook</span>
              }
            </button>

            @if (webhookSuccess()) {
              <span class="success-msg">Webhook guardado correctamente.</span>
            }
            @if (webhookError()) {
              <span class="error-msg">{{ webhookError() }}</span>
            }
          </div>
        </section>

        <!-- Seccion Canales -->
        <section class="settings-card">
          <h2 class="section-title">Canales de Notificacion</h2>
          <p class="section-desc">
            Activa o desactiva los canales por los que recibes alertas de operaciones.
          </p>

          <div class="toggles-list">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-name">Email</span>
                <span class="toggle-desc">Recibir notificaciones por correo electronico</span>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="emailEnabled" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-name">Push</span>
                <span class="toggle-desc">Notificaciones push en el navegador</span>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="pushEnabled" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-name">In-App</span>
                <span class="toggle-desc">Alertas dentro de la plataforma</span>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="inAppEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="action-row">
            <button
              class="btn-primary"
              [disabled]="isChannelSaving()"
              (click)="saveChannels()"
            >
              @if (isChannelSaving()) {
                <span>Guardando...</span>
              } @else {
                <span>Guardar Canales</span>
              }
            </button>

            @if (channelSuccess()) {
              <span class="success-msg">Canales actualizados correctamente.</span>
            }
            @if (channelError()) {
              <span class="error-msg">{{ channelError() }}</span>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 24px;
      max-width: 720px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
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
      margin: 0;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 6px;
    }

    .section-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 20px;
    }

    .form-group {
      margin-bottom: 18px;
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      color: #1e293b;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus {
      border-color: #6366f1;
    }

    .form-input.input-error {
      border-color: #ef4444;
    }

    .field-error {
      font-size: 12px;
      color: #dc2626;
      margin-top: 4px;
      display: block;
    }

    .input-row {
      display: flex;
      gap: 8px;
    }

    .input-row .form-input {
      flex: 1;
    }

    .toggle-btn {
      padding: 9px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      font-size: 13px;
      font-weight: 500;
      color: #1e293b;
      cursor: pointer;
      white-space: nowrap;
    }

    .toggle-btn:hover {
      background: #f8fafc;
    }

    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #1e293b;
      cursor: pointer;
    }

    .checkbox-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .action-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .btn-primary {
      padding: 10px 20px;
      border-radius: 8px;
      background: #1e293b;
      color: white;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #334155;
    }

    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .success-msg {
      font-size: 13px;
      color: #16a34a;
      font-weight: 500;
    }

    .error-msg {
      font-size: 13px;
      color: #dc2626;
      font-weight: 500;
    }

    /* Toggles */
    .toggles-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .toggle-row:last-child {
      border-bottom: none;
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-name {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .toggle-desc {
      font-size: 12px;
      color: #64748b;
    }

    /* Switch toggle */
    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      border-radius: 22px;
      transition: background 0.2s;
    }

    .slider::before {
      content: '';
      position: absolute;
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .switch input:checked + .slider {
      background-color: #22c55e;
    }

    .switch input:checked + .slider::before {
      transform: translateX(18px);
    }
  `],
})
export class NotificationSettingsComponent implements OnInit, OnDestroy {
  private readonly notifService = inject(NotificationsConfigService);
  private readonly sharedState = inject(SharedStateService);
  private readonly destroy$ = new Subject<void>();

  readonly eventTypeOptions: EventTypeOption[] = [
    { key: 'SPEI_RECEIVED', label: 'SPEI Recibido' },
    { key: 'SPEI_SENT',     label: 'SPEI Enviado' },
    { key: 'BILLPAY_PAID',  label: 'Pago de Servicio' },
    { key: 'CASH_IN',       label: 'Deposito en Efectivo' },
    { key: 'CASH_OUT',      label: 'Retiro en Efectivo' },
  ];

  readonly isLoading      = signal(true);
  readonly isSaving       = signal(false);
  readonly isChannelSaving= signal(false);
  readonly webhookSuccess = signal(false);
  readonly webhookError   = signal<string | null>(null);
  readonly channelSuccess = signal(false);
  readonly channelError   = signal<string | null>(null);
  readonly webhookUrlError= signal(false);
  readonly showToken      = signal(false);

  webhookUrl   = '';
  secretToken  = '';
  emailEnabled = true;
  pushEnabled  = true;
  inAppEnabled = true;
  selectedEvents: Set<WebhookEventType> = new Set();

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  validateWebhookUrl(): void {
    this.webhookUrlError.set(
      this.webhookUrl.length > 0 && !this.webhookUrl.startsWith('https://')
    );
  }

  toggleTokenVisibility(): void {
    this.showToken.update((v) => !v);
  }

  isEventSelected(evt: WebhookEventType): boolean {
    return this.selectedEvents.has(evt);
  }

  toggleEvent(evt: WebhookEventType): void {
    const next = new Set(this.selectedEvents);
    if (next.has(evt)) {
      next.delete(evt);
    } else {
      next.add(evt);
    }
    this.selectedEvents = next;
  }

  testAndSaveWebhook(): void {
    this.validateWebhookUrl();
    if (this.webhookUrlError()) return;

    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;
    this.isSaving.set(true);
    this.webhookSuccess.set(false);
    this.webhookError.set(null);

    this.notifService
      .saveWebhookConfig(orgId, {
        webhook_url:  this.webhookUrl,
        secret_token: this.secretToken,
        event_types:  Array.from(this.selectedEvents),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.webhookSuccess.set(true);
        },
        error: () => {
          this.isSaving.set(false);
          this.webhookError.set('Error al guardar el webhook. Intenta de nuevo.');
        },
      });
  }

  saveChannels(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;
    this.isChannelSaving.set(true);
    this.channelSuccess.set(false);
    this.channelError.set(null);

    this.notifService
      .updateNotificationConfig(orgId, {
        email_enabled:  this.emailEnabled,
        push_enabled:   this.pushEnabled,
        in_app_enabled: this.inAppEnabled,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isChannelSaving.set(false);
          this.channelSuccess.set(true);
        },
        error: () => {
          this.isChannelSaving.set(false);
          this.channelError.set('Error al guardar los canales. Intenta de nuevo.');
        },
      });
  }

  private loadConfig(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;

    this.notifService
      .getWebhookConfig(orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.webhookUrl  = res.data.webhook_url ?? '';
          this.secretToken = res.data.secret_token ?? '';
          this.selectedEvents = new Set(res.data.event_types ?? []);
        },
        error: () => { /* Si no existe config, se deja en blanco */ },
      });

    this.notifService
      .getNotificationConfig(orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.emailEnabled = res.data.email_enabled;
          this.pushEnabled  = res.data.push_enabled;
          this.inAppEnabled = res.data.in_app_enabled;
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }
}
