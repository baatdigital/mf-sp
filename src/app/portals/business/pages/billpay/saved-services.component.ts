/**
 * SavedServicesComponent - Servicios guardados para pagos rapidos (B2B)
 *
 * Grid de tarjetas de servicios favoritos guardados via BillpayServiceApi.
 * Cada tarjeta permite pago rapido (con datos precargados) o eliminar con confirmacion.
 * Formulario inline para agregar nuevos servicios guardados.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BillpayServiceApi,
  SavedBillpayService,
} from '../../services/billpay.service';
import { SharedStateService } from '@shared-state';

@Component({
  selector: 'sp-saved-services',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="saved-page">
      <header class="page-header">
        <a routerLink="/sp/business/billpay" class="back-link">&#8592; Catalogo de servicios</a>
        <div class="header-row">
          <div>
            <h1>Mis Servicios Guardados</h1>
            <p class="subtitle">Accesos rapidos para pagar tus servicios frecuentes</p>
          </div>
          <button type="button" class="btn-add" (click)="toggleAddForm()">
            @if (showAddForm()) { Cancelar } @else { + Agregar servicio }
          </button>
        </div>
      </header>

      <!-- Formulario para agregar servicio guardado -->
      @if (showAddForm()) {
        <section class="add-form-card" aria-label="Agregar servicio guardado">
          <h2 class="form-title">Agregar servicio a favoritos</h2>
          <div class="add-form-grid">
            <div class="form-group">
              <label class="form-label" for="addNickname">Nombre (apodo)</label>
              <input
                id="addNickname"
                type="text"
                [(ngModel)]="newNickname"
                placeholder="Ej. Oficina Norte"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="addServiceId">ID del servicio</label>
              <input
                id="addServiceId"
                type="text"
                [(ngModel)]="newServiceId"
                placeholder="Ej. CFE"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="addReference">Numero de referencia</label>
              <input
                id="addReference"
                type="text"
                [(ngModel)]="newReference"
                placeholder="Ej. 1234567890"
                class="form-input"
              />
            </div>
          </div>

          @if (addError()) {
            <div class="alert alert-error" role="alert">{{ addError() }}</div>
          }
          @if (addSuccess()) {
            <div class="alert alert-success" role="status">{{ addSuccess() }}</div>
          }

          <div class="form-actions">
            <button
              type="button"
              class="btn-primary"
              (click)="agregarServicio()"
              [disabled]="isAdding() || !newNickname.trim() || !newServiceId.trim() || !newReference.trim()"
            >
              @if (isAdding()) { Guardando... } @else { Guardar servicio }
            </button>
          </div>
        </section>
      }

      <!-- Estado de carga -->
      @if (isLoading()) {
        <div class="loading-state" role="status">
          <div class="spinner"></div>
          <span>Cargando servicios guardados...</span>
        </div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>{{ error() }}</p>
          <button type="button" class="btn-retry" (click)="loadSavedServices()">Reintentar</button>
        </div>
      } @else if (savedServices().length === 0) {
        <div class="empty-state">
          <p class="empty-icon">⭐</p>
          <p>Aun no tienes servicios guardados</p>
          <p class="empty-sub">
            Guarda tus servicios frecuentes desde el flujo de pago o usando el formulario de arriba
          </p>
          <a routerLink="/sp/business/billpay" class="btn-catalog-link">
            Ir al catalogo de servicios
          </a>
        </div>
      } @else {
        <!-- Grid de tarjetas -->
        <div class="saved-grid" role="list">
          @for (svc of savedServices(); track svc.saved_id) {
            <div class="saved-card" role="listitem">
              <div class="card-top">
                <span class="service-emoji">{{ getServiceEmoji(svc.service_id) }}</span>
                <div class="card-info">
                  <strong class="card-nickname">{{ svc.nickname }}</strong>
                  <span class="card-service-name">{{ svc.service_name }}</span>
                </div>
              </div>

              <div class="card-details">
                <div class="detail-item">
                  <span class="detail-label">Referencia</span>
                  <span class="detail-value mono">{{ svc.reference }}</span>
                </div>
                @if (svc.last_amount) {
                  <div class="detail-item">
                    <span class="detail-label">Ultimo pago</span>
                    <span class="detail-value">
                      {{ svc.last_amount | currency:'MXN':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
                @if (svc.last_paid_at) {
                  <div class="detail-item">
                    <span class="detail-label">Fecha</span>
                    <span class="detail-value">{{ svc.last_paid_at | date:'dd/MM/yyyy' }}</span>
                  </div>
                }
              </div>

              <div class="card-actions">
                <button
                  type="button"
                  class="btn-pago-rapido"
                  (click)="pagarRapido(svc)"
                  aria-label="Pagar rapido {{ svc.nickname }}"
                >
                  Pagar rapido &#8594;
                </button>
                @if (confirmDeleteId() === svc.saved_id) {
                  <div class="confirm-delete">
                    <span class="confirm-msg">&#191;Eliminar?</span>
                    <button
                      type="button"
                      class="btn-confirm-yes"
                      (click)="eliminarServicio(svc.saved_id)"
                      [disabled]="isDeleting()"
                    >
                      Si
                    </button>
                    <button
                      type="button"
                      class="btn-confirm-no"
                      (click)="cancelarEliminar()"
                    >
                      No
                    </button>
                  </div>
                } @else {
                  <button
                    type="button"
                    class="btn-delete"
                    (click)="iniciarEliminar(svc.saved_id)"
                    aria-label="Eliminar {{ svc.nickname }}"
                  >
                    Eliminar
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .saved-page {
      padding: 24px;
      max-width: 960px;
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

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
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

    .btn-add {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn-add:hover { background: #1d4ed8; }

    /* Formulario agregar */
    .add-form-card {
      background: #f0f9ff;
      border: 1.5px solid #bae6fd;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .form-title {
      font-size: 15px;
      font-weight: 600;
      color: #0369a1;
      margin: 0 0 16px;
    }

    .add-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
    }

    .form-group { display: flex; flex-direction: column; gap: 4px; }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }

    .form-input {
      padding: 9px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #1e293b;
      background: white;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus { border-color: #2563eb; }

    .form-actions { margin-top: 16px; }

    .btn-primary {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Alertas */
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 12px;
    }

    .alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
    .alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; }

    /* Loading / Error / Empty */
    .loading-state {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
      padding: 48px;
      color: #64748b;
      font-size: 14px;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state {
      text-align: center;
      padding: 40px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 12px;
    }

    .btn-retry {
      margin-top: 12px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
    }

    .empty-state {
      text-align: center;
      padding: 56px 24px;
      color: #94a3b8;
    }

    .empty-icon { font-size: 40px; margin: 0 0 10px; }

    .empty-sub {
      font-size: 13px;
      max-width: 360px;
      margin: 6px auto 20px;
      line-height: 1.5;
    }

    .btn-catalog-link {
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.15s;
    }

    .btn-catalog-link:hover { background: #1d4ed8; }

    /* Grid de tarjetas */
    .saved-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .saved-card {
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: box-shadow 0.15s;
    }

    .saved-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .service-emoji {
      font-size: 28px;
      width: 44px;
      height: 44px;
      background: #f1f5f9;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .card-nickname {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
    }

    .card-service-name {
      font-size: 12px;
      color: #64748b;
    }

    .card-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .detail-label { color: #94a3b8; }
    .detail-value { color: #374151; font-weight: 500; }
    .mono { font-family: 'Courier New', monospace; font-size: 11px; }

    .card-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .btn-pago-rapido {
      flex: 1;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: background 0.15s;
    }

    .btn-pago-rapido:hover { background: #1d4ed8; }

    .btn-delete {
      background: none;
      border: 1.5px solid #fee2e2;
      color: #dc2626;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-delete:hover { background: #fef2f2; }

    .confirm-delete {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .confirm-msg {
      font-size: 12px;
      color: #b91c1c;
      font-weight: 600;
    }

    .btn-confirm-yes {
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-confirm-yes:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-confirm-no {
      background: #f1f5f9;
      color: #374151;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    @media (max-width: 480px) {
      .saved-page { padding: 16px; }
      .saved-grid { grid-template-columns: 1fr; }
      .add-form-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class SavedServicesComponent implements OnInit {
  private readonly billpayService = inject(BillpayServiceApi);
  private readonly sharedState = inject(SharedStateService);
  private readonly router = inject(Router);

  // Estado principal
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly savedServices = signal<SavedBillpayService[]>([]);
  readonly confirmDeleteId = signal<string | null>(null);
  readonly isDeleting = signal(false);
  readonly showAddForm = signal(false);
  readonly isAdding = signal(false);
  readonly addError = signal<string | null>(null);
  readonly addSuccess = signal<string | null>(null);

  // Campos del formulario agregar
  newNickname = '';
  newServiceId = '';
  newReference = '';

  // Mapa de emojis por ID de servicio
  private readonly emojiMap: Record<string, string> = {
    CFE: '⚡',
    CONAGUA: '💧',
    SACMEX: '💧',
    GAS_LP: '🔥',
    GAS_NATURAL: '🔥',
    TELMEX: '📡',
    TOTALPLAY: '📡',
    MEGACABLE: '📡',
    SKY: '📺',
    IZZI: '📺',
    DISH: '📺',
    TELCEL: '📱',
    ATT: '📱',
    MOVISTAR: '📱',
    SAT: '🏛️',
    IMSS: '🏛️',
    INFONAVIT: '🏛️',
  };

  ngOnInit(): void {
    this.loadSavedServices();
  }

  loadSavedServices(): void {
    const orgId = this.sharedState.currentOrganizationId();
    this.isLoading.set(true);
    this.error.set(null);

    this.billpayService.getSavedServices(orgId).subscribe({
      next: (res) => {
        this.savedServices.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los servicios guardados.');
        this.isLoading.set(false);
      },
    });
  }

  /** Navega al flujo de pago con datos precargados */
  pagarRapido(svc: SavedBillpayService): void {
    this.router.navigate(['/sp/business/billpay/pay'], {
      queryParams: {
        service_id: svc.service_id,
        service_name: svc.service_name,
        reference: svc.reference,
      },
    });
  }

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
    this.addError.set(null);
    this.addSuccess.set(null);
    this.resetAddForm();
  }

  /** Guarda un nuevo servicio favorito */
  agregarServicio(): void {
    if (!this.newNickname.trim() || !this.newServiceId.trim() || !this.newReference.trim()) {
      return;
    }
    const orgId = this.sharedState.currentOrganizationId();
    this.isAdding.set(true);
    this.addError.set(null);

    const data = {
      service_id: this.newServiceId.trim().toUpperCase(),
      service_name: this.newServiceId.trim().toUpperCase(),
      reference: this.newReference.trim(),
      nickname: this.newNickname.trim(),
    };

    this.billpayService.saveService(orgId, data).subscribe({
      next: (res) => {
        this.savedServices.update((list) => [...list, res.data]);
        this.addSuccess.set('Servicio guardado correctamente.');
        this.resetAddForm();
        this.isAdding.set(false);
      },
      error: () => {
        this.addError.set('No se pudo guardar el servicio. Intenta de nuevo.');
        this.isAdding.set(false);
      },
    });
  }

  iniciarEliminar(savedId: string): void {
    this.confirmDeleteId.set(savedId);
  }

  cancelarEliminar(): void {
    this.confirmDeleteId.set(null);
  }

  eliminarServicio(savedId: string): void {
    const orgId = this.sharedState.currentOrganizationId();
    this.isDeleting.set(true);

    this.billpayService.deleteSavedService(orgId, savedId).subscribe({
      next: () => {
        this.savedServices.update((list) => list.filter((s) => s.saved_id !== savedId));
        this.confirmDeleteId.set(null);
        this.isDeleting.set(false);
      },
      error: () => {
        this.confirmDeleteId.set(null);
        this.isDeleting.set(false);
      },
    });
  }

  getServiceEmoji(serviceId: string): string {
    return this.emojiMap[serviceId] ?? '🔧';
  }

  private resetAddForm(): void {
    this.newNickname = '';
    this.newServiceId = '';
    this.newReference = '';
  }
}
