/**
 * BillPayPageComponent - EP-SP-027
 * Pago de servicios empresarial: TELECOM, UTILITIES, GOVT, RETAIL, INSURANCE.
 * 3 tabs: Pagar Servicio (6 pasos), Historial, Favoritos.
 */
import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

type BillCategory = 'TELECOM' | 'UTILITIES' | 'GOVT' | 'RETAIL' | 'INSURANCE';
type BillPayTab = 'pay' | 'history' | 'favorites';
type PayStep = 0 | 1 | 2 | 3 | 4 | 5;
type PaymentStatus = 'COMPLETED' | 'FAILED';

interface BillProvider {
  id: string;
  name: string;
  icon: string;
  category: BillCategory;
}

interface BillDeuda {
  amount_due: number;
  due_date: string;
  description: string;
  fee: number;
  fee_iva: number;
  total: number;
}

interface HistoryItem {
  id: string;
  date: string;
  provider: string;
  account_number: string;
  amount: number;
  fee: number;
  status: PaymentStatus;
}

interface FavoriteItem {
  id: string;
  name: string;
  category: BillCategory;
  account_number: string;
  provider_id: string;
}

const PROVIDERS: BillProvider[] = [
  { id: 'telmex', name: 'Telmex', icon: '📞', category: 'TELECOM' },
  { id: 'telcel', name: 'Telcel', icon: '📱', category: 'TELECOM' },
  { id: 'att', name: 'AT&T', icon: '📡', category: 'TELECOM' },
  { id: 'izzi', name: 'IZZI', icon: '📺', category: 'TELECOM' },
  { id: 'cfe', name: 'CFE', icon: '💡', category: 'UTILITIES' },
  { id: 'gas', name: 'Gas Natural', icon: '🔥', category: 'UTILITIES' },
  { id: 'sapamex', name: 'SAPAMEX', icon: '💧', category: 'UTILITIES' },
  { id: 'sat', name: 'SAT', icon: '🏛️', category: 'GOVT' },
  { id: 'imss', name: 'IMSS', icon: '🏥', category: 'GOVT' },
  { id: 'oxxo', name: 'OXXO Pay', icon: '🏪', category: 'RETAIL' },
  { id: 'megacable', name: 'Megacable', icon: '📺', category: 'RETAIL' },
];

const CATEGORY_LABELS: Record<BillCategory, string> = {
  TELECOM: 'Telecom',
  UTILITIES: 'Servicios',
  GOVT: 'Gobierno',
  RETAIL: 'Retail',
  INSURANCE: 'Seguros',
};

const MOCK_HISTORY: HistoryItem[] = [
  { id: 'h1', date: '2026-02-25T10:30:00Z', provider: 'Telmex', account_number: '5555012345', amount: 680.00, fee: 10.00, status: 'COMPLETED' },
  { id: 'h2', date: '2026-02-23T14:15:00Z', provider: 'CFE', account_number: '5421004789', amount: 1230.50, fee: 10.00, status: 'COMPLETED' },
  { id: 'h3', date: '2026-02-20T09:00:00Z', provider: 'SAT', account_number: 'XAXX010101000', amount: 4500.00, fee: 15.00, status: 'COMPLETED' },
  { id: 'h4', date: '2026-02-18T16:45:00Z', provider: 'IZZI', account_number: '8811223344', amount: 795.00, fee: 10.00, status: 'FAILED' },
  { id: 'h5', date: '2026-02-15T11:20:00Z', provider: 'IMSS', account_number: 'IMSS-789012', amount: 8200.00, fee: 15.00, status: 'COMPLETED' },
];

const MOCK_FAVORITES: FavoriteItem[] = [
  { id: 'f1', name: 'Telmex Oficina', category: 'TELECOM', account_number: '5555012345', provider_id: 'telmex' },
  { id: 'f2', name: 'CFE Planta', category: 'UTILITIES', account_number: '5421004789', provider_id: 'cfe' },
  { id: 'f3', name: 'SAT IVA Mensual', category: 'GOVT', account_number: 'XAXX010101000', provider_id: 'sat' },
];

