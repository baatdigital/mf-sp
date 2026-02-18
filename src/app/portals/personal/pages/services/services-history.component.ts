/**
 * ServicesHistoryComponent - Historial de pagos de servicios (Personal B2C)
 *
 * Lista de pagos realizados en formato card (mobile-first).
 * Tabs: Todos / Exitosos / Fallidos.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ServicesBillpayService, BillPayHistoryItem } from '../../services/services-billpay.service';
import { SharedStateService } from '@shared-state';

type TabFilter = 'all' | 'success' | 'failed';

function serviceEmoji(category: string): string {
  const map: Record<string, string> = {
    electricidad: '⚡', luz: '⚡',
    agua: '💧',
    gas: '🔥',
    internet: '📡', telefono: '📡',
    tv: '📺',
    recarga: '📱', telefonia: '📱',
    gobierno: '🏛️', sat: '🏛️', imss: '🏛️',
  };
  const key = (category || '').toLowerCase();
  return map[key] ?? '🧾';
}

@Component({
  selector: 'sp-services-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="history-page">
      <header class="page-header">
        <a routerLink="/sp/personal/services" class="back-link">&#8592; Mis Servicios</a>
        <div class="header-row">
          <h1>Historial de Pagos</h1>
          <button class="btn-refresh" (click)="load()" [disabled]="isLoading()">
            &#8635; Actualizar
          </button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs" role="tablist">
        <button
          role="tab"
          class="tab"
          [class.active]="activeTab() === 'all'"
          (click)="setTab('all')"
        >Todos</button>
        <button
          role="tab"
          class="tab"
          [class.active]="activeTab() === 'success'"
          (click)="setTab('success')"
        >Exitosos</button>
        <button
          role="tab"
          class="tab"
          [class.active]="activeTab() === 'failed'"
          (click)="setTab('failed')"
        >Fallidos</button>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading">Cargando historial...</div>
      }

      <!-- Error -->
      @if (!isLoading() && error()) {
        <div class="error-banner">
          {{ error() }}
          <button class="btn-retry" (click)="load()">Reintentar</button>
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && !error() && filtered().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🧾</span>
          <p>Aún no has pagado ningún servicio.</p>
          <a routerLink="/sp/personal/services/catalog" class="btn-catalog">
            Ver catálogo de servicios
          </a>
        </div>
      }

      <!-- Card list -->
      @if (!isLoading() && filtered().length > 0) {
        <div class="card-list">
          @for (item of filtered(); track item.transaction_id) {
            <div class="payment-card">
              <div class="card-main">
                <span class="service-icon">{{ emojiFor(item) }}</span>
                <div class="card-info">
                  <span class="service-name">{{ item.biller_name }}</span>
                  <span class="reference">Ref: {{ item.reference }}</span>
                  <span class="date">{{ item.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="card-right">
                  <span class="amount">${{ item.amount | number:'1.2-2' }}</span>
                  <span
                    class="status-badge"
                    [class.completed]="item.status === 'COMPLETED'"
                    [class.failed]="item.status === 'FAILED'"
                    [class.pending]="item.status === 'PENDING'"
                  >
                    {{ statusLabel(item.status) }}
                  </span>
                </div>
              </div>

              <!-- Comprobante expandible -->
              <div class="card-actions">
                <button
                  class="btn-comprobante"
                  (click)="toggleDetail(item.transaction_id)"
                >
                  {{ selectedId() === item.transaction_id ? 'Cerrar' : 'Ver comprobante' }}
                </button>
              </div>

              @if (selectedId() === item.transaction_id) {
                <div class="comprobante">
                  <div class="field-row">
                    <span class="field-label">Folio:</span>
                    <span class="field-value">{{ item.transaction_id }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Servicio:</span>
                    <span class="field-value">{{ item.biller_name }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Referencia:</span>
                    <span class="field-value">{{ item.reference }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Monto:</span>
                    <span class="field-value">${{ item.amount | number:'1.2-2' }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Estado:</span>
                    <span class="field-value">{{ statusLabel(item.status) }}</span>
                  </div>
                  <div class="field-row">
                    <span class="field-label">Fecha:</span>
                    <span class="field-value">{{ item.created_at | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .history-page {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px 16px;
    }
    .page-header { margin-bottom: 20px; }
    .back-link {
      color: #6b7280; font-size: 13px;
      text-decoration: none; display: block; margin-bottom: 8px;
    }
    .header-row {
      display: flex; align-items: center;
      justify-content: space-between;
    }
    h1 { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
    .btn-refresh {
      padding: 7px 14px; background: #f3f4f6;
      border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 13px; cursor: pointer;
    }
    .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

    .tabs {
      display: flex; gap: 8px; margin-bottom: 20px;
    }
    .tab {
      flex: 1; padding: 9px 4px; border: 1px solid #e5e7eb;
      border-radius: 8px; background: #f9fafb;
      font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer;
    }
    .tab.active {
      background: #2563eb; color: #fff; border-color: #2563eb;
    }

    .loading { text-align: center; padding: 40px; color: #6b7280; font-size: 14px; }

    .error-banner {
      background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 10px; padding: 14px 16px;
      color: #dc2626; font-size: 14px;
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 16px;
    }
    .btn-retry {
      padding: 6px 14px; background: #dc2626; color: #fff;
      border: none; border-radius: 7px; font-size: 13px; cursor: pointer;
    }

    .empty-state {
      text-align: center; padding: 48px 16px;
    }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { color: #6b7280; font-size: 15px; margin-bottom: 16px; }
    .btn-catalog {
      display: inline-block; padding: 12px 24px;
      background: #2563eb; color: #fff; border-radius: 10px;
      font-size: 15px; font-weight: 600; text-decoration: none;
    }

    .card-list { display: flex; flex-direction: column; gap: 12px; }

    .payment-card {
      background: #fff; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 16px; overflow: hidden;
    }
    .card-main {
      display: flex; align-items: flex-start; gap: 12px;
    }
    .service-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
    .card-info {
      flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;
    }
    .service-name { font-size: 15px; font-weight: 600; color: #111827; }
    .reference { font-size: 12px; color: #6b7280; }
    .date { font-size: 11px; color: #9ca3af; }
    .card-right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
    }
    .amount { font-size: 17px; font-weight: 700; color: #111827; }
    .status-badge {
      padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700;
    }
    .status-badge.completed { background: #dcfce7; color: #166534; }
    .status-badge.failed { background: #fee2e2; color: #dc2626; }
    .status-badge.pending { background: #fef3c7; color: #92400e; }

    .card-actions { margin-top: 12px; }
    .btn-comprobante {
      font-size: 13px; color: #2563eb; background: none;
      border: none; cursor: pointer; padding: 0; text-decoration: underline;
    }

    .comprobante {
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .field-row {
      display: flex; justify-content: space-between;
      padding: 4px 0; font-size: 13px;
    }
    .field-label { color: #6b7280; }
    .field-value { color: #111827; font-weight: 500; word-break: break-all; }
  `],
})
export class ServicesHistoryComponent implements OnInit {
  private readonly billpayService = inject(ServicesBillpayService);
  private readonly sharedState = inject(SharedStateService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<BillPayHistoryItem[]>([]);
  readonly activeTab = signal<TabFilter>('all');
  readonly selectedId = signal<string | null>(null);

  readonly filtered = computed(() => {
    const tab = this.activeTab();
    const all = this.items();
    if (tab === 'success') return all.filter(i => i.status === 'COMPLETED');
    if (tab === 'failed') return all.filter(i => i.status === 'FAILED');
    return all;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;
    this.isLoading.set(true);
    this.error.set(null);
    this.billpayService.getHistory(orgId).subscribe({
      next: (res) => {
        this.items.set(res?.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el historial de pagos.');
        this.isLoading.set(false);
      },
    });
  }

  setTab(tab: TabFilter): void {
    this.activeTab.set(tab);
  }

  toggleDetail(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  emojiFor(item: BillPayHistoryItem): string {
    return serviceEmoji(item.category ?? '');
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'Exitoso', FAILED: 'Fallido', PENDING: 'Pendiente',
    };
    return map[status] ?? status;
  }
}
