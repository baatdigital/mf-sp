/**
 * CashAuctionDashboardComponent - Marketplace de liquidez B2B
 *
 * Vista principal del Cash Auction para el portal empresarial.
 * Muestra ofertas disponibles del mercado y las propias de la org.
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
import { SharedStateService } from '@shared-state';
import { CashAuctionService, CashOffer } from '../../services/cash-auction.service';

type ActiveTab = 'market' | 'my-offers';

@Component({
  selector: 'sp-cash-auction-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auction-dashboard">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Portal Empresarial</a>
        <div class="header-row">
          <div>
            <h1>Marketplace de Liquidez</h1>
            <p class="subtitle">Compra y vende disponibilidad de efectivo en puntos de pago</p>
          </div>
          <a routerLink="/sp/business/cash-auction/post" class="btn-primary">
            + Publicar Oferta
          </a>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'market'"
          (click)="setTab('market')"
        >
          Ofertas Disponibles
          @if (marketOffers().length > 0) {
            <span class="tab-badge">{{ marketOffers().length }}</span>
          }
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'my-offers'"
          (click)="setTab('my-offers')"
        >
          Mis Ofertas
          @if (myOffers().length > 0) {
            <span class="tab-badge">{{ myOffers().length }}</span>
          }
        </button>
      </div>

      <!-- Contenido de tabs -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando ofertas...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>{{ error() }}</p>
          <button type="button" (click)="loadData()" class="btn-retry">Reintentar</button>
        </div>
      } @else {

        <!-- Tab: Mercado -->
        @if (activeTab() === 'market') {
          @if (marketOffers().length === 0) {
            <div class="empty-state">
              <p>No hay ofertas disponibles en este momento.</p>
              <p class="empty-hint">Sé el primero en publicar disponibilidad de efectivo.</p>
            </div>
          } @else {
            <div class="offers-grid">
              @for (offer of marketOffers(); track offer.offer_id) {
                <div class="offer-card">
                  <div class="offer-header">
                    <span class="offer-status open">DISPONIBLE</span>
                    <span class="offer-commission">{{ offer.commission_rate }}% comisión</span>
                  </div>
                  <p class="offer-amount">
                    {{ offer.available_amount | number: '1.2-2' }} MXN
                  </p>
                  <div class="offer-limits">
                    <span>Min: {{ offer.min_amount | number: '1.0-0' }}</span>
                    <span>Max: {{ offer.max_amount | number: '1.0-0' }}</span>
                  </div>
                  <div class="offer-meta">
                    <p class="offer-point">Punto: {{ offer.point_id }}</p>
                    @if (offer.location) {
                      <p class="offer-location">{{ offer.location }}</p>
                    }
                    <p class="offer-expiry">Expira: {{ offer.expires_at | date: 'dd/MM HH:mm' }}</p>
                  </div>
                  <a
                    [routerLink]="['/sp/business/cash-auction/reserve', offer.offer_id]"
                    [queryParams]="{ posting_org_id: offer.posting_org_id }"
                    class="btn-reserve"
                  >
                    Reservar
                  </a>
                </div>
              }
            </div>
          }
        }

        <!-- Tab: Mis ofertas -->
        @if (activeTab() === 'my-offers') {
          @if (myOffers().length === 0) {
            <div class="empty-state">
              <p>No tienes ofertas publicadas.</p>
              <a routerLink="/sp/business/cash-auction/post" class="btn-outline">
                Publicar primera oferta
              </a>
            </div>
          } @else {
            <div class="my-offers-list">
              @for (offer of myOffers(); track offer.offer_id) {
                <div class="my-offer-item">
                  <div class="my-offer-info">
                    <p class="my-offer-point">{{ offer.point_id }}</p>
                    <p class="my-offer-amount">{{ offer.available_amount | number: '1.2-2' }} MXN</p>
                    <p class="my-offer-commission">{{ offer.commission_rate }}% comisión</p>
                  </div>
                  <div class="my-offer-right">
                    <span
                      class="offer-status"
                      [class.open]="offer.status === 'OPEN'"
                      [class.reserved]="offer.status === 'RESERVED'"
                      [class.completed]="offer.status === 'COMPLETED'"
                      [class.cancelled]="offer.status === 'CANCELLED'"
                    >
                      {{ offer.status }}
                    </span>
                    <p class="my-offer-expiry">{{ offer.expires_at | date: 'dd/MM HH:mm' }}</p>
                    @if (offer.status === 'OPEN') {
                      <button
                        type="button"
                        class="btn-cancel"
                        (click)="cancelOffer(offer)"
                      >
                        Cancelar
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .auction-dashboard {
      padding: 24px;
      max-width: 900px;
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
      margin-bottom: 10px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
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

    .btn-primary {
      display: inline-flex;
      align-items: center;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary:hover { background: #1d4ed8; }

    .tabs {
      display: flex;
      gap: 4px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 24px;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: color 0.15s, border-color 0.15s;
    }

    .tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
    }

    .tab-badge {
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 10px;
      padding: 1px 7px;
      font-size: 11px;
      font-weight: 700;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px;
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
      padding: 48px 24px;
      color: #94a3b8;
      font-size: 14px;
    }

    .empty-hint { font-size: 13px; color: #cbd5e1; margin-top: 4px; }

    .btn-outline {
      display: inline-block;
      margin-top: 16px;
      border: 1.5px solid #2563eb;
      color: #2563eb;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }

    /* Grid de ofertas de mercado */
    .offers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .offer-card {
      background: white;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .offer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .offer-status {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 10px;
    }

    .offer-status.open { background: #dcfce7; color: #16a34a; }
    .offer-status.reserved { background: #fef3c7; color: #d97706; }
    .offer-status.completed { background: #dbeafe; color: #1d4ed8; }
    .offer-status.cancelled { background: #f1f5f9; color: #94a3b8; }

    .offer-commission {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .offer-amount {
      font-size: 26px;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
    }

    .offer-limits {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #94a3b8;
    }

    .offer-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .offer-point, .offer-location, .offer-expiry {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }

    .offer-expiry { color: #94a3b8; }

    .btn-reserve {
      display: block;
      background: #2563eb;
      color: white;
      text-align: center;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s;
    }

    .btn-reserve:hover { background: #1d4ed8; }

    /* Lista de mis ofertas */
    .my-offers-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .my-offer-item {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }

    .my-offer-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .my-offer-point {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .my-offer-amount {
      font-size: 16px;
      font-weight: 700;
      color: #2563eb;
      margin: 0;
    }

    .my-offer-commission {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    .my-offer-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .my-offer-expiry {
      font-size: 11px;
      color: #94a3b8;
      margin: 0;
    }

    .btn-cancel {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-cancel:hover { background: #fee2e2; }
  `],
})
export class CashAuctionDashboardComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly auctionService = inject(CashAuctionService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly marketOffers = signal<CashOffer[]>([]);
  readonly myOffers = signal<CashOffer[]>([]);
  readonly activeTab = signal<ActiveTab>('market');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const orgId = this.sharedState.currentOrganizationId();

    // Cargar ofertas del mercado
    this.auctionService.listAvailableOffers().subscribe({
      next: (res) => {
        this.marketOffers.set(res.data ?? []);
        if (orgId) {
          this.loadMyOffers(orgId);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar las ofertas del mercado.');
        this.isLoading.set(false);
      },
    });
  }

  private loadMyOffers(orgId: string): void {
    this.auctionService.listMyOffers(orgId).subscribe({
      next: (res) => {
        this.myOffers.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        // Mis ofertas no es critico - mostrar vacio
        this.myOffers.set([]);
        this.isLoading.set(false);
      },
    });
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  cancelOffer(offer: CashOffer): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) return;

    this.auctionService.cancelOffer(orgId, offer.offer_id).subscribe({
      next: () => {
        // Actualizar la lista removiendo la oferta cancelada
        this.myOffers.update((offers) =>
          offers.map((o) =>
            o.offer_id === offer.offer_id ? { ...o, status: 'CANCELLED' as const } : o
          )
        );
      },
      error: () => {},
    });
  }
}
