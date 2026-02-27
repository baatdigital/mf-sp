/**
 * CashConfigPageComponent
 *
 * Modulo de configuracion de Cash In/Out, Subasta y Config IA.
 * Permite al administrador ajustar los limites operativos,
 * parametros de subasta y umbrales de deteccion de fraude por IA.
 * EP-SP-020
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ActiveTab = 'cash' | 'auction' | 'ia';

interface CashConfig {
  max_cash_in: number;
  max_cash_out: number;
  require_id_verification: boolean;
  auto_approve_below: number;
}

interface AuctionConfig {
  max_auction_amount: number;
  min_auction_amount: number;
  commission_pct: number;
  auction_duration_hours: number;
  auto_match: boolean;
}

interface IaConfig {
  ia_scoring_enabled: boolean;
  fraud_threshold: number;
  auto_block_score: number;
  notify_email: string;
}

@Component({
  selector: 'sp-admin-cash-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sp-admin-cash-config">

      <!-- Header -->
      <div class="sp-admin-cash-config__header">
        <div>
          <h1 class="sp-admin-cash-config__title">Configuracion Operativa</h1>
          <p class="sp-admin-cash-config__subtitle">
            Parametros de Cash, Subasta e Inteligencia Artificial
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="sp-admin-cash-config__tabs">
        <button
          class="sp-admin-cash-config__tab"
          [class.sp-admin-cash-config__tab--active]="activeTab() === 'cash'"
          (click)="setTab('cash')">
          💵 Cash In/Out
        </button>
        <button
          class="sp-admin-cash-config__tab"
          [class.sp-admin-cash-config__tab--active]="activeTab() === 'auction'"
          (click)="setTab('auction')">
          🔨 Subasta
        </button>
        <button
          class="sp-admin-cash-config__tab"
          [class.sp-admin-cash-config__tab--active]="activeTab() === 'ia'"
          (click)="setTab('ia')">
          🤖 Config IA
        </button>
      </div>

      <!-- Tab: Cash In/Out -->
      @if (activeTab() === 'cash') {
        <div class="sp-admin-cash-config__panel">
          <div class="sp-admin-cash-config__panel-header">
            <h2 class="sp-admin-cash-config__panel-title">Limites de Cash In / Cash Out</h2>
            <p class="sp-admin-cash-config__panel-desc">
              Controla los montos maximos y el flujo de verificacion de identidad
            </p>
          </div>
          <div class="sp-admin-cash-config__form">

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Maximo Cash In (MXN)</label>
              <p class="sp-admin-cash-config__hint">Monto maximo permitido por deposito en efectivo</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="cashConfig().max_cash_in"
                (ngModelChange)="updateCashField('max_cash_in', $event)"
                min="0"
                step="1000" />
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Maximo Cash Out (MXN)</label>
              <p class="sp-admin-cash-config__hint">Monto maximo permitido por retiro en efectivo</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="cashConfig().max_cash_out"
                (ngModelChange)="updateCashField('max_cash_out', $event)"
                min="0"
                step="1000" />
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Auto-aprobar por debajo de (MXN)</label>
              <p class="sp-admin-cash-config__hint">Transacciones por debajo de este monto se aprueban automaticamente</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="cashConfig().auto_approve_below"
                (ngModelChange)="updateCashField('auto_approve_below', $event)"
                min="0"
                step="500" />
            </div>

            <div class="sp-admin-cash-config__field sp-admin-cash-config__field--toggle">
              <div>
                <label class="sp-admin-cash-config__label">Verificacion de identidad obligatoria</label>
                <p class="sp-admin-cash-config__hint">Solicitar documento de identidad para todas las operaciones</p>
              </div>
              <button
                class="sp-admin-cash-config__toggle"
                [class.sp-admin-cash-config__toggle--on]="cashConfig().require_id_verification"
                (click)="toggleCashBool('require_id_verification')">
                {{ cashConfig().require_id_verification ? 'Activado' : 'Desactivado' }}
              </button>
            </div>

          </div>
          <div class="sp-admin-cash-config__actions">
            <button class="sp-admin-cash-config__btn-primary" (click)="saveCash()">
              Guardar cambios
            </button>
          </div>
        </div>
      }

      <!-- Tab: Subasta -->
      @if (activeTab() === 'auction') {
        <div class="sp-admin-cash-config__panel">
          <div class="sp-admin-cash-config__panel-header">
            <h2 class="sp-admin-cash-config__panel-title">Configuracion de Subasta</h2>
            <p class="sp-admin-cash-config__panel-desc">
              Limites, comisiones y duracion del proceso de subasta de liquidez
            </p>
          </div>
          <div class="sp-admin-cash-config__form">

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Monto maximo de subasta (MXN)</label>
              <p class="sp-admin-cash-config__hint">Limite superior para una oferta en subasta</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="auctionConfig().max_auction_amount"
                (ngModelChange)="updateAuctionField('max_auction_amount', $event)"
                min="0"
                step="10000" />
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Monto minimo de subasta (MXN)</label>
              <p class="sp-admin-cash-config__hint">Monto minimo para participar en una subasta</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="auctionConfig().min_auction_amount"
                (ngModelChange)="updateAuctionField('min_auction_amount', $event)"
                min="0"
                step="500" />
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Comision (%)</label>
              <p class="sp-admin-cash-config__hint">Porcentaje de comision sobre el monto subastado</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="auctionConfig().commission_pct"
                (ngModelChange)="updateAuctionField('commission_pct', $event)"
                min="0"
                max="10"
                step="0.1" />
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Duracion de subasta (horas)</label>
              <p class="sp-admin-cash-config__hint">Ventana de tiempo activa para recibir pujas</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="auctionConfig().auction_duration_hours"
                (ngModelChange)="updateAuctionField('auction_duration_hours', $event)"
                min="1"
                max="168"
                step="1" />
            </div>

            <div class="sp-admin-cash-config__field sp-admin-cash-config__field--toggle">
              <div>
                <label class="sp-admin-cash-config__label">Match automatico</label>
                <p class="sp-admin-cash-config__hint">Emparejar automaticamente ofertas y demandas compatibles</p>
              </div>
              <button
                class="sp-admin-cash-config__toggle"
                [class.sp-admin-cash-config__toggle--on]="auctionConfig().auto_match"
                (click)="toggleAuctionBool('auto_match')">
                {{ auctionConfig().auto_match ? 'Activado' : 'Desactivado' }}
              </button>
            </div>

          </div>
          <div class="sp-admin-cash-config__actions">
            <button class="sp-admin-cash-config__btn-primary" (click)="saveAuction()">
              Guardar cambios
            </button>
          </div>
        </div>
      }

      <!-- Tab: Config IA -->
      @if (activeTab() === 'ia') {
        <div class="sp-admin-cash-config__panel">
          <div class="sp-admin-cash-config__panel-header">
            <h2 class="sp-admin-cash-config__panel-title">Configuracion de Inteligencia Artificial</h2>
            <p class="sp-admin-cash-config__panel-desc">
              Umbrales de scoring, deteccion de fraude y notificaciones automaticas
            </p>
          </div>
          <div class="sp-admin-cash-config__form">

            <div class="sp-admin-cash-config__field sp-admin-cash-config__field--toggle">
              <div>
                <label class="sp-admin-cash-config__label">Scoring IA habilitado</label>
                <p class="sp-admin-cash-config__hint">Evaluar riesgo de cada transaccion con modelos IA</p>
              </div>
              <button
                class="sp-admin-cash-config__toggle"
                [class.sp-admin-cash-config__toggle--on]="iaConfig().ia_scoring_enabled"
                (click)="toggleIaBool('ia_scoring_enabled')">
                {{ iaConfig().ia_scoring_enabled ? 'Activado' : 'Desactivado' }}
              </button>
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Umbral de fraude (0.0 - 1.0)</label>
              <p class="sp-admin-cash-config__hint">Score a partir del cual se emite alerta de posible fraude</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="iaConfig().fraud_threshold"
                (ngModelChange)="updateIaField('fraud_threshold', $event)"
                min="0"
                max="1"
                step="0.01" />
              <div class="sp-admin-cash-config__score-bar">
                <div class="sp-admin-cash-config__score-bar-fill"
                     [style.width.%]="iaConfig().fraud_threshold * 100"
                     [style.background]="scoreColor(iaConfig().fraud_threshold)">
                </div>
              </div>
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Score de bloqueo automatico (0.0 - 1.0)</label>
              <p class="sp-admin-cash-config__hint">Score a partir del cual la transaccion se bloquea automaticamente</p>
              <input
                class="sp-admin-cash-config__input"
                type="number"
                [ngModel]="iaConfig().auto_block_score"
                (ngModelChange)="updateIaField('auto_block_score', $event)"
                min="0"
                max="1"
                step="0.01" />
              <div class="sp-admin-cash-config__score-bar">
                <div class="sp-admin-cash-config__score-bar-fill"
                     [style.width.%]="iaConfig().auto_block_score * 100"
                     [style.background]="scoreColor(iaConfig().auto_block_score)">
                </div>
              </div>
            </div>

            <div class="sp-admin-cash-config__field">
              <label class="sp-admin-cash-config__label">Email de notificaciones</label>
              <p class="sp-admin-cash-config__hint">Destinatario de alertas automaticas de fraude y bloqueos</p>
              <input
                class="sp-admin-cash-config__input"
                type="email"
                [ngModel]="iaConfig().notify_email"
                (ngModelChange)="updateIaField('notify_email', $event)" />
            </div>

          </div>
          <div class="sp-admin-cash-config__actions">
            <button class="sp-admin-cash-config__btn-primary" (click)="saveIa()">
              Guardar cambios
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-admin-cash-config {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 860px;
    }

    /* Header */
    .sp-admin-cash-config__header { margin-bottom: 20px; }
    .sp-admin-cash-config__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-cash-config__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }

    /* Tabs */
    .sp-admin-cash-config__tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 0;
    }
    .sp-admin-cash-config__tab {
      padding: 10px 20px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #718096;
      transition: all 0.15s ease;
    }
    .sp-admin-cash-config__tab:hover { color: #2d3748; background: #f7fafc; }
    .sp-admin-cash-config__tab--active {
      color: #3182ce;
      border-bottom-color: #3182ce;
      font-weight: 700;
    }

    /* Panel */
    .sp-admin-cash-config__panel {
      background: white;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 24px;
    }
    .sp-admin-cash-config__panel-header { margin-bottom: 24px; }
    .sp-admin-cash-config__panel-title {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-cash-config__panel-desc {
      margin: 0;
      font-size: 13px;
      color: #718096;
    }

    /* Form */
    .sp-admin-cash-config__form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 24px;
    }
    .sp-admin-cash-config__field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sp-admin-cash-config__field--toggle {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .sp-admin-cash-config__label {
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
    }
    .sp-admin-cash-config__hint {
      margin: 0;
      font-size: 12px;
      color: #a0aec0;
    }
    .sp-admin-cash-config__input {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1a202c;
      outline: none;
      width: 100%;
      max-width: 320px;
      box-sizing: border-box;
    }
    .sp-admin-cash-config__input:focus { border-color: #3182ce; box-shadow: 0 0 0 2px #bee3f8; }

    /* Toggle button */
    .sp-admin-cash-config__toggle {
      padding: 6px 18px;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #718096;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .sp-admin-cash-config__toggle--on {
      background: #c6f6d5;
      border-color: #9ae6b4;
      color: #276749;
    }

    /* Score bar */
    .sp-admin-cash-config__score-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      max-width: 320px;
      margin-top: 4px;
    }
    .sp-admin-cash-config__score-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background 0.3s ease;
    }

    /* Actions */
    .sp-admin-cash-config__actions { border-top: 1px solid #f0f4f8; padding-top: 20px; }
    .sp-admin-cash-config__btn-primary {
      padding: 10px 24px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .sp-admin-cash-config__btn-primary:hover { background: #2b6cb0; }
  `],
})
export class CashConfigPageComponent {

  readonly activeTab = signal<ActiveTab>('cash');

  readonly cashConfig = signal<CashConfig>({
    max_cash_in:             50_000,
    max_cash_out:            20_000,
    require_id_verification: false,
    auto_approve_below:       5_000,
  });

  readonly auctionConfig = signal<AuctionConfig>({
    max_auction_amount:    500_000,
    min_auction_amount:      1_000,
    commission_pct:              0.5,
    auction_duration_hours:     24,
    auto_match:              false,
  });

  readonly iaConfig = signal<IaConfig>({
    ia_scoring_enabled: true,
    fraud_threshold:    0.85,
    auto_block_score:   0.95,
    notify_email:       'ops@superpago.mx',
  });

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  updateCashField(field: keyof CashConfig, value: number | boolean): void {
    this.cashConfig.update((cfg) => ({ ...cfg, [field]: value }));
  }

  updateAuctionField(field: keyof AuctionConfig, value: number | boolean): void {
    this.auctionConfig.update((cfg) => ({ ...cfg, [field]: value }));
  }

  updateIaField(field: keyof IaConfig, value: number | boolean | string): void {
    this.iaConfig.update((cfg) => ({ ...cfg, [field]: value }));
  }

  toggleCashBool(field: 'require_id_verification'): void {
    this.cashConfig.update((cfg) => ({ ...cfg, [field]: !cfg[field] }));
  }

  toggleAuctionBool(field: 'auto_match'): void {
    this.auctionConfig.update((cfg) => ({ ...cfg, [field]: !cfg[field] }));
  }

  toggleIaBool(field: 'ia_scoring_enabled'): void {
    this.iaConfig.update((cfg) => ({ ...cfg, [field]: !cfg[field] }));
  }

  scoreColor(score: number): string {
    if (score < 0.5) return '#38a169';
    if (score < 0.8) return '#d69e2e';
    return '#e53e3e';
  }

  saveCash(): void {
    console.log('[CashConfig] Guardando configuracion Cash In/Out:', this.cashConfig());
  }

  saveAuction(): void {
    console.log('[CashConfig] Guardando configuracion Subasta:', this.auctionConfig());
  }

  saveIa(): void {
    console.log('[CashConfig] Guardando configuracion IA:', this.iaConfig());
  }
}
