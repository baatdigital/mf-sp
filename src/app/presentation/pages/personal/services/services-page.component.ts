/**
 * ServicesPageComponent - EP-SP-028
 * Pago de servicios para usuario personal: recarga celular, CFE, agua, gas, internet, TV.
 * Grid de servicios → formulario inline → consulta adeudo → confirmación → comprobante.
 */
import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

type ServiceStep = 'select' | 'query' | 'confirm' | 'done';
type ServiceCategory = 'RECHARGE' | 'CFE' | 'WATER' | 'GAS' | 'INTERNET' | 'TV';
type HistoryStatus = 'COMPLETED' | 'FAILED';

interface ServiceOption {
  id: string;
  icon: string;
  name: string;
  category: ServiceCategory;
  description: string;
  providers: ServiceProvider[];
  showAmount: boolean;
}

interface ServiceProvider {
  id: string;
  name: string;
}

interface QuickHistory {
  id: string;
  date: string;
  service: string;
  amount: number;
  status: HistoryStatus;
}

const SERVICES: ServiceOption[] = [
  {
    id: 'recharge',
    icon: '📱',
    name: 'Recarga Celular',
    category: 'RECHARGE',
    description: 'Recarga tu saldo al instante',
    showAmount: true,
    providers: [
      { id: 'telcel', name: 'Telcel' },
      { id: 'att', name: 'AT&T' },
      { id: 'movistar', name: 'Movistar' },
    ],
  },
  {
    id: 'cfe',
    icon: '💡',
    name: 'CFE',
    category: 'CFE',
    description: 'Paga tu recibo de luz',
    showAmount: false,
    providers: [{ id: 'cfe', name: 'CFE' }],
  },
  {
    id: 'water',
    icon: '💧',
    name: 'Agua',
    category: 'WATER',
    description: 'SACMEX y sistemas municipales',
    showAmount: false,
    providers: [
      { id: 'sacmex', name: 'SACMEX' },
      { id: 'agua_municipal', name: 'Agua Municipal' },
    ],
  },
  {
    id: 'gas',
    icon: '🔥',
    name: 'Gas Natural',
    category: 'GAS',
    description: 'Gas Natural Fenosa',
    showAmount: false,
    providers: [{ id: 'gas_fenosa', name: 'Gas Natural Fenosa' }],
  },
  {
    id: 'internet',
    icon: '🌐',
    name: 'Internet',
    category: 'INTERNET',
    description: 'Telmex, IZZI, Megacable y más',
    showAmount: false,
    providers: [
      { id: 'telmex', name: 'Telmex' },
      { id: 'izzi', name: 'IZZI' },
      { id: 'megacable', name: 'Megacable' },
    ],
  },
  {
    id: 'tv',
    icon: '📺',
    name: 'TV de paga',
    category: 'TV',
    description: 'Sky, IZZI y Megacable',
    showAmount: false,
    providers: [
      { id: 'sky', name: 'Sky' },
      { id: 'izzi_tv', name: 'IZZI' },
      { id: 'megacable_tv', name: 'Megacable' },
    ],
  },
];

const MOCK_HISTORY: QuickHistory[] = [
  { id: 'qh1', date: '2026-02-24T10:00:00Z', service: '📱 Recarga Telcel', amount: 200.00, status: 'COMPLETED' },
  { id: 'qh2', date: '2026-02-20T14:30:00Z', service: '💡 CFE', amount: 854.50, status: 'COMPLETED' },
  { id: 'qh3', date: '2026-02-15T09:15:00Z', service: '🌐 Telmex Internet', amount: 399.00, status: 'COMPLETED' },
];

