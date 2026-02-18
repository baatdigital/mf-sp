/**
 * NotificationPreferencesComponent - Preferencias de notificacion personal (Personal Tier 3)
 *
 * Permite a usuarios B2C configurar individualmente sus preferencias de notificacion
 * por categoria (transferencias, pagos, efectivo, alertas) y canal (email, push, in-app).
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
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  NotificationsConfigService,
  NotificationCategoryPrefs,
} from '../../../notifications/notifications-config.service';
import { SharedStateService } from '@shared-state';

interface NotificationCategory {
  key: string;
  label: string;
  prefs: NotificationCategoryPrefs;
}

const DEFAULT_PREFS: NotificationCategoryPrefs = {
  email: true,
  push: true,
  in_app: true,
};

@Component({
  selector: 'sp-notification-preferences',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prefs-page">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Mis Notificaciones</h1>
        <p class="page-desc">
          Controla como y cuando quieres recibir alertas sobre tus operaciones.
        </p>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando preferencias...</div>
      } @else {
        <!-- Header de columnas -->
        <div class="prefs-header">
          <span class="prefs-header-label">Tipo de notificacion</span>
          <div class="channels-header">
            <span class="channel-col">Email</span>
            <span class="channel-col">Push</span>
            <span class="channel-col">In-App</span>
          </div>
        </div>

        <!-- Categorias -->
        <div class="prefs-list">
          @for (cat of categories(); track cat.key) {
            <div class="prefs-card">
              <span class="category-label">{{ cat.label }}</span>
              <div class="channel-toggles">
                <!-- Email -->
                <label class="switch" [attr.aria-label]="'Email para ' + cat.label">
                  <input
                    type="checkbox"
                    [checked]="cat.prefs.email"
                    (change)="togglePref(cat.key, 'email')"
                  />
                  <span class="slider"></span>
                </label>
                <!-- Push -->
                <label class="switch" [attr.aria-label]="'Push para ' + cat.label">
                  <input
                    type="checkbox"
                    [checked]="cat.prefs.push"
                    (change)="togglePref(cat.key, 'push')"
                  />
                  <span class="slider"></span>
                </label>
                <!-- In-App -->
                <label class="switch" [attr.aria-label]="'In-App para ' + cat.label">
                  <input
                    type="checkbox"
                    [checked]="cat.prefs.in_app"
                    (change)="togglePref(cat.key, 'in_app')"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          }
        </div>

        <!-- Accion guardar -->
        <div class="save-row">
          <button
            class="btn-save"
            [disabled]="isSaving()"
            (click)="savePreferences()"
          >
            @if (isSaving()) {
              <span>Guardando...</span>
            } @else {
              <span>Guardar preferencias</span>
            }
          </button>
        </div>

        <!-- Toast de exito -->
        @if (showToast()) {
          <div class="toast toast-success">
            Guardado exitoso
          </div>
        }

        @if (saveError()) {
          <div class="toast toast-error">
            {{ saveError() }}
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .prefs-page {
      padding: 24px;
      max-width: 680px;
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
      margin: 0 0 6px;
    }

    .page-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    /* Column headers */
    .prefs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px 12px;
    }

    .prefs-header-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .channels-header {
      display: flex;
      gap: 0;
    }

    .channel-col {
      width: 64px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Category cards */
    .prefs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }

    .prefs-card {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .category-label {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .channel-toggles {
      display: flex;
      gap: 0;
    }

    .channel-toggles .switch {
      width: 64px;
      display: flex;
      justify-content: center;
    }

    /* Save button */
    .save-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }

    .btn-save {
      padding: 10px 24px;
      border-radius: 8px;
      background: #1e293b;
      color: white;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-save:hover:not(:disabled) {
      background: #334155;
    }

    .btn-save:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.25s ease;
      z-index: 1000;
    }

    .toast-success {
      background: #22c55e;
      color: white;
    }

    .toast-error {
      background: #ef4444;
      color: white;
    }

    @keyframes slideIn {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    /* Toggle switch */
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
export class NotificationPreferencesComponent implements OnInit, OnDestroy {
  private readonly notifService = inject(NotificationsConfigService);
  private readonly sharedState = inject(SharedStateService);
  private readonly destroy$ = new Subject<void>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading  = signal(true);
  readonly isSaving   = signal(false);
  readonly showToast  = signal(false);
  readonly saveError  = signal<string | null>(null);
  readonly categories = signal<NotificationCategory[]>([
    { key: 'transfers_received', label: 'Transferencias recibidas',  prefs: { ...DEFAULT_PREFS } },
    { key: 'transfers_sent',     label: 'Transferencias enviadas',   prefs: { ...DEFAULT_PREFS } },
    { key: 'bill_payments',      label: 'Pagos de servicios',        prefs: { ...DEFAULT_PREFS } },
    { key: 'cash_deposits',      label: 'Depositos en efectivo',     prefs: { ...DEFAULT_PREFS } },
    { key: 'security_alerts',    label: 'Alertas de seguridad',      prefs: { ...DEFAULT_PREFS } },
  ]);

  ngOnInit(): void {
    this.loadPreferences();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePref(categoryKey: string, channel: keyof NotificationCategoryPrefs): void {
    this.categories.update((cats) =>
      cats.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        return {
          ...cat,
          prefs: { ...cat.prefs, [channel]: !cat.prefs[channel] },
        };
      })
    );
  }

  savePreferences(): void {
    const orgId = this.sharedState.currentOrganizationId();
    this.isSaving.set(true);
    this.saveError.set(null);

    const preferenceMap = this.categories().reduce<Record<string, NotificationCategoryPrefs>>(
      (acc, cat) => {
        acc[cat.key] = cat.prefs;
        return acc;
      },
      {}
    );

    this.notifService
      .updateNotificationConfig(orgId, { preferences: preferenceMap })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.displayToast();
        },
        error: () => {
          this.isSaving.set(false);
          this.saveError.set('No se pudo guardar. Intenta de nuevo.');
        },
      });
  }

  private loadPreferences(): void {
    const orgId = this.sharedState.currentOrganizationId();

    this.notifService
      .getNotificationConfig(orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const prefs = res.data.preferences ?? {};
          this.categories.update((cats) =>
            cats.map((cat) => ({
              ...cat,
              prefs: prefs[cat.key] ? { ...prefs[cat.key] } : { ...DEFAULT_PREFS },
            }))
          );
          this.isLoading.set(false);
        },
        error: () => {
          // Si no hay config previa, se muestran los defaults
          this.isLoading.set(false);
        },
      });
  }

  private displayToast(): void {
    this.showToast.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.showToast.set(false), 3000);
  }
}
