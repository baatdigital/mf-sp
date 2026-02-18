/**
 * PersonalProfileComponent - Perfil del usuario B2C
 *
 * Muestra y permite editar datos del usuario: nombre, telefono.
 * Datos de solo lectura: email, CLABE, fecha de alta.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { SharedStateService } from '@shared-state';
import { PersonalService, UserProfile } from '../../services/personal.service';

@Component({
  selector: 'sp-personal-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="profile-page">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Mi Perfil</h1>
        <p class="subtitle">Informacion de tu cuenta</p>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      } @else if (loadError()) {
        <div class="error-state" role="alert">
          <p>&#9888; {{ loadError() }}</p>
          <button class="btn-retry" (click)="loadProfile()">Reintentar</button>
        </div>
      } @else {
        <!-- Avatar y nombre -->
        <div class="profile-header-card">
          <div class="avatar" aria-hidden="true">
            {{ initials() }}
          </div>
          <div class="profile-name-block">
            <span class="profile-full-name">{{ profile()?.name ?? 'Usuario' }}</span>
            <span class="profile-since">
              Miembro desde {{ profile()?.created_at | date:'MMMM yyyy' }}
            </span>
          </div>
          @if (!isEditMode()) {
            <button class="btn-edit" (click)="enterEditMode()">
              &#9998; Editar
            </button>
          }
        </div>

        <!-- Formulario de edicion -->
        @if (isEditMode()) {
          <form [formGroup]="editForm" (ngSubmit)="saveProfile()" class="edit-form">
            <div class="form-section">
              <h2 class="section-title">Datos personales</h2>

              <div class="form-group">
                <label class="form-label" for="name">Nombre completo</label>
                <input
                  id="name"
                  type="text"
                  formControlName="name"
                  class="form-input"
                  [class.input-error]="nameControl.invalid && nameControl.touched"
                  placeholder="Tu nombre completo"
                />
                @if (nameControl.touched && nameControl.hasError('required')) {
                  <span class="field-error">El nombre es obligatorio.</span>
                } @else if (nameControl.touched && nameControl.hasError('minlength')) {
                  <span class="field-error">El nombre debe tener al menos 2 caracteres.</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="phone">Telefono</label>
                <input
                  id="phone"
                  type="tel"
                  inputmode="numeric"
                  formControlName="phone"
                  class="form-input"
                  placeholder="10 digitos"
                  maxlength="10"
                />
              </div>
            </div>

            @if (saveError()) {
              <div class="error-banner" role="alert">
                &#9888; {{ saveError() }}
              </div>
            }

            @if (saveSuccess()) {
              <div class="success-banner" role="status">
                &#10003; Perfil actualizado correctamente.
              </div>
            }

            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="cancelEdit()">
                Cancelar
              </button>
              <button type="submit" class="btn-save" [disabled]="editForm.invalid || isSaving()">
                @if (isSaving()) {
                  <span class="spinner-sm"></span> Guardando...
                } @else {
                  Guardar cambios
                }
              </button>
            </div>
          </form>
        }

        <!-- Datos de solo lectura -->
        <div class="info-card">
          <h2 class="section-title">Informacion de cuenta</h2>

          <div class="info-list">
            <div class="info-item">
              <span class="info-label">Correo electronico</span>
              <span class="info-value">{{ profile()?.email ?? '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">CLABE interbancaria</span>
              <span class="info-value clabe-value">
                {{ formatClabe(profile()?.clabe ?? '') || '—' }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Telefono</span>
              <span class="info-value">{{ profile()?.phone ?? '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Miembro desde</span>
              <span class="info-value">
                {{ profile()?.created_at | date:'dd/MM/yyyy' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Acciones de seguridad -->
        <div class="security-card">
          <h2 class="section-title">Seguridad</h2>
          <button class="btn-security" (click)="showPinComingSoon()" aria-label="Cambiar NIP">
            <span class="security-icon">&#128274;</span>
            <div class="security-text">
              <span class="security-title">Cambiar NIP</span>
              <span class="security-subtitle">Modifica tu numero de identificacion personal</span>
            </div>
            <span class="security-arrow">&#8250;</span>
          </button>

          @if (pinToast()) {
            <div class="coming-soon-toast" role="status">
              Proximamente: cambio de NIP en la app.
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #2563eb; }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 13px;
      margin: 0;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      color: #64748b;
      gap: 12px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Error */
    .error-state {
      text-align: center;
      padding: 40px 20px;
      color: #dc2626;
      font-size: 14px;
    }

    .btn-retry {
      margin-top: 12px;
      padding: 8px 20px;
      border: 1px solid #dc2626;
      background: none;
      color: #dc2626;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    /* Profile header card */
    .profile-header-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      margin-bottom: 16px;
    }

    .avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      user-select: none;
    }

    .profile-name-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .profile-full-name {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }

    .profile-since {
      font-size: 12px;
      color: #94a3b8;
    }

    .btn-edit {
      padding: 8px 14px;
      background: #eff6ff;
      color: #2563eb;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .btn-edit:hover { background: #dbeafe; }

    /* Edit form */
    .edit-form {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section { display: flex; flex-direction: column; gap: 14px; }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #374151;
      margin: 0 0 4px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .form-input {
      padding: 11px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 15px;
      color: #111827;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus { border-color: #2563eb; }
    .form-input.input-error { border-color: #dc2626; }

    .field-error {
      font-size: 12px;
      color: #dc2626;
    }

    /* Banners */
    .error-banner {
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 14px;
    }

    .success-banner {
      padding: 12px 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      color: #16a34a;
      font-size: 14px;
    }

    /* Form actions */
    .form-actions {
      display: flex;
      gap: 12px;
    }

    .btn-cancel {
      padding: 12px 20px;
      background: white;
      color: #64748b;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-cancel:hover { background: #f8fafc; }

    .btn-save {
      flex: 1;
      padding: 12px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.15s;
    }

    .btn-save:hover:not(:disabled) { opacity: 0.88; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }

    /* Info card */
    .info-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      margin-bottom: 16px;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      gap: 12px;
    }

    .info-item:last-child { border-bottom: none; }

    .info-label {
      font-size: 13px;
      color: #6b7280;
      flex-shrink: 0;
      min-width: 130px;
    }

    .info-value {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      text-align: right;
      word-break: break-all;
    }

    .clabe-value {
      font-family: monospace;
      letter-spacing: 0.06em;
    }

    /* Security card */
    .security-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
    }

    .btn-security {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 0;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      border-top: 1px solid #f1f5f9;
    }

    .security-icon {
      font-size: 22px;
      flex-shrink: 0;
    }

    .security-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .security-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .security-subtitle {
      font-size: 12px;
      color: #94a3b8;
    }

    .security-arrow {
      font-size: 20px;
      color: #d1d5db;
    }

    .coming-soon-toast {
      margin-top: 8px;
      padding: 10px 14px;
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 8px;
      color: #854d0e;
      font-size: 13px;
    }
  `],
})
export class PersonalProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sharedState = inject(SharedStateService);
  private readonly personalService = inject(PersonalService);

  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  readonly isEditMode = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly pinToast = signal(false);

  readonly editForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
  });

  get nameControl(): AbstractControl {
    return this.editForm.controls['name'];
  }

  readonly initials = (): string => {
    const name = this.profile()?.name ?? 'U';
    return name.split(' ')
      .slice(0, 2)
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase();
  };

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.personalService.getProfile().subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback: usar datos del SharedState si el endpoint falla
        const user = this.sharedState.currentUser();
        const fallback: UserProfile = {
          user_id: user.id ?? '',
          name: user.name ?? 'Usuario',
          email: user.email ?? '',
          clabe: undefined,
          created_at: new Date().toISOString(),
        };
        this.profile.set(fallback);
        this.isLoading.set(false);
      },
    });
  }

  enterEditMode(): void {
    const p = this.profile();
    this.editForm.patchValue({
      name: p?.name ?? '',
      phone: p?.phone ?? '',
    });
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.isEditMode.set(true);
  }

  cancelEdit(): void {
    this.editForm.reset();
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.isEditMode.set(false);
  }

  saveProfile(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const body = {
      name: this.editForm.value.name,
      phone: this.editForm.value.phone || undefined,
    };

    this.personalService.updateProfile(body).subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.isEditMode.set(false);
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('No se pudo guardar el perfil. Intenta de nuevo.');
      },
    });
  }

  showPinComingSoon(): void {
    this.pinToast.set(true);
    setTimeout(() => this.pinToast.set(false), 3000);
  }

  formatClabe(clabe: string): string {
    if (!clabe || clabe.length !== 18) return clabe;
    return `${clabe.slice(0, 2)}-${clabe.slice(2, 6)}-${clabe.slice(6, 10)}-${clabe.slice(10)}`;
  }
}