@Component({
  selector: 'sp-personal-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-personal-services">

      <!-- Header -->
      <div class="sp-personal-services__header">
        <h1 class="sp-personal-services__title">Servicios</h1>
        <p class="sp-personal-services__subtitle">Paga tus servicios del hogar fácil y rápido</p>
      </div>

      <!-- Grid de servicios (vista inicial) -->
      @if (step() === 'select') {
        <div class="sp-personal-services__grid">
          @for (svc of services; track svc.id) {
            <button
              class="sp-personal-services__service-card"
              (click)="seleccionarServicio(svc)">
              <span class="sp-personal-services__service-icon">{{ svc.icon }}</span>
              <span class="sp-personal-services__service-name">{{ svc.name }}</span>
              <span class="sp-personal-services__service-desc">{{ svc.description }}</span>
            </button>
          }
        </div>

        <!-- Historial rápido -->
        @if (history().length > 0) {
          <div class="sp-personal-services__history-section">
            <h3 class="sp-personal-services__history-title">Últimos pagos</h3>
            <div class="sp-personal-services__history-list">
              @for (item of history(); track item.id) {
                <div class="sp-personal-services__history-item">
                  <div class="sp-personal-services__history-info">
                    <span class="sp-personal-services__history-service">{{ item.service }}</span>
                    <span class="sp-personal-services__history-date">{{ item.date | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <div class="sp-personal-services__history-right">
                    <span class="sp-personal-services__history-amount">{{ item.amount | currency:'MXN':'symbol':'1.2-2' }}</span>
                    <span [class]="'sp-personal-services__status sp-personal-services__status--' + item.status.toLowerCase()">
                      {{ item.status === 'COMPLETED' ? 'Pagado' : 'Fallido' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Panel de pago inline -->
      @if (step() !== 'select') {
        <div class="sp-personal-services__pay-panel">

          <!-- Cabecera del panel -->
          <div class="sp-personal-services__pay-header">
            <button class="sp-personal-services__back-btn" (click)="volver()">
              ← Regresar
            </button>
            <div class="sp-personal-services__pay-service-title">
              <span class="sp-personal-services__pay-icon">{{ selectedService()?.icon }}</span>
              <span>{{ selectedService()?.name }}</span>
            </div>
          </div>

          <!-- STEP: query - Formulario -->
          @if (step() === 'query') {
            <div class="sp-personal-services__form-card">

              <!-- Selector de proveedor (si tiene más de 1) -->
              @if (selectedService()!.providers.length > 1) {
                <div class="sp-personal-services__form-group">
                  <label class="sp-personal-services__label">Proveedor</label>
                  <div class="sp-personal-services__provider-chips">
                    @for (prov of selectedService()!.providers; track prov.id) {
                      <button
                        [class]="'sp-personal-services__prov-chip' + (selectedProvider()?.id === prov.id ? ' active' : '')"
                        (click)="selectedProvider.set(prov)">
                        {{ prov.name }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Número de cuenta / celular -->
              <div class="sp-personal-services__form-group">
                <label class="sp-personal-services__label">
                  {{ selectedService()?.category === 'RECHARGE' ? 'Número de celular' : 'Número de cuenta / referencia' }}
                </label>
                <input
                  type="text"
                  class="sp-personal-services__input"
                  [placeholder]="selectedService()?.category === 'RECHARGE' ? 'Ej: 5512345678' : 'Ej: 1234567890'"
                  [value]="referencia()"
                  (input)="referencia.set($any($event.target).value)"
                />
              </div>

              <!-- Monto (solo recarga) -->
              @if (selectedService()?.showAmount) {
                <div class="sp-personal-services__form-group">
                  <label class="sp-personal-services__label">Monto de recarga</label>
                  <div class="sp-personal-services__amount-chips">
                    @for (amt of rechargeAmounts; track amt) {
                      <button
                        [class]="'sp-personal-services__amount-chip' + (monto() === amt ? ' active' : '')"
                        (click)="monto.set(amt)">
                        ${{ amt }}
                      </button>
                    }
                  </div>
                  <input
                    type="number"
                    class="sp-personal-services__input"
                    placeholder="O ingresa otro monto"
                    [value]="monto() || ''"
                    (input)="monto.set(+$any($event.target).value)"
                  />
                </div>
              }

              <button
                class="sp-personal-services__btn sp-personal-services__btn--primary"
                [disabled]="!formularioValido()"
                (click)="consultarAdeudo()">
                Consultar adeudo
              </button>
            </div>

            <!-- Resultado de consulta -->
            @if (adeudoConsultado()) {
              <div class="sp-personal-services__adeudo-result">
                <div class="sp-personal-services__adeudo-label">Adeudo encontrado</div>
                <div class="sp-personal-services__adeudo-amount">
                  {{ adeudoMonto() | currency:'MXN':'symbol':'1.2-2' }}
                </div>
                @if (selectedService()?.category !== 'RECHARGE') {
                  <div class="sp-personal-services__adeudo-desc">
                    Incluye comisión de {{ COMMISSION | currency:'MXN':'symbol':'1.2-2' }} + IVA
                  </div>
                }
                <button
                  class="sp-personal-services__btn sp-personal-services__btn--success"
                  (click)="irAConfirmar()">
                  Pagar {{ adeudoMonto() | currency:'MXN':'symbol':'1.2-2' }} →
                </button>
              </div>
            }
          }

          <!-- STEP: confirm -->
          @if (step() === 'confirm') {
            <div class="sp-personal-services__confirm-card">
              <h3 class="sp-personal-services__confirm-title">¿Confirmas el pago?</h3>
              <div class="sp-personal-services__confirm-rows">
                <div class="sp-personal-services__confirm-row">
                  <span>Servicio</span>
                  <span>{{ selectedService()?.icon }} {{ selectedService()?.name }}</span>
                </div>
                @if (selectedProvider()) {
                  <div class="sp-personal-services__confirm-row">
                    <span>Proveedor</span>
                    <span>{{ selectedProvider()?.name }}</span>
                  </div>
                }
                <div class="sp-personal-services__confirm-row">
                  <span>{{ selectedService()?.category === 'RECHARGE' ? 'Número' : 'Cuenta' }}</span>
                  <span class="sp-personal-services__mono">{{ referencia() }}</span>
                </div>
                <div class="sp-personal-services__confirm-row sp-personal-services__confirm-row--total">
                  <span>Total a pagar</span>
                  <span>{{ adeudoMonto() | currency:'MXN':'symbol':'1.2-2' }}</span>
                </div>
              </div>
              <p class="sp-personal-services__confirm-note">
                El cargo se realizará desde tu cuenta personal.
              </p>
              <div class="sp-personal-services__confirm-actions">
                <button class="sp-personal-services__btn sp-personal-services__btn--outline" (click)="step.set('query')">
                  Cancelar
                </button>
                <button class="sp-personal-services__btn sp-personal-services__btn--success" (click)="confirmarPago()">
                  Confirmar pago
                </button>
              </div>
            </div>
          }

          <!-- STEP: done - Comprobante -->
          @if (step() === 'done') {
            <div class="sp-personal-services__receipt-card">
              <div class="sp-personal-services__receipt-icon">✅</div>
              <h3 class="sp-personal-services__receipt-title">Pago exitoso</h3>
              <div class="sp-personal-services__receipt-rows">
                <div class="sp-personal-services__receipt-row">
                  <span>Servicio</span>
                  <span>{{ selectedService()?.icon }} {{ selectedService()?.name }}</span>
                </div>
                <div class="sp-personal-services__receipt-row">
                  <span>{{ selectedService()?.category === 'RECHARGE' ? 'Número' : 'Cuenta' }}</span>
                  <span class="sp-personal-services__mono">{{ referencia() }}</span>
                </div>
                <div class="sp-personal-services__receipt-row">
                  <span>Monto pagado</span>
                  <span>{{ adeudoMonto() | currency:'MXN':'symbol':'1.2-2' }}</span>
                </div>
                <div class="sp-personal-services__receipt-row">
                  <span>ID de operación</span>
                  <span class="sp-personal-services__mono">{{ receiptId() }}</span>
                </div>
                <div class="sp-personal-services__receipt-row">
                  <span>Fecha</span>
                  <span>{{ receiptDate() | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>
              <button class="sp-personal-services__btn sp-personal-services__btn--primary" (click)="nuevoPago()">
                + Pagar otro servicio
              </button>
            </div>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    .sp-personal-services {
      padding: 20px 16px 40px;
      max-width: 520px;
      margin: 0 auto;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f0f4f8;
      min-height: 100vh;
    }

    /* Header */
    .sp-personal-services__header { margin-bottom: 20px; }
    .sp-personal-services__title { font-size: 22px; font-weight: 800; color: #2d3748; margin: 0 0 4px; }
    .sp-personal-services__subtitle { font-size: 13px; color: #718096; margin: 0; }

    /* Grid */
    .sp-personal-services__grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 12px; margin-bottom: 24px;
    }
    .sp-personal-services__service-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 12px; background: white; border: 1px solid #e2e8f0;
      border-radius: 14px; cursor: pointer; text-align: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: all 0.15s;
    }
    .sp-personal-services__service-card:hover {
      border-color: #bee3f8; transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(49,130,206,0.12);
    }
    .sp-personal-services__service-icon { font-size: 32px; }
    .sp-personal-services__service-name { font-size: 14px; font-weight: 700; color: #2d3748; }
    .sp-personal-services__service-desc { font-size: 11px; color: #a0aec0; }

    /* History section */
    .sp-personal-services__history-section {
      background: white; border-radius: 14px; padding: 16px;
      border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .sp-personal-services__history-title { font-size: 14px; font-weight: 700; color: #2d3748; margin: 0 0 12px; }
    .sp-personal-services__history-list { display: flex; flex-direction: column; gap: 0; }
    .sp-personal-services__history-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid #f7fafc;
    }
    .sp-personal-services__history-item:last-child { border-bottom: none; }
    .sp-personal-services__history-info { display: flex; flex-direction: column; gap: 2px; }
    .sp-personal-services__history-service { font-size: 13px; font-weight: 500; color: #2d3748; }
    .sp-personal-services__history-date { font-size: 11px; color: #a0aec0; }
    .sp-personal-services__history-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .sp-personal-services__history-amount { font-size: 13px; font-weight: 700; color: #2d3748; }

    /* Status badges */
    .sp-personal-services__status {
      padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;
    }
    .sp-personal-services__status--completed { background: #c6f6d5; color: #276749; }
    .sp-personal-services__status--failed { background: #fed7d7; color: #742a2a; }

    /* Pay panel */
    .sp-personal-services__pay-panel { display: flex; flex-direction: column; gap: 16px; }
    .sp-personal-services__pay-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 4px;
    }
    .sp-personal-services__back-btn {
      background: none; border: none; color: #3182ce; font-size: 14px;
      font-weight: 600; cursor: pointer; padding: 0;
    }
    .sp-personal-services__back-btn:hover { color: #2b6cb0; }
    .sp-personal-services__pay-service-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 700; color: #2d3748;
    }
    .sp-personal-services__pay-icon { font-size: 22px; }

    /* Form card */
    .sp-personal-services__form-card {
      background: white; border-radius: 14px; padding: 20px;
      border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; gap: 16px;
    }
    .sp-personal-services__form-group { display: flex; flex-direction: column; gap: 8px; }
    .sp-personal-services__label {
      font-size: 11px; font-weight: 700; color: #718096;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .sp-personal-services__input {
      padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px;
      font-size: 14px; outline: none; transition: border-color 0.15s; background: white;
    }
    .sp-personal-services__input:focus { border-color: #3182ce; }

    /* Provider chips */
    .sp-personal-services__provider-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .sp-personal-services__prov-chip {
      padding: 7px 16px; border: 1px solid #e2e8f0; border-radius: 20px;
      background: white; font-size: 13px; cursor: pointer; color: #4a5568;
      transition: all 0.15s;
    }
    .sp-personal-services__prov-chip.active { background: #ebf8ff; border-color: #3182ce; color: #2b6cb0; font-weight: 600; }

    /* Amount chips */
    .sp-personal-services__amount-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .sp-personal-services__amount-chip {
      padding: 7px 16px; border: 1px solid #e2e8f0; border-radius: 20px;
      background: white; font-size: 13px; font-weight: 500; cursor: pointer; color: #4a5568;
      transition: all 0.15s;
    }
    .sp-personal-services__amount-chip.active { background: #3182ce; color: white; border-color: #3182ce; }

    /* Adeudo result */
    .sp-personal-services__adeudo-result {
      background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 12px;
      padding: 20px; text-align: center; display: flex; flex-direction: column;
      align-items: center; gap: 8px;
    }
    .sp-personal-services__adeudo-label { font-size: 12px; color: #2b6cb0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .sp-personal-services__adeudo-amount { font-size: 28px; font-weight: 800; color: #2b6cb0; }
    .sp-personal-services__adeudo-desc { font-size: 11px; color: #718096; }

    /* Confirm card */
    .sp-personal-services__confirm-card {
      background: white; border-radius: 14px; padding: 20px;
      border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; gap: 16px;
    }
    .sp-personal-services__confirm-title { font-size: 16px; font-weight: 700; color: #2d3748; margin: 0; }
    .sp-personal-services__confirm-rows { display: flex; flex-direction: column; gap: 0; }
    .sp-personal-services__confirm-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid #f7fafc; font-size: 13px;
      color: #4a5568;
    }
    .sp-personal-services__confirm-row:last-child { border-bottom: none; }
    .sp-personal-services__confirm-row--total { font-weight: 700; font-size: 15px; color: #2d3748; padding-top: 14px; }
    .sp-personal-services__confirm-note { font-size: 11px; color: #a0aec0; margin: 0; }
    .sp-personal-services__confirm-actions { display: flex; gap: 10px; }

    /* Receipt card */
    .sp-personal-services__receipt-card {
      background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 14px;
      padding: 28px 20px; text-align: center; display: flex;
      flex-direction: column; align-items: center; gap: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .sp-personal-services__receipt-icon { font-size: 48px; }
    .sp-personal-services__receipt-title { font-size: 18px; font-weight: 800; color: #276749; margin: 0; }
    .sp-personal-services__receipt-rows {
      display: flex; flex-direction: column; gap: 0;
      width: 100%; max-width: 360px;
    }
    .sp-personal-services__receipt-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 0; border-bottom: 1px solid #c6f6d5; font-size: 13px; color: #2d3748;
    }
    .sp-personal-services__receipt-row:last-child { border-bottom: none; }
    .sp-personal-services__mono { font-family: monospace; font-size: 12px; }

    /* Buttons */
    .sp-personal-services__btn {
      padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 700;
      cursor: pointer; border: none; transition: all 0.15s; flex: 1;
    }
    .sp-personal-services__btn--primary { background: #3182ce; color: white; }
    .sp-personal-services__btn--primary:hover { background: #2b6cb0; }
    .sp-personal-services__btn--primary:disabled { background: #bee3f8; cursor: not-allowed; }
    .sp-personal-services__btn--success { background: #38a169; color: white; }
    .sp-personal-services__btn--success:hover { background: #2f855a; }
    .sp-personal-services__btn--outline { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-personal-services__btn--outline:hover { background: #f7fafc; }
  `],
})
export class ServicesPageComponent {
  readonly COMMISSION = 10.00;
  readonly rechargeAmounts = [50, 100, 150, 200, 300, 500];
  readonly services = SERVICES;

  readonly step = signal<ServiceStep>('select');
  readonly selectedService = signal<ServiceOption | null>(null);
  readonly selectedProvider = signal<ServiceProvider | null>(null);
  readonly referencia = signal<string>('');
  readonly monto = signal<number>(0);
  readonly adeudoConsultado = signal<boolean>(false);
  readonly adeudoMonto = signal<number>(0);
  readonly receiptId = signal<string>('');
  readonly receiptDate = signal<string>('');

  readonly history = signal<QuickHistory[]>(MOCK_HISTORY);

  readonly formularioValido = computed<boolean>(() => {
    const svc = this.selectedService();
    if (!svc) return false;
    if (svc.providers.length > 1 && !this.selectedProvider()) return false;
    if (this.referencia().trim().length < 4) return false;
    if (svc.showAmount && this.monto() <= 0) return false;
    return true;
  });

  seleccionarServicio(svc: ServiceOption): void {
    this.selectedService.set(svc);
    this.selectedProvider.set(svc.providers.length === 1 ? svc.providers[0] : null);
    this.referencia.set('');
    this.monto.set(0);
    this.adeudoConsultado.set(false);
    this.adeudoMonto.set(0);
    this.step.set('query');
  }

  consultarAdeudo(): void {
    const svc = this.selectedService();
    if (!svc) return;
    // Monto mock: si es recarga usa el monto ingresado, si no genera uno aleatorio
    const baseAmount = svc.showAmount
      ? this.monto()
      : parseFloat((Math.random() * 1500 + 200).toFixed(2));
    const commission = svc.showAmount ? 0 : this.COMMISSION;
    const iva = commission * 0.16;
    this.adeudoMonto.set(parseFloat((baseAmount + commission + iva).toFixed(2)));
    this.adeudoConsultado.set(true);
  }

  irAConfirmar(): void {
    this.step.set('confirm');
  }

  confirmarPago(): void {
    this.receiptId.set(`SVC-${Date.now()}`);
    this.receiptDate.set(new Date().toISOString());
    this.step.set('done');
  }

  volver(): void {
    if (this.step() === 'confirm') {
      this.step.set('query');
    } else {
      this.step.set('select');
      this.selectedService.set(null);
      this.selectedProvider.set(null);
      this.referencia.set('');
      this.monto.set(0);
      this.adeudoConsultado.set(false);
    }
  }

  nuevoPago(): void {
    this.step.set('select');
    this.selectedService.set(null);
    this.selectedProvider.set(null);
    this.referencia.set('');
    this.monto.set(0);
    this.adeudoConsultado.set(false);
    this.adeudoMonto.set(0);
  }
}