@Component({
  selector: 'sp-business-billpay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-business-billpay">

      <!-- Header -->
      <div class="sp-business-billpay__header">
        <h1 class="sp-business-billpay__title">Pago de Servicios</h1>
        <p class="sp-business-billpay__subtitle">Paga facturas y servicios empresariales</p>
      </div>

      <!-- Tabs -->
      <div class="sp-business-billpay__tabs">
        @for (tab of tabs; track tab.id) {
          <button
            [class]="'sp-business-billpay__tab' + (activeTab() === tab.id ? ' active' : '')"
            (click)="activeTab.set(tab.id)">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- TAB: PAGAR SERVICIO -->
      @if (activeTab() === 'pay') {
        <div class="sp-business-billpay__pay-panel">

          <!-- Progress bar -->
          <div class="sp-business-billpay__progress">
            @for (step of stepLabels; track $index) {
              <div [class]="'sp-business-billpay__progress-step' +
                ($index < stepIndex() ? ' done' : '') +
                ($index === stepIndex() ? ' active' : '')">
                <div class="sp-business-billpay__progress-dot">
                  @if ($index < stepIndex()) { <span>✓</span> }
                  @else { <span>{{ $index + 1 }}</span> }
                </div>
                <span class="sp-business-billpay__progress-label">{{ step }}</span>
              </div>
            }
          </div>

          <!-- PASO 0: Seleccionar categoría -->
          @if (stepIndex() === 0) {
            <div class="sp-business-billpay__step-card">
              <h3 class="sp-business-billpay__step-title">Selecciona una categoría</h3>
              <div class="sp-business-billpay__chips">
                @for (cat of categories; track cat) {
                  <button
                    [class]="'sp-business-billpay__chip' + (selectedCategory() === cat ? ' active' : '')"
                    (click)="selectCategory(cat)">
                    {{ CATEGORY_LABELS[cat] }}
                  </button>
                }
              </div>
              @if (selectedCategory()) {
                <button class="sp-business-billpay__btn sp-business-billpay__btn--primary"
                  (click)="stepIndex.set(1)">
                  Continuar →
                </button>
              }
            </div>
          }

          <!-- PASO 1: Seleccionar proveedor -->
          @if (stepIndex() === 1) {
            <div class="sp-business-billpay__step-card">
              <div class="sp-business-billpay__step-header-row">
                <h3 class="sp-business-billpay__step-title">Selecciona el proveedor</h3>
                <button class="sp-business-billpay__back-link" (click)="stepIndex.set(0)">← Cambiar categoría</button>
              </div>
              <div class="sp-business-billpay__provider-list">
                @for (prov of providersByCategory(); track prov.id) {
                  <button
                    [class]="'sp-business-billpay__provider-item' + (selectedProvider()?.id === prov.id ? ' active' : '')"
                    (click)="selectProvider(prov)">
                    <span class="sp-business-billpay__provider-icon">{{ prov.icon }}</span>
                    <span class="sp-business-billpay__provider-name">{{ prov.name }}</span>
                  </button>
                }
              </div>
              @if (selectedProvider()) {
                <button class="sp-business-billpay__btn sp-business-billpay__btn--primary"
                  (click)="stepIndex.set(2)">
                  Continuar →
                </button>
              }
            </div>
          }

          <!-- PASO 2: Ingresar cuenta/referencia -->
          @if (stepIndex() === 2) {
            <div class="sp-business-billpay__step-card">
              <div class="sp-business-billpay__step-header-row">
                <h3 class="sp-business-billpay__step-title">
                  {{ selectedProvider()?.icon }} {{ selectedProvider()?.name }}
                </h3>
                <button class="sp-business-billpay__back-link" (click)="stepIndex.set(1)">← Cambiar proveedor</button>
              </div>
              <div class="sp-business-billpay__form-group">
                <label class="sp-business-billpay__label">Número de cuenta / Referencia</label>
                <input
                  type="text"
                  class="sp-business-billpay__input"
                  placeholder="Ej: 5555012345"
                  [value]="accountNumber()"
                  (input)="accountNumber.set($any($event.target).value)"
                />
                <span class="sp-business-billpay__hint">Ingresa el número que aparece en tu factura</span>
              </div>
              <button
                class="sp-business-billpay__btn sp-business-billpay__btn--primary"
                [disabled]="accountNumber().trim().length < 4"
                (click)="consultarAdeudo()">
                Consultar adeudo
              </button>
            </div>
          }

          <!-- PASO 3: Resultado de consulta -->
          @if (stepIndex() === 3) {
            <div class="sp-business-billpay__step-card">
              <h3 class="sp-business-billpay__step-title">Resumen del adeudo</h3>
              <div class="sp-business-billpay__deuda-card">
                <div class="sp-business-billpay__deuda-provider">
                  <span class="sp-business-billpay__deuda-icon">{{ selectedProvider()?.icon }}</span>
                  <div>
                    <div class="sp-business-billpay__deuda-name">{{ selectedProvider()?.name }}</div>
                    <div class="sp-business-billpay__deuda-account">Cta: {{ accountNumber() }}</div>
                  </div>
                </div>
                @if (deuda()) {
                  <div class="sp-business-billpay__deuda-rows">
                    <div class="sp-business-billpay__deuda-row">
                      <span>Descripción</span><span>{{ deuda()!.description }}</span>
                    </div>
                    <div class="sp-business-billpay__deuda-row">
                      <span>Vence</span><span>{{ deuda()!.due_date | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="sp-business-billpay__deuda-row">
                      <span>Importe</span><span>{{ deuda()!.amount_due | currency:'MXN':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="sp-business-billpay__deuda-row">
                      <span>Comisión</span><span>{{ deuda()!.fee | currency:'MXN':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="sp-business-billpay__deuda-row">
                      <span>IVA comisión</span><span>{{ deuda()!.fee_iva | currency:'MXN':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="sp-business-billpay__deuda-row sp-business-billpay__deuda-row--total">
                      <span>TOTAL A PAGAR</span><span>{{ deuda()!.total | currency:'MXN':'symbol':'1.2-2' }}</span>
                    </div>
                  </div>
                }
              </div>
              <div class="sp-business-billpay__step-actions">
                <button class="sp-business-billpay__btn sp-business-billpay__btn--outline" (click)="stepIndex.set(2)">
                  ← Editar referencia
                </button>
                <button class="sp-business-billpay__btn sp-business-billpay__btn--primary" (click)="stepIndex.set(4)">
                  Pagar {{ deuda()!.total | currency:'MXN':'symbol':'1.2-2' }} →
                </button>
              </div>
            </div>
          }

          <!-- PASO 4: Confirmar pago -->
          @if (stepIndex() === 4) {
            <div class="sp-business-billpay__step-card">
              <h3 class="sp-business-billpay__step-title">Confirmar pago</h3>
              <div class="sp-business-billpay__confirm-summary">
                <div class="sp-business-billpay__confirm-row">
                  <span class="sp-business-billpay__confirm-key">Servicio</span>
                  <span class="sp-business-billpay__confirm-val">{{ selectedProvider()?.icon }} {{ selectedProvider()?.name }}</span>
                </div>
                <div class="sp-business-billpay__confirm-row">
                  <span class="sp-business-billpay__confirm-key">Cuenta</span>
                  <span class="sp-business-billpay__confirm-val">{{ accountNumber() }}</span>
                </div>
                <div class="sp-business-billpay__confirm-row">
                  <span class="sp-business-billpay__confirm-key">Descripción</span>
                  <span class="sp-business-billpay__confirm-val">{{ deuda()?.description }}</span>
                </div>
                <div class="sp-business-billpay__confirm-row sp-business-billpay__confirm-row--total">
                  <span class="sp-business-billpay__confirm-key">Total</span>
                  <span class="sp-business-billpay__confirm-val">{{ deuda()!.total | currency:'MXN':'symbol':'1.2-2' }}</span>
                </div>
              </div>
              <p class="sp-business-billpay__confirm-note">
                Al confirmar, se realizará el cargo a tu cuenta empresarial principal.
              </p>
              <div class="sp-business-billpay__step-actions">
                <button class="sp-business-billpay__btn sp-business-billpay__btn--outline" (click)="stepIndex.set(3)">
                  ← Cancelar
                </button>
                <button class="sp-business-billpay__btn sp-business-billpay__btn--success" (click)="confirmarPago()">
                  Confirmar y Pagar
                </button>
              </div>
            </div>
          }

          <!-- PASO 5: Comprobante -->
          @if (stepIndex() === 5) {
            <div class="sp-business-billpay__step-card sp-business-billpay__step-card--success">
              <div class="sp-business-billpay__receipt-icon">✅</div>
              <h3 class="sp-business-billpay__step-title">Pago realizado exitosamente</h3>
              <div class="sp-business-billpay__receipt-rows">
                <div class="sp-business-billpay__receipt-row">
                  <span>ID de pago</span><span class="sp-business-billpay__receipt-mono">{{ receipt()?.payment_id }}</span>
                </div>
                <div class="sp-business-billpay__receipt-row">
                  <span>Servicio</span><span>{{ selectedProvider()?.icon }} {{ selectedProvider()?.name }}</span>
                </div>
                <div class="sp-business-billpay__receipt-row">
                  <span>Cuenta pagada</span><span>{{ accountNumber() }}</span>
                </div>
                <div class="sp-business-billpay__receipt-row">
                  <span>Monto pagado</span><span>{{ deuda()!.total | currency:'MXN':'symbol':'1.2-2' }}</span>
                </div>
                <div class="sp-business-billpay__receipt-row">
                  <span>Fecha y hora</span><span>{{ receipt()?.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                </div>
                <div class="sp-business-billpay__receipt-row">
                  <span>Estatus</span>
                  <span class="sp-business-billpay__status sp-business-billpay__status--completed">{{ receipt()?.status }}</span>
                </div>
              </div>
              <button class="sp-business-billpay__btn sp-business-billpay__btn--primary" (click)="nuevaOperacion()">
                + Nueva operación
              </button>
            </div>
          }

        </div>
      }

      <!-- TAB: HISTORIAL -->
      @if (activeTab() === 'history') {
        <div class="sp-business-billpay__history-panel">
          <h3 class="sp-business-billpay__section-title">Últimos pagos realizados</h3>
          <div class="sp-business-billpay__table-wrap">
            <table class="sp-business-billpay__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Referencia</th>
                  <th>Importe</th>
                  <th>Comisión</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                @for (item of history(); track item.id) {
                  <tr>
                    <td>{{ item.date | date:'dd/MM/yy HH:mm' }}</td>
                    <td>{{ item.provider }}</td>
                    <td class="sp-business-billpay__mono">{{ item.account_number }}</td>
                    <td>{{ item.amount | currency:'MXN':'symbol':'1.2-2' }}</td>
                    <td>{{ item.fee | currency:'MXN':'symbol':'1.2-2' }}</td>
                    <td>
                      <span [class]="'sp-business-billpay__status sp-business-billpay__status--' + item.status.toLowerCase()">
                        {{ item.status === 'COMPLETED' ? 'Pagado' : 'Fallido' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- TAB: FAVORITOS -->
      @if (activeTab() === 'favorites') {
        <div class="sp-business-billpay__favorites-panel">
          <h3 class="sp-business-billpay__section-title">Servicios guardados</h3>
          @if (favorites().length === 0) {
            <div class="sp-business-billpay__empty">
              Aún no tienes servicios favoritos guardados.
            </div>
          }
          <div class="sp-business-billpay__favorites-list">
            @for (fav of favorites(); track fav.id) {
              <div class="sp-business-billpay__favorite-card">
                <div class="sp-business-billpay__favorite-info">
                  <div class="sp-business-billpay__favorite-name">{{ fav.name }}</div>
                  <div class="sp-business-billpay__favorite-meta">
                    <span class="sp-business-billpay__chip sp-business-billpay__chip--small">{{ CATEGORY_LABELS[fav.category] }}</span>
                    <span class="sp-business-billpay__mono">{{ fav.account_number }}</span>
                  </div>
                </div>
                <button class="sp-business-billpay__btn sp-business-billpay__btn--outline"
                  (click)="usarFavorito(fav)">
                  Usar →
                </button>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-business-billpay {
      padding: 24px;
      max-width: 860px;
      margin: 0 auto;
      font-family: system-ui, sans-serif;
    }

    /* Header */
    .sp-business-billpay__header { margin-bottom: 20px; }
    .sp-business-billpay__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-business-billpay__subtitle { font-size: 13px; color: #718096; margin: 0; }

    /* Tabs */
    .sp-business-billpay__tabs {
      display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .sp-business-billpay__tab {
      padding: 10px 20px; border: none; background: none; cursor: pointer;
      font-size: 14px; font-weight: 500; color: #718096;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      transition: all 0.15s;
    }
    .sp-business-billpay__tab.active { color: #3182ce; border-bottom-color: #3182ce; font-weight: 600; }
    .sp-business-billpay__tab:hover:not(.active) { color: #4a5568; }

    /* Progress */
    .sp-business-billpay__progress {
      display: flex; gap: 0; margin-bottom: 24px; overflow-x: auto;
    }
    .sp-business-billpay__progress-step {
      display: flex; flex-direction: column; align-items: center; flex: 1; gap: 6px; min-width: 60px;
      position: relative;
    }
    .sp-business-billpay__progress-step:not(:last-child)::after {
      content: ''; position: absolute; top: 16px; left: 50%; width: 100%;
      height: 2px; background: #e2e8f0; z-index: 0;
    }
    .sp-business-billpay__progress-step.done::after { background: #38a169; }
    .sp-business-billpay__progress-dot {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; z-index: 1;
      background: #e2e8f0; color: #a0aec0;
    }
    .sp-business-billpay__progress-step.done .sp-business-billpay__progress-dot {
      background: #38a169; color: white;
    }
    .sp-business-billpay__progress-step.active .sp-business-billpay__progress-dot {
      background: #3182ce; color: white;
    }
    .sp-business-billpay__progress-label { font-size: 10px; color: #a0aec0; text-align: center; }
    .sp-business-billpay__progress-step.active .sp-business-billpay__progress-label { color: #3182ce; font-weight: 600; }
    .sp-business-billpay__progress-step.done .sp-business-billpay__progress-label { color: #38a169; }

    /* Step card */
    .sp-business-billpay__step-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 24px; display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .sp-business-billpay__step-card--success { border-color: #c6f6d5; background: #f0fff4; text-align: center; }
    .sp-business-billpay__step-header-row { display: flex; justify-content: space-between; align-items: center; }
    .sp-business-billpay__step-title { font-size: 16px; font-weight: 700; color: #2d3748; margin: 0; }
    .sp-business-billpay__back-link { background: none; border: none; color: #3182ce; font-size: 12px; cursor: pointer; }
    .sp-business-billpay__step-actions { display: flex; gap: 12px; justify-content: flex-end; }

    /* Chips */
    .sp-business-billpay__chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .sp-business-billpay__chip {
      padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 20px;
      background: white; font-size: 13px; cursor: pointer; font-weight: 500; color: #4a5568;
      transition: all 0.15s;
    }
    .sp-business-billpay__chip.active { background: #3182ce; color: white; border-color: #3182ce; }
    .sp-business-billpay__chip--small { padding: 2px 10px; font-size: 11px; }

    /* Providers */
    .sp-business-billpay__provider-list { display: flex; flex-direction: column; gap: 8px; }
    .sp-business-billpay__provider-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border: 1px solid #e2e8f0; border-radius: 8px; background: white;
      cursor: pointer; text-align: left; font-size: 14px; color: #2d3748;
      transition: all 0.15s;
    }
    .sp-business-billpay__provider-item:hover { border-color: #bee3f8; background: #ebf8ff; }
    .sp-business-billpay__provider-item.active { border-color: #3182ce; background: #ebf8ff; font-weight: 600; }
    .sp-business-billpay__provider-icon { font-size: 22px; }
    .sp-business-billpay__provider-name { font-size: 14px; }

    /* Form */
    .sp-business-billpay__form-group { display: flex; flex-direction: column; gap: 6px; }
    .sp-business-billpay__label { font-size: 12px; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
    .sp-business-billpay__input {
      padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 14px; outline: none; transition: border-color 0.15s;
    }
    .sp-business-billpay__input:focus { border-color: #3182ce; }
    .sp-business-billpay__hint { font-size: 11px; color: #a0aec0; }

    /* Deuda card */
    .sp-business-billpay__deuda-card {
      border: 1px solid #bee3f8; border-radius: 10px; padding: 16px;
      background: #ebf8ff; display: flex; flex-direction: column; gap: 12px;
    }
    .sp-business-billpay__deuda-provider { display: flex; align-items: center; gap: 12px; }
    .sp-business-billpay__deuda-icon { font-size: 28px; }
    .sp-business-billpay__deuda-name { font-size: 15px; font-weight: 700; color: #2b6cb0; }
    .sp-business-billpay__deuda-account { font-size: 12px; color: #4a5568; }
    .sp-business-billpay__deuda-rows { display: flex; flex-direction: column; gap: 6px; }
    .sp-business-billpay__deuda-row {
      display: flex; justify-content: space-between;
      font-size: 13px; color: #4a5568; padding: 6px 0;
      border-bottom: 1px solid #bee3f8;
    }
    .sp-business-billpay__deuda-row--total {
      font-weight: 700; font-size: 15px; color: #1a202c; border-bottom: none;
      padding-top: 10px;
    }

    /* Confirm */
    .sp-business-billpay__confirm-summary {
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .sp-business-billpay__confirm-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px;
    }
    .sp-business-billpay__confirm-row:last-child { border-bottom: none; }
    .sp-business-billpay__confirm-key { color: #718096; }
    .sp-business-billpay__confirm-val { font-weight: 500; color: #2d3748; }
    .sp-business-billpay__confirm-row--total .sp-business-billpay__confirm-key { font-weight: 700; color: #2d3748; }
    .sp-business-billpay__confirm-row--total .sp-business-billpay__confirm-val { font-weight: 700; font-size: 16px; color: #2b6cb0; }
    .sp-business-billpay__confirm-note { font-size: 12px; color: #a0aec0; margin: 0; }

    /* Receipt */
    .sp-business-billpay__receipt-icon { font-size: 48px; }
    .sp-business-billpay__receipt-rows { display: flex; flex-direction: column; gap: 0; width: 100%; max-width: 400px; margin: 0 auto; }
    .sp-business-billpay__receipt-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 0; border-bottom: 1px solid #c6f6d5; font-size: 13px; color: #2d3748;
    }
    .sp-business-billpay__receipt-row:last-child { border-bottom: none; }
    .sp-business-billpay__receipt-mono { font-family: monospace; font-size: 12px; }

    /* Buttons */
    .sp-business-billpay__btn {
      padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap;
    }
    .sp-business-billpay__btn--primary { background: #3182ce; color: white; }
    .sp-business-billpay__btn--primary:hover { background: #2b6cb0; }
    .sp-business-billpay__btn--primary:disabled { background: #bee3f8; cursor: not-allowed; }
    .sp-business-billpay__btn--success { background: #38a169; color: white; }
    .sp-business-billpay__btn--success:hover { background: #2f855a; }
    .sp-business-billpay__btn--outline { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-business-billpay__btn--outline:hover { border-color: #cbd5e0; background: #f7fafc; }

    /* Status badges */
    .sp-business-billpay__status {
      padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;
    }
    .sp-business-billpay__status--completed { background: #c6f6d5; color: #276749; }
    .sp-business-billpay__status--failed { background: #fed7d7; color: #742a2a; }

    /* History table */
    .sp-business-billpay__history-panel { display: flex; flex-direction: column; gap: 16px; }
    .sp-business-billpay__section-title { font-size: 16px; font-weight: 700; color: #2d3748; margin: 0; }
    .sp-business-billpay__table-wrap {
      background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-business-billpay__table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .sp-business-billpay__table th {
      padding: 10px 14px; text-align: left; background: #f7fafc;
      color: #718096; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .sp-business-billpay__table td {
      padding: 12px 14px; border-bottom: 1px solid #f7fafc; color: #4a5568;
    }
    .sp-business-billpay__table tr:last-child td { border-bottom: none; }
    .sp-business-billpay__mono { font-family: monospace; font-size: 12px; }

    /* Favorites */
    .sp-business-billpay__favorites-panel { display: flex; flex-direction: column; gap: 16px; }
    .sp-business-billpay__favorites-list { display: flex; flex-direction: column; gap: 8px; }
    .sp-business-billpay__favorite-card {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; background: white; border: 1px solid #e2e8f0;
      border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .sp-business-billpay__favorite-info { display: flex; flex-direction: column; gap: 6px; }
    .sp-business-billpay__favorite-name { font-size: 14px; font-weight: 600; color: #2d3748; }
    .sp-business-billpay__favorite-meta { display: flex; align-items: center; gap: 8px; }
    .sp-business-billpay__empty { text-align: center; padding: 40px; color: #a0aec0; font-size: 14px; }

    /* Pay panel */
    .sp-business-billpay__pay-panel { display: flex; flex-direction: column; gap: 0; }
  `],
})
export class BillPayPageComponent {
  readonly CATEGORY_LABELS = CATEGORY_LABELS;

  readonly tabs = [
    { id: 'pay' as BillPayTab, label: 'Pagar Servicio' },
    { id: 'history' as BillPayTab, label: 'Historial' },
    { id: 'favorites' as BillPayTab, label: 'Favoritos' },
  ];

  readonly stepLabels = ['Categoría', 'Proveedor', 'Referencia', 'Adeudo', 'Confirmar', 'Comprobante'];
  readonly categories: BillCategory[] = ['TELECOM', 'UTILITIES', 'GOVT', 'RETAIL', 'INSURANCE'];

  readonly activeTab = signal<BillPayTab>('pay');
  readonly stepIndex = signal<PayStep>(0);
  readonly selectedCategory = signal<BillCategory | null>(null);
  readonly selectedProvider = signal<BillProvider | null>(null);
  readonly accountNumber = signal<string>('');
  readonly deuda = signal<BillDeuda | null>(null);
  readonly receipt = signal<{ payment_id: string; timestamp: string; status: string } | null>(null);

  readonly history = signal<HistoryItem[]>(MOCK_HISTORY);
  readonly favorites = signal<FavoriteItem[]>(MOCK_FAVORITES);

  readonly providersByCategory = computed<BillProvider[]>(() => {
    const cat = this.selectedCategory();
    return cat ? PROVIDERS.filter((p) => p.category === cat) : [];
  });

  selectCategory(cat: BillCategory): void {
    this.selectedCategory.set(cat);
    this.selectedProvider.set(null);
  }

  selectProvider(prov: BillProvider): void {
    this.selectedProvider.set(prov);
  }

  consultarAdeudo(): void {
    // Datos mock que simulan la respuesta de la consulta al proveedor
    const fee = 10.00;
    const fee_iva = fee * 0.16;
    const amount_due = parseFloat((Math.random() * 2000 + 300).toFixed(2));
    const total = parseFloat((amount_due + fee + fee_iva).toFixed(2));
    this.deuda.set({
      amount_due,
      due_date: '2026-03-15',
      description: `Factura ${this.selectedProvider()?.name} - ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`,
      fee,
      fee_iva,
      total,
    });
    this.stepIndex.set(3);
  }

  confirmarPago(): void {
    this.receipt.set({
      payment_id: `BP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
    });
    this.stepIndex.set(5);
  }

  nuevaOperacion(): void {
    this.stepIndex.set(0);
    this.selectedCategory.set(null);
    this.selectedProvider.set(null);
    this.accountNumber.set('');
    this.deuda.set(null);
    this.receipt.set(null);
  }

  usarFavorito(fav: FavoriteItem): void {
    const prov = PROVIDERS.find((p) => p.id === fav.provider_id) ?? null;
    this.selectedCategory.set(fav.category);
    this.selectedProvider.set(prov);
    this.accountNumber.set(fav.account_number);
    this.stepIndex.set(2);
    this.activeTab.set('pay');
  }
}
