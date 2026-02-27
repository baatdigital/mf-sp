/**
 * AccountDetailCardComponent
 *
 * Tarjeta de detalle de cuenta. Reutilizable entre tiers.
 * EP-SP-013: US-SP-050
 *
 * Modes:
 *  - admin: muestra org, provider, created_by
 *  - business: muestra CLABE, saldo, cuentas hijas
 *  - personal: vista simplificada, solo info esencial
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

export type AccountType = 'CONCENTRADORA' | 'CLABE' | 'DISPERSION' | 'RESERVADA';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type CardTierMode = 'admin' | 'business' | 'personal';

export interface AccountCardData {
  id: string;
  display_name: string;
  account_type: AccountType;
  status: AccountStatus;
  clabe?: string;
  available_balance: number;
  pending_balance?: number;
  total_balance?: number;
  currency: string;
  children_count?: number;
  organization_id?: string;
  provider_account_id?: string;
  created_by?: string;
  created_at?: string;
}

const TYPE_ICONS: Record<AccountType, string> = {
  CONCENTRADORA: '🔵',
  CLABE: '🟢',
  DISPERSION: '🟠',
  RESERVADA: '⚪',
};

const TYPE_LABELS: Record<AccountType, string> = {
  CONCENTRADORA: 'Concentradora',
  CLABE: 'CLABE',
  DISPERSION: 'Dispersion',
  RESERVADA: 'Reservada',
};

const STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activa',
  FROZEN: 'Congelada',
  CLOSED: 'Cerrada',
};

const STATUS_COLORS: Record<AccountStatus, string> = {
  PENDING: '#d69e2e',
  ACTIVE: '#38a169',
  FROZEN: '#3182ce',
  CLOSED: '#718096',
};

@Component({
  selector: 'sp-account-detail-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div [class]="'sp-account-card' + (compact() ? ' sp-account-card--compact' : '')">
      <!-- Header -->
      <div class="sp-account-card__header">
        <div class="sp-account-card__type">
          <span class="sp-account-card__type-icon">{{ typeIcon() }}</span>
          <span class="sp-account-card__type-label">{{ typeLabel() }}</span>
        </div>
        <span
          class="sp-account-card__status"
          [style.background]="statusBg()"
          [style.color]="statusColor()"
        >{{ statusLabel() }}</span>
      </div>

      <!-- Nombre -->
      <h3 class="sp-account-card__name">{{ account().display_name }}</h3>

      <!-- Saldo -->
      @if (showBalance()) {
        <div class="sp-account-card__balance">
          <span class="sp-account-card__balance-value">
            {{ account().available_balance | currency:'MXN':'symbol':'1.2-2' }}
          </span>
          @if (account().pending_balance && account().pending_balance! > 0) {
            <span class="sp-account-card__balance-pending">
              +{{ account().pending_balance! | currency:'MXN':'symbol':'1.2-2' }} pendiente
            </span>
          }
        </div>
      }

      <!-- CLABE -->
      @if (account().clabe) {
        <div class="sp-account-card__clabe">
          <span class="sp-account-card__clabe-label">CLABE</span>
          <span class="sp-account-card__clabe-value">{{ account().clabe }}</span>
          <button class="sp-account-card__copy-btn" (click)="copyClabe()" title="Copiar CLABE">📋</button>
        </div>
      }

      <!-- Cuenta hijas (business/admin) -->
      @if (account().children_count && account().children_count! > 0) {
        <div class="sp-account-card__children">
          <span>{{ account().children_count }} cuenta(s) hija(s)</span>
        </div>
      }

      <!-- Info Admin -->
      @if (tier() === 'admin') {
        <div class="sp-account-card__admin-info">
          @if (account().organization_id) {
            <div class="sp-account-card__meta-row">
              <span class="sp-account-card__meta-key">Org:</span>
              <span class="sp-account-card__meta-val">{{ account().organization_id }}</span>
            </div>
          }
          @if (account().provider_account_id) {
            <div class="sp-account-card__meta-row">
              <span class="sp-account-card__meta-key">Provider ID:</span>
              <span class="sp-account-card__meta-val">{{ account().provider_account_id }}</span>
            </div>
          }
          @if (account().created_by) {
            <div class="sp-account-card__meta-row">
              <span class="sp-account-card__meta-key">Creado por:</span>
              <span class="sp-account-card__meta-val">{{ account().created_by }}</span>
            </div>
          }
        </div>
      }

      <!-- Acciones -->
      @if (showActions()) {
        <div class="sp-account-card__actions">
          @if (tier() !== 'personal') {
            <button class="sp-account-card__action-btn sp-account-card__action-btn--primary" (click)="transferClick.emit(account())">
              💸 SPEI
            </button>
            <button class="sp-account-card__action-btn" (click)="moveClick.emit(account())">
              ↔️ Mover
            </button>
          }
          <button class="sp-account-card__action-btn" (click)="detailClick.emit(account())">
            🔍 Ver
          </button>
          @if (tier() === 'admin') {
            <button class="sp-account-card__action-btn sp-account-card__action-btn--danger" (click)="freezeClick.emit(account())">
              🧊 Congelar
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .sp-account-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 16px; font-family: system-ui, sans-serif;
      transition: box-shadow 0.2s; cursor: default;
    }
    .sp-account-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .sp-account-card--compact {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
    }
    .sp-account-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .sp-account-card__type { display: flex; align-items: center; gap: 6px; }
    .sp-account-card__type-label { font-size: 12px; color: #718096; font-weight: 500; }
    .sp-account-card__status {
      display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;
    }
    .sp-account-card__name { margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #2d3748; }
    .sp-account-card__balance { margin-bottom: 8px; }
    .sp-account-card__balance-value { font-size: 22px; font-weight: 700; color: #2d3748; display: block; }
    .sp-account-card__balance-pending { font-size: 12px; color: #d69e2e; }
    .sp-account-card__clabe {
      display: flex; align-items: center; gap: 8px; background: #f7fafc;
      border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;
    }
    .sp-account-card__clabe-label { font-size: 11px; color: #718096; font-weight: 600; }
    .sp-account-card__clabe-value { font-family: monospace; font-size: 13px; color: #2d3748; flex: 1; }
    .sp-account-card__copy-btn { border: none; background: none; cursor: pointer; padding: 0; font-size: 14px; }
    .sp-account-card__children { font-size: 12px; color: #718096; margin-bottom: 8px; }
    .sp-account-card__admin-info { background: #f7fafc; border-radius: 6px; padding: 8px; margin-bottom: 10px; }
    .sp-account-card__meta-row { display: flex; gap: 8px; font-size: 12px; margin-bottom: 2px; }
    .sp-account-card__meta-key { color: #718096; min-width: 80px; }
    .sp-account-card__meta-val { color: #2d3748; font-family: monospace; }
    .sp-account-card__actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .sp-account-card__action-btn {
      padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0;
      background: white; cursor: pointer; font-size: 12px; transition: all 0.15s;
    }
    .sp-account-card__action-btn:hover { background: #f7fafc; }
    .sp-account-card__action-btn--primary { background: #3182ce; color: white; border-color: #3182ce; }
    .sp-account-card__action-btn--primary:hover { background: #2b6cb0; }
    .sp-account-card__action-btn--danger { color: #e53e3e; border-color: #fed7d7; }
    .sp-account-card__action-btn--danger:hover { background: #fff5f5; }
  `],
})
export class AccountDetailCardComponent {
  // Inputs
  account = input.required<AccountCardData>();
  tier = input<CardTierMode>('business');
  showActions = input(true);
  showBalance = input(true);
  showChildren = input(true);
  compact = input(false);

  // Outputs
  transferClick = output<AccountCardData>();
  moveClick = output<AccountCardData>();
  detailClick = output<AccountCardData>();
  freezeClick = output<AccountCardData>();

  typeIcon = () => TYPE_ICONS[this.account().account_type];
  typeLabel = () => TYPE_LABELS[this.account().account_type];
  statusLabel = () => STATUS_LABELS[this.account().status];
  statusColor = () => STATUS_COLORS[this.account().status];
  statusBg = () => STATUS_COLORS[this.account().status] + '20';

  copyClabe(): void {
    const clabe = this.account().clabe;
    if (clabe && navigator.clipboard) {
      navigator.clipboard.writeText(clabe);
    }
  }
}
