/**
 * ServicesHomeComponent - Pantalla principal de "Mis Servicios" (Personal / B2C)
 *
 * Muestra servicios guardados para pago rapido, un CTA para el catalogo
 * y los 3 pagos mas recientes del historial.
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
  ServicesBillpayService,
  SavedService,
  BillPayHistoryItem,
} from '../../services/services-billpay.service';

@Component({
  selector: 'sp-services-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="services-page">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Mis Servicios</h1>
        <p class="subtitle">Paga tus recibos de forma rapida y segura</p>
      </header>

      <!-- Servicios guardados -->
      <section class="section">
        <h2 class="section-title">Servicios guardados</h2>

        @if (savedServices().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>Aun no tienes servicios guardados.</p>
            <p class="empty-hint">Guarda tus servicios para pagar mas rapido la proxima vez.</p>
          </div>
        } @else {
          <div class="saved-list">
            @for (svc of savedServices(); track svc.service_id + svc.reference) {
              <div class="saved-card">
                <span class="saved-icon">{{ svc.emoji }}</span>
                <div class="saved-info">
                  <span class="saved-name">{{ svc.nickname || svc.name }}</span>
                  <span class="saved-ref">Ref: {{ svc.reference }}</span>
                </div>
                <a
                  class="btn-pay"
                  [routerLink]="['/sp/personal/services/pay']"
                  [queryParams]="{ service_id: svc.service_id, reference: svc.reference, name: svc.name, emoji: svc.emoji }"
                >
                  Pagar
                </a>
              </div>
            }
          </div>
        }
      </section>

      <!-- CTA nuevo pago -->
      <section class="section">
        <a routerLink="/sp/personal/services/catalog" class="btn-new-service">
          <span>&#43;</span> Pagar un nuevo servicio
        </a>
      </section>

      <!-- Pagos recientes -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Pagos recientes</h2>
          <a routerLink="/sp/personal/services/history" class="see-all-link">Ver todos</a>
        </div>

        @if (isLoadingHistory()) {
          <div class="loading-row">
            <div class="spinner-sm"></div>
            <span>Cargando...</span>
          </div>
        } @else if (recentPayments().length === 0) {
          <div class="empty-state empty-state--sm">
            <span class="empty-icon">🧾</span>
            <p>Aun no has pagado ningun servicio.</p>
          </div>
        } @else {
          <div class="history-list">
            @for (item of recentPayments(); track item.transaction_id) {
              <div class="history-card">
                <span class="history-icon">{{ item.service_emoji }}</span>
                <div class="history-info">
                  <span class="history-name">{{ item.service_name }}</span>
                  <span class="history-date">{{ item.created_at | date: 'dd/MM/yyyy' }}</span>
                </div>
                <div class="history-right">
                  <span class="history-amount">\${{ item.amount | number: '1.2-2' }}</span>
                  <span
                    class="status-badge"
                    [class.status-success]="item.status === 'COMPLETED'"
                    [class.status-failed]="item.status === 'FAILED'"
                    [class.status-pending]="item.status === 'PENDING'"
                  >
                    {{ statusLabel(item.status) }}
                  </span>
                </div>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .services-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 28px; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #2563eb; }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle { color: #64748b; font-size: 14px; margin: 0; }

    .section { margin-bottom: 28px; }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 12px;
    }

    .section-header .section-title { margin: 0; }

    .see-all-link {
      font-size: 13px;
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }

    .see-all-link:hover { text-decoration: underline; }

    /* Empty state */
    .empty-state {
      background: #f8fafc;
      border-radius: 12px;
      padding: 32px 20px;
      text-align: center;
      color: #64748b;
    }

    .empty-state--sm { padding: 20px; }

    .empty-icon { font-size: 36px; display: block; margin-bottom: 8px; }

    .empty-state p { margin: 0 0 4px; font-size: 14px; }
    .empty-hint { font-size: 12px; color: #94a3b8; }

    /* Saved cards */
    .saved-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .saved-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .saved-icon { font-size: 28px; flex-shrink: 0; }

    .saved-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .saved-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }

    .saved-ref {
      font-size: 12px;
      color: #94a3b8;
    }

    .btn-pay {
      padding: 10px 18px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      flex-shrink: 0;
      min-height: 44px;
      display: flex;
      align-items: center;
      transition: opacity 0.15s;
    }

    .btn-pay:hover { opacity: 0.88; }

    /* CTA nuevo pago */
    .btn-new-service {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px;
      background: #eff6ff;
      color: #2563eb;
      border: 2px dashed #93c5fd;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      min-height: 56px;
      transition: background 0.15s;
    }

    .btn-new-service:hover { background: #dbeafe; }

    /* Loading row */
    .loading-row {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #94a3b8;
      font-size: 14px;
      padding: 16px 0;
    }

    .spinner-sm {
      width: 18px;
      height: 18px;
      border: 2px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* History list */
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .history-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }

    .history-icon { font-size: 26px; flex-shrink: 0; }

    .history-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .history-name { font-size: 14px; font-weight: 600; color: #1e293b; }
    .history-date { font-size: 11px; color: #94a3b8; }

    .history-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .history-amount {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }

    /* Status badges */
    .status-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }

    .status-success { background: #dcfce7; color: #15803d; }
    .status-failed  { background: #fee2e2; color: #b91c1c; }
    .status-pending { background: #fef9c3; color: #a16207; }
  `],
})
export class ServicesHomeComponent implements OnInit {
  private readonly billpayService = inject(ServicesBillpayService);

  readonly savedServices = signal<SavedService[]>([]);
  readonly recentPayments = signal<BillPayHistoryItem[]>([]);
  readonly isLoadingHistory = signal(true);

  ngOnInit(): void {
    this.savedServices.set(this.billpayService.getSavedServices());
    this.loadRecentHistory();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      COMPLETED: 'Exitoso',
      FAILED: 'Fallido',
      PENDING: 'Pendiente',
    };
    return labels[status] ?? status;
  }

  private loadRecentHistory(): void {
    this.isLoadingHistory.set(true);
    this.billpayService.getHistory().subscribe({
      next: (response) => {
        const last3 = (response.data ?? []).slice(0, 3);
        this.recentPayments.set(last3);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.recentPayments.set([]);
        this.isLoadingHistory.set(false);
      },
    });
  }
}
