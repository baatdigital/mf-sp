/**
 * AccountDetailComponent
 *
 * Detalle de una cuenta especifica de la organizacion.
 * EP-SP-011: US-SP-040
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AccountDetailCardComponent, AccountCardData } from '../../../shared/account-detail-card/account-detail-card.component';
import { MovementsTableComponent, Movement } from '../../../shared/movements-table/movements-table.component';

@Component({
  selector: 'sp-account-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    AccountDetailCardComponent,
    MovementsTableComponent,
  ],
  template: `
    <div class="sp-business-account-detail">

      <!-- Navegacion -->
      <div class="sp-business-account-detail__nav">
        <a routerLink="/sp/business/accounts" class="sp-business-account-detail__back">
          ← Volver a Cuentas
        </a>
        <span class="sp-business-account-detail__breadcrumb">/ {{ accountData().display_name }}</span>
      </div>

      <!-- Header con acciones -->
      <div class="sp-business-account-detail__header">
        <h1 class="sp-business-account-detail__title">{{ accountData().display_name }}</h1>
        <div class="sp-business-account-detail__actions">
          <a routerLink="/sp/business/transfers/internal" class="sp-business-account-detail__btn sp-business-account-detail__btn--secondary">
            Mover fondos
          </a>
          <a routerLink="/sp/business/transfers/spei" class="sp-business-account-detail__btn sp-business-account-detail__btn--primary">
            Transferir SPEI
          </a>
        </div>
      </div>

      <!-- ID de cuenta actual (de la ruta) -->
      <p class="sp-business-account-detail__account-id">ID: {{ accountId() }}</p>

      <!-- Tarjeta de detalle -->
      <div class="sp-business-account-detail__card-wrap">
        <sp-account-detail-card
          [account]="accountData()"
          tierMode="business"
        />
      </div>

      <!-- Pestanas -->
      <div class="sp-business-account-detail__tabs">
        <button
          [class]="'sp-business-account-detail__tab' + (activeTab() === 'movements' ? ' active' : '')"
          (click)="activeTab.set('movements')">
          Movimientos ({{ movements().length }})
        </button>
        <button
          [class]="'sp-business-account-detail__tab' + (activeTab() === 'info' ? ' active' : '')"
          (click)="activeTab.set('info')">
          Informacion
        </button>
      </div>

      <!-- Tabla de movimientos -->
      @if (activeTab() === 'movements') {
        <div class="sp-business-account-detail__movements-wrap">
          <sp-movements-table
            [movements]="movements()"
            tierMode="business"
            [showFilters]="true"
            [showExport]="true"
          />
        </div>
      }

      <!-- Informacion adicional -->
      @if (activeTab() === 'info') {
        <div class="sp-business-account-detail__info-card">
          <div class="sp-business-account-detail__info-row">
            <span>CLABE</span><strong>{{ accountData().clabe ?? 'N/A' }}</strong>
          </div>
          <div class="sp-business-account-detail__info-row">
            <span>Tipo</span><strong>{{ accountData().account_type }}</strong>
          </div>
          <div class="sp-business-account-detail__info-row">
            <span>Estado</span><strong>{{ accountData().status }}</strong>
          </div>
          <div class="sp-business-account-detail__info-row">
            <span>Moneda</span><strong>{{ accountData().currency }}</strong>
          </div>
          @if (accountData().children_count !== undefined) {
            <div class="sp-business-account-detail__info-row">
              <span>Subcuentas</span><strong>{{ accountData().children_count }}</strong>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-business-account-detail { padding: 24px; max-width: 1100px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Nav */
    .sp-business-account-detail__nav { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
    .sp-business-account-detail__back { font-size: 13px; color: #3182ce; text-decoration: none; }
    .sp-business-account-detail__back:hover { text-decoration: underline; }
    .sp-business-account-detail__breadcrumb { font-size: 13px; color: #718096; }

    /* Header */
    .sp-business-account-detail__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sp-business-account-detail__title { font-size: 20px; font-weight: 700; color: #1a202c; margin: 0; }
    .sp-business-account-detail__actions { display: flex; gap: 10px; }
    .sp-business-account-detail__account-id { font-size: 11px; color: #a0aec0; font-family: monospace; margin: 0 0 20px; }

    /* Buttons */
    .sp-business-account-detail__btn {
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; text-decoration: none; border: none;
    }
    .sp-business-account-detail__btn--primary { background: #3182ce; color: white; }
    .sp-business-account-detail__btn--primary:hover { background: #2b6cb0; }
    .sp-business-account-detail__btn--secondary { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-business-account-detail__btn--secondary:hover { background: #f7fafc; }

    /* Card wrap */
    .sp-business-account-detail__card-wrap { margin-bottom: 24px; }

    /* Tabs */
    .sp-business-account-detail__tabs { display: flex; gap: 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
    .sp-business-account-detail__tab {
      padding: 10px 20px; border: none; background: none; cursor: pointer;
      font-size: 14px; font-weight: 600; color: #718096; border-bottom: 2px solid transparent; margin-bottom: -2px;
    }
    .sp-business-account-detail__tab.active { color: #3182ce; border-bottom-color: #3182ce; }

    /* Movements */
    .sp-business-account-detail__movements-wrap { }

    /* Info card */
    .sp-business-account-detail__info-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;
    }
    .sp-business-account-detail__info-row {
      display: flex; justify-content: space-between; font-size: 13px;
      padding: 8px 0; border-bottom: 1px solid #f7fafc;
    }
    .sp-business-account-detail__info-row:last-child { border-bottom: none; }
    .sp-business-account-detail__info-row span { color: #718096; }
  `],
})
export class AccountDetailComponent {
  private readonly route = inject(ActivatedRoute);

  readonly accountId = signal<string>(
    this.route.snapshot.paramMap.get('id') ?? 'acc-master-001'
  );

  readonly activeTab = signal<'movements' | 'info'>('movements');

  readonly accountData = signal<AccountCardData>({
    id: 'acc-master-001',
    display_name: 'Cuenta Maestra Principal',
    account_type: 'CONCENTRADORA',
    status: 'ACTIVE',
    clabe: '646180110400000001',
    available_balance: 3_120_500.00,
    pending_balance: 45_000.00,
    total_balance: 3_165_500.00,
    currency: 'MXN',
    children_count: 3,
    created_at: '2025-01-15T10:00:00Z',
  });

  readonly movements = signal<Movement[]>([
    { id: 'mov-001', date: '2026-02-26T14:30:00Z', type: 'CREDIT', concept: 'Cobro cliente premium', amount: 120_500.00, balance: 3_120_500.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Cliente XYZ SA de CV' },
    { id: 'mov-002', date: '2026-02-26T11:00:00Z', type: 'DEBIT', concept: 'Pago proveedor servicio', amount: 58_000.00, balance: 3_000_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Proveedor ABC' },
    { id: 'mov-003', date: '2026-02-25T16:45:00Z', type: 'DEBIT', concept: 'Nomina quincena', amount: 210_000.00, balance: 3_058_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Multiple destinatarios' },
    { id: 'mov-004', date: '2026-02-25T09:00:00Z', type: 'CREDIT', concept: 'Deposito socio', amount: 500_000.00, balance: 3_268_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Juan Garcia Soto' },
    { id: 'mov-005', date: '2026-02-24T15:20:00Z', type: 'DEBIT', concept: 'Renta oficinas', amount: 35_000.00, balance: 2_768_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Inmobiliaria Moderna' },
    { id: 'mov-006', date: '2026-02-24T10:10:00Z', type: 'CREDIT', concept: 'Cobranza mensual', amount: 280_000.00, balance: 2_803_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Distribuidor Central' },
    { id: 'mov-007', date: '2026-02-23T13:00:00Z', type: 'DEBIT', concept: 'Impuestos SAT', amount: 95_000.00, balance: 2_523_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'SAT' },
    { id: 'mov-008', date: '2026-02-23T08:30:00Z', type: 'CREDIT', concept: 'Anticipo proyecto', amount: 150_000.00, balance: 2_618_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Constructora del Valle' },
    { id: 'mov-009', date: '2026-02-22T17:00:00Z', type: 'DEBIT', concept: 'Seguro flota vehicular', amount: 42_000.00, balance: 2_468_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'GNP Seguros' },
    { id: 'mov-010', date: '2026-02-22T12:00:00Z', type: 'CREDIT', concept: 'Venta producto estrella', amount: 375_000.00, balance: 2_510_000.00, status: 'COMPLETED', currency: 'MXN', counterpart: 'Cadena Retail Norte' },
  ]);

  readonly movementCount = computed(() => this.movements().length);
}

// Re-export AccountCardData type for template usage
type AccountCardData = import('../../../shared/account-detail-card/account-detail-card.component').AccountCardData;
