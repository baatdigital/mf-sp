/**
 * TransferFormComponent
 *
 * Formulario de transferencia reutilizable para Business y Personal.
 * EP-SP-013: US-SP-049
 *
 * Business mode: wizard 3 pasos (origen → destino → confirmacion)
 * Personal mode: formulario simplificado de un solo paso
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TransferAccount {
  id: string;
  label: string;
  clabe: string;
  balance?: number;
  currency?: string;
}

export interface TransferBeneficiary {
  id: string;
  name: string;
  clabe: string;
  bank?: string;
  alias?: string;
}

export interface TransferParticipant {
  id: string;
  name: string;
  clabe: string;
  type: 'participant' | 'operator';
}

export interface TransferFormData {
  source_account_id: string;
  destination_clabe: string;
  destination_name?: string;
  amount: number;
  concept: string;
  reference?: string;
  save_beneficiary?: boolean;
}

export interface CommissionRequest {
  source_account_id: string;
  destination_clabe: string;
  amount: number;
}

export interface CommissionPreview {
  commission: number;
  iva: number;
  total: number;
  currency: string;
}

// Digito verificador CLABE
function clabeCheckDigit(clabe17: string): number {
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (parseInt(clabe17[i], 10) * weights[i]) % 10;
  }
  return (10 - (sum % 10)) % 10;
}

export function validateClabe(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  return clabeCheckDigit(clabe.slice(0, 17)) === parseInt(clabe[17], 10);
}

// Mapa simplificado de primeros 3 digitos de CLABE → banco
const CLABE_BANK_MAP: Record<string, string> = {
  '002': 'BBVA Bancomer',
  '006': 'Bancomext',
  '009': 'Banobras',
  '012': 'HSBC',
  '014': 'Santander',
  '021': 'HSBC',
  '030': 'Bajío',
  '032': 'IXE',
  '036': 'Inbursa',
  '037': 'Multiva',
  '042': 'Mifel',
  '044': 'ScotiaBank',
  '058': 'Banregio',
  '059': 'Invex',
  '060': 'Bansi',
  '062': 'Afirme',
  '072': 'Banorte',
  '102': 'ABN AMRO',
  '103': 'American Express',
  '106': 'BAMSA',
  '108': 'Tokyo',
  '110': 'JP Morgan',
  '112': 'Bansí',
  '113': 'Banco del Ejército',
  '116': 'ING',
  '124': 'Deutsche',
  '126': 'Credit Suisse',
  '127': 'Azteca',
  '128': 'Autofin',
  '129': 'Barclays',
  '130': 'Compartamos',
  '132': 'Multiva Clik',
  '133': 'Actinver',
  '134': 'Walmart',
  '135': 'Nafin',
  '136': 'Interbanco',
  '137': 'Bancoppel',
  '138': 'ABC Capital',
  '139': 'UBS Bank',
  '140': 'Consubanco',
  '141': 'Volkswagen',
  '143': 'CIBanco',
  '145': 'Bbase',
  '147': 'Bankaool',
  '148': 'PagaTodo',
  '149': 'Inmobiliario Mexicano',
  '155': 'ICBC',
  '156': 'Sabadell',
  '168': 'HIPOTECARIA FEDERAL',
  '600': 'Monexcb',
  '601': 'GBM',
  '602': 'Masari',
  '605': 'Valué',
  '606': 'Fondos de Acceso',
  '607': 'Base',
  '608': 'Fincomún',
  '610': 'HipoCasas',
  '611': 'VALMEX',
  '613': 'Multiva Clik',
  '616': 'Finamex',
  '617': 'VALORE',
  '618': 'Única',
  '619': 'MAPFRE',
  '620': 'Profuturo',
  '621': 'CB JP Morgan',
  '622': 'Actinver',
  '623': 'OACTIN',
  '626': 'CBDEUTSCHE',
  '627': 'Zurichvi',
  '628': 'SUMINISTRO',
  '629': 'EBI',
  '630': 'Intercam Banco',
  '631': 'CI Bolsa',
  '632': 'Bulltick CB',
  '633': 'Sterling',
  '634': 'Finpatria',
  '636': 'HDI SEGUROS',
  '637': 'Order',
  '638': 'Akala',
  '640': 'CB JP Morgan',
  '642': 'Reforma',
  '646': 'STP',
  '648': 'Evercore',
  '649': 'SKANDIA',
  '651': 'Seguro Ahorro Banorte',
  '652': 'ASEA',
  '653': 'Kuspit',
  '655': 'Sofiexpress',
  '656': 'Unagra',
  '659': 'ASP Integra OPC',
  '670': 'Libertad',
  '674': 'AXA',
  '677': 'Caja Pop Mexicana',
  '679': 'FND',
  '684': 'Transfer',
  '685': 'Fdeam',
  '686': 'INVERCAP',
  '689': 'FIRA',
  '699': 'Chevo',
  '706': 'Arcus',
  '710': 'Telecomunicaciones',
  '722': 'Mercado Pago',
  '723': 'Cuenca',
  '728': 'Spin by OXXO',
  '730': 'Nvio',
  '732': 'Pagos Intermex',
  '733': 'Intercam',
  '734': 'Transferwise',
  '736': 'Clip',
  '741': 'Pandai',
  '742': 'Ubaldo',
  '744': 'CODI Valida',
  '745': 'BABIEN',
  '746': 'STP',
  '747': 'Telecomunicaciones',
  '749': 'GFINTER',
  '812': 'Multiva Clik',
  '814': 'Fondo (FIRA)',
  '844': 'CODI Valida',
  '846': 'STP',
  '848': 'CODI Valida',
  '849': 'BBVA Bancomer',
  '897': 'CODI Valida',
  '899': 'CODI Valida',
};

export function getBankFromClabe(clabe: string): string {
  if (clabe.length < 3) return '';
  return CLABE_BANK_MAP[clabe.slice(0, 3)] ?? 'Banco desconocido';
}

type WizardStep = 'origen' | 'destino' | 'confirmacion';

@Component({
  selector: 'sp-transfer-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <div class="sp-transfer-form">

      <!-- Wizard steps (business mode) -->
      @if (mode() === 'business') {
        <div class="sp-transfer-form__wizard">
          @for (step of wizardSteps; track step.id; let i = $index) {
            <div [class]="wizardStepClass(step.id)">
              <div class="sp-transfer-form__wizard-bubble">
                @if (isStepDone(step.id)) {
                  <span>✓</span>
                } @else {
                  <span>{{ i + 1 }}</span>
                }
              </div>
              <span class="sp-transfer-form__wizard-label">{{ step.label }}</span>
            </div>
            @if (i < wizardSteps.length - 1) {
              <div class="sp-transfer-form__wizard-line"></div>
            }
          }
        </div>
      }

      <!-- STEP 1 / Personal: Cuenta origen -->
      @if (showStep('origen')) {
        <div class="sp-transfer-form__section">
          <h3 class="sp-transfer-form__section-title">Cuenta origen</h3>

          @if (fixedSourceAccount()) {
            <div class="sp-transfer-form__fixed-account">
              <span class="sp-transfer-form__label">Cuenta</span>
              <strong>{{ fixedSourceAccount()!.label }}</strong>
              <span class="sp-transfer-form__clabe">{{ fixedSourceAccount()!.clabe }}</span>
              @if (fixedSourceAccount()!.balance !== undefined) {
                <span class="sp-transfer-form__balance">
                  Saldo: {{ fixedSourceAccount()!.balance! | currency:'MXN':'symbol':'1.2-2' }}
                </span>
              }
            </div>
          } @else {
            <div class="sp-transfer-form__field">
              <label>Selecciona cuenta</label>
              <select [(ngModel)]="selectedSourceId" class="sp-transfer-form__select">
                <option value="">-- Selecciona --</option>
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.label }} · {{ acc.clabe }}</option>
                }
              </select>
            </div>
          }

          @if (selectedSource()) {
            <div class="sp-transfer-form__field">
              <label>Monto a transferir</label>
              <div class="sp-transfer-form__amount-wrap">
                <span class="sp-transfer-form__currency">$</span>
                <input
                  type="number"
                  [(ngModel)]="amount"
                  [max]="effectiveMaxAmount()"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  class="sp-transfer-form__input sp-transfer-form__input--amount"
                />
              </div>
              @if (amountError()) {
                <span class="sp-transfer-form__error">{{ amountError() }}</span>
              }
            </div>
          }

          @if (mode() === 'business') {
            <button
              class="sp-transfer-form__btn sp-transfer-form__btn--primary"
              [disabled]="!canProceedToDestino()"
              (click)="goToStep('destino')">
              Continuar
            </button>
          }
        </div>
      }

      <!-- STEP 2: Cuenta destino -->
      @if (showStep('destino')) {
        <div class="sp-transfer-form__section">
          <h3 class="sp-transfer-form__section-title">Cuenta destino</h3>

          <!-- Pestanas: CLABE manual / Beneficiario guardado / Participante -->
          <div class="sp-transfer-form__tabs">
            <button
              [class]="'sp-transfer-form__tab' + (destinoTab() === 'manual' ? ' active' : '')"
              (click)="destinoTab.set('manual')">Nueva CLABE</button>
            @if (beneficiaries().length > 0) {
              <button
                [class]="'sp-transfer-form__tab' + (destinoTab() === 'saved' ? ' active' : '')"
                (click)="destinoTab.set('saved')">Guardados ({{ beneficiaries().length }})</button>
            }
            @if (participants().length > 0) {
              <button
                [class]="'sp-transfer-form__tab' + (destinoTab() === 'participant' ? ' active' : '')"
                (click)="destinoTab.set('participant')">Participantes</button>
            }
          </div>

          @if (destinoTab() === 'manual') {
            <div class="sp-transfer-form__field">
              <label>CLABE interbancaria (18 dígitos)</label>
              <input
                type="text"
                [(ngModel)]="destinationClabe"
                maxlength="18"
                placeholder="000000000000000000"
                class="sp-transfer-form__input"
                [class.sp-transfer-form__input--valid]="clabeValid()"
                [class.sp-transfer-form__input--error]="destinationClabe.length === 18 && !clabeValid()"
              />
              @if (destinationClabe.length >= 3) {
                <span class="sp-transfer-form__bank-hint">{{ detectedBank() }}</span>
              }
              @if (destinationClabe.length === 18 && !clabeValid()) {
                <span class="sp-transfer-form__error">CLABE inválida (dígito verificador incorrecto)</span>
              }
            </div>
            <div class="sp-transfer-form__field">
              <label>Nombre del beneficiario</label>
              <input
                type="text"
                [(ngModel)]="destinationName"
                placeholder="Nombre completo"
                class="sp-transfer-form__input"
              />
            </div>
            @if (clabeValid()) {
              <label class="sp-transfer-form__checkbox-label">
                <input type="checkbox" [(ngModel)]="saveBeneficiary" />
                Guardar como beneficiario
              </label>
            }
          }

          @if (destinoTab() === 'saved') {
            <div class="sp-transfer-form__beneficiary-list">
              @for (b of beneficiaries(); track b.id) {
                <div
                  [class]="'sp-transfer-form__beneficiary-item' + (selectedBeneficiaryId === b.id ? ' selected' : '')"
                  (click)="selectBeneficiary(b)">
                  <strong>{{ b.alias ?? b.name }}</strong>
                  <span>{{ b.clabe }}</span>
                  @if (b.bank) { <span class="sp-transfer-form__bank-hint">{{ b.bank }}</span> }
                </div>
              }
            </div>
          }

          @if (destinoTab() === 'participant') {
            <div class="sp-transfer-form__beneficiary-list">
              @for (p of participants(); track p.id) {
                <div
                  [class]="'sp-transfer-form__beneficiary-item' + (selectedBeneficiaryId === p.id ? ' selected' : '')"
                  (click)="selectParticipant(p)">
                  <strong>{{ p.name }}</strong>
                  <span>{{ p.clabe }}</span>
                  <span class="sp-transfer-form__bank-hint">{{ p.type }}</span>
                </div>
              }
            </div>
          }

          @if (mode() === 'business') {
            <div class="sp-transfer-form__nav">
              <button class="sp-transfer-form__btn" (click)="goToStep('origen')">Atrás</button>
              <button
                class="sp-transfer-form__btn sp-transfer-form__btn--primary"
                [disabled]="!canProceedToConfirmacion()"
                (click)="proceedToConfirmacion()">
                Continuar
              </button>
            </div>
          }
        </div>
      }

      <!-- Concepto y referencia (personal y business en destino / ultimo paso) -->
      @if (showStep('concepto')) {
        <div class="sp-transfer-form__section">
          <div class="sp-transfer-form__field">
            <label>Concepto</label>
            <input
              type="text"
              [(ngModel)]="concept"
              maxlength="40"
              placeholder="Ej. Pago de nómina"
              class="sp-transfer-form__input"
            />
            <span class="sp-transfer-form__hint">{{ concept.length }}/40</span>
          </div>
          <div class="sp-transfer-form__field">
            <label>Referencia <span class="sp-transfer-form__optional">(opcional)</span></label>
            <input
              type="text"
              [(ngModel)]="reference"
              maxlength="7"
              placeholder="Ej. 1234567"
              class="sp-transfer-form__input"
            />
          </div>
        </div>
      }

      <!-- STEP 3 / Personal confirmacion: Resumen -->
      @if (showStep('confirmacion')) {
        <div class="sp-transfer-form__section">
          <h3 class="sp-transfer-form__section-title">Confirmar transferencia</h3>

          <div class="sp-transfer-form__summary">
            <div class="sp-transfer-form__summary-row">
              <span>Origen</span>
              <strong>{{ selectedSource()?.label ?? fixedSourceAccount()?.label }}</strong>
            </div>
            <div class="sp-transfer-form__summary-row">
              <span>Destino CLABE</span>
              <strong>{{ destinationClabe }}</strong>
            </div>
            @if (destinationName) {
              <div class="sp-transfer-form__summary-row">
                <span>Beneficiario</span>
                <strong>{{ destinationName }}</strong>
              </div>
            }
            <div class="sp-transfer-form__summary-row">
              <span>Monto</span>
              <strong>{{ amount | currency:'MXN':'symbol':'1.2-2' }}</strong>
            </div>
            @if (commissionPreview()) {
              <div class="sp-transfer-form__summary-row sp-transfer-form__summary-row--commission">
                <span>Comisión + IVA</span>
                <strong>{{ commissionPreview()!.commission + commissionPreview()!.iva | currency:'MXN':'symbol':'1.2-2' }}</strong>
              </div>
              <div class="sp-transfer-form__summary-row sp-transfer-form__summary-row--total">
                <span>Total a descontar</span>
                <strong>{{ commissionPreview()!.total | currency:'MXN':'symbol':'1.2-2' }}</strong>
              </div>
            }
            @if (concept) {
              <div class="sp-transfer-form__summary-row">
                <span>Concepto</span>
                <strong>{{ concept }}</strong>
              </div>
            }
            @if (reference) {
              <div class="sp-transfer-form__summary-row">
                <span>Referencia</span>
                <strong>{{ reference }}</strong>
              </div>
            }
          </div>

          @if (mode() === 'business') {
            <div class="sp-transfer-form__nav">
              <button class="sp-transfer-form__btn" (click)="goToStep('destino')">Atrás</button>
              <button
                class="sp-transfer-form__btn sp-transfer-form__btn--submit"
                [disabled]="submitting()"
                (click)="submit()">
                @if (submitting()) { Enviando... } @else { Confirmar y transferir }
              </button>
            </div>
          } @else {
            <button
              class="sp-transfer-form__btn sp-transfer-form__btn--submit"
              [disabled]="submitting() || !canSubmitPersonal()"
              (click)="submit()">
              @if (submitting()) { Enviando... } @else { Transferir }
            </button>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-transfer-form { font-family: system-ui, sans-serif; max-width: 520px; }

    /* Wizard */
    .sp-transfer-form__wizard { display: flex; align-items: center; margin-bottom: 24px; }
    .sp-transfer-form__wizard-step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .sp-transfer-form__wizard-bubble {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid #cbd5e0;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; background: white; color: #718096;
    }
    .sp-transfer-form__wizard-step.active .sp-transfer-form__wizard-bubble { border-color: #3182ce; color: #3182ce; }
    .sp-transfer-form__wizard-step.done .sp-transfer-form__wizard-bubble { background: #38a169; border-color: #38a169; color: white; }
    .sp-transfer-form__wizard-label { font-size: 10px; color: #718096; white-space: nowrap; }
    .sp-transfer-form__wizard-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 6px 14px; }

    /* Section */
    .sp-transfer-form__section { margin-bottom: 16px; }
    .sp-transfer-form__section-title { font-size: 15px; font-weight: 700; color: #2d3748; margin-bottom: 16px; }

    /* Fields */
    .sp-transfer-form__field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .sp-transfer-form__field label { font-size: 12px; font-weight: 600; color: #4a5568; }
    .sp-transfer-form__input {
      padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    .sp-transfer-form__input:focus { border-color: #3182ce; }
    .sp-transfer-form__input--valid { border-color: #38a169; }
    .sp-transfer-form__input--error { border-color: #e53e3e; }
    .sp-transfer-form__select {
      padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 14px; background: white;
    }
    .sp-transfer-form__amount-wrap { display: flex; align-items: center; gap: 4px; }
    .sp-transfer-form__currency { font-size: 16px; font-weight: 700; color: #4a5568; }
    .sp-transfer-form__input--amount { width: 100%; font-size: 22px; font-weight: 700; }
    .sp-transfer-form__hint { font-size: 11px; color: #a0aec0; }
    .sp-transfer-form__bank-hint { font-size: 11px; color: #667eea; font-style: italic; }
    .sp-transfer-form__error { font-size: 11px; color: #e53e3e; }
    .sp-transfer-form__optional { font-weight: 400; color: #a0aec0; }

    /* Fixed account */
    .sp-transfer-form__fixed-account {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 14px; background: #f7fafc; border-radius: 8px; margin-bottom: 12px;
    }
    .sp-transfer-form__label { font-size: 11px; color: #718096; }
    .sp-transfer-form__clabe { font-size: 12px; color: #718096; font-family: monospace; }
    .sp-transfer-form__balance { font-size: 13px; color: #38a169; font-weight: 600; }

    /* Tabs */
    .sp-transfer-form__tabs { display: flex; gap: 8px; margin-bottom: 14px; }
    .sp-transfer-form__tab {
      padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 20px;
      font-size: 12px; cursor: pointer; background: white; color: #4a5568;
    }
    .sp-transfer-form__tab.active { background: #3182ce; color: white; border-color: #3182ce; }

    /* Beneficiarios */
    .sp-transfer-form__beneficiary-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .sp-transfer-form__beneficiary-item {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;
    }
    .sp-transfer-form__beneficiary-item:hover { border-color: #3182ce; }
    .sp-transfer-form__beneficiary-item.selected { border-color: #3182ce; background: #ebf8ff; }
    .sp-transfer-form__beneficiary-item strong { font-size: 13px; color: #2d3748; }
    .sp-transfer-form__beneficiary-item span { font-size: 12px; color: #718096; font-family: monospace; }

    /* Checkbox */
    .sp-transfer-form__checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }

    /* Summary */
    .sp-transfer-form__summary { background: #f7fafc; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .sp-transfer-form__summary-row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px solid #edf2f7; }
    .sp-transfer-form__summary-row:last-child { border-bottom: none; }
    .sp-transfer-form__summary-row span { color: #718096; }
    .sp-transfer-form__summary-row--commission strong { color: #ed8936; }
    .sp-transfer-form__summary-row--total strong { color: #3182ce; font-size: 15px; }

    /* Buttons */
    .sp-transfer-form__nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 16px; }
    .sp-transfer-form__btn {
      padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0;
      font-size: 14px; cursor: pointer; background: white; color: #4a5568;
    }
    .sp-transfer-form__btn--primary { background: #3182ce; color: white; border-color: #3182ce; }
    .sp-transfer-form__btn--primary:disabled { background: #a0aec0; border-color: #a0aec0; cursor: not-allowed; }
    .sp-transfer-form__btn--submit { background: #38a169; color: white; border-color: #38a169; width: 100%; font-size: 15px; font-weight: 700; }
    .sp-transfer-form__btn--submit:disabled { background: #a0aec0; border-color: #a0aec0; cursor: not-allowed; }
  `],
})
export class TransferFormComponent {
  // Inputs
  mode = input<'business' | 'personal'>('personal');
  accounts = input<TransferAccount[]>([]);
  beneficiaries = input<TransferBeneficiary[]>([]);
  participants = input<TransferParticipant[]>([]);
  commissionPreview = input<CommissionPreview | null>(null);
  fixedSourceAccount = input<TransferAccount | null>(null);
  maxAmount = input<number | null>(null);

  // Outputs
  submit_event = output<TransferFormData>({ alias: 'submit' });
  commissionRequest = output<CommissionRequest>();
  saveBeneficiaryEvent = output<{ name: string; clabe: string }>({ alias: 'saveBeneficiary' });

  // Wizard state
  readonly currentStep = signal<WizardStep>('origen');
  readonly submitting = signal(false);

  readonly wizardSteps = [
    { id: 'origen' as WizardStep, label: 'Origen' },
    { id: 'destino' as WizardStep, label: 'Destino' },
    { id: 'confirmacion' as WizardStep, label: 'Confirmar' },
  ];

  // Form state
  selectedSourceId = '';
  destinationClabe = '';
  destinationName = '';
  amount = 0;
  concept = '';
  reference = '';
  saveBeneficiary = false;
  selectedBeneficiaryId = '';

  readonly destinoTab = signal<'manual' | 'saved' | 'participant'>('manual');

  // Computed
  readonly selectedSource = computed<TransferAccount | null>(() => {
    if (this.fixedSourceAccount()) return this.fixedSourceAccount();
    return this.accounts().find((a) => a.id === this.selectedSourceId) ?? null;
  });

  readonly effectiveMaxAmount = computed(() => {
    if (this.maxAmount() !== null) return this.maxAmount()!;
    return this.selectedSource()?.balance ?? Infinity;
  });

  readonly clabeValid = computed(() => validateClabe(this.destinationClabe));
  readonly detectedBank = computed(() => getBankFromClabe(this.destinationClabe));

  readonly amountError = computed<string>(() => {
    if (this.amount <= 0) return '';
    if (this.amount > this.effectiveMaxAmount()) return `Máximo disponible: $${this.effectiveMaxAmount().toFixed(2)}`;
    return '';
  });

  // Step visibility
  showStep(step: 'origen' | 'destino' | 'concepto' | 'confirmacion'): boolean {
    if (this.mode() === 'personal') {
      return ['origen', 'destino', 'concepto', 'confirmacion'].includes(step);
    }
    // Business wizard
    if (step === 'origen') return this.currentStep() === 'origen';
    if (step === 'destino') return this.currentStep() === 'destino';
    if (step === 'concepto') return this.currentStep() === 'destino';
    if (step === 'confirmacion') return this.currentStep() === 'confirmacion';
    return false;
  }

  wizardStepClass(step: WizardStep): string {
    const stepOrder = { origen: 0, destino: 1, confirmacion: 2 };
    const current = stepOrder[this.currentStep()];
    const target = stepOrder[step];
    if (target < current) return 'sp-transfer-form__wizard-step done';
    if (target === current) return 'sp-transfer-form__wizard-step active';
    return 'sp-transfer-form__wizard-step';
  }

  isStepDone(step: WizardStep): boolean {
    const stepOrder = { origen: 0, destino: 1, confirmacion: 2 };
    return stepOrder[step] < stepOrder[this.currentStep()];
  }

  canProceedToDestino(): boolean {
    const hasSource = !!this.selectedSource();
    const validAmount = this.amount > 0 && !this.amountError();
    return hasSource && validAmount;
  }

  canProceedToConfirmacion(): boolean {
    return this.clabeValid() && this.destinationClabe.length === 18;
  }

  canSubmitPersonal(): boolean {
    return (
      !!this.selectedSource() &&
      this.amount > 0 &&
      !this.amountError() &&
      this.clabeValid() &&
      this.concept.length > 0
    );
  }

  goToStep(step: WizardStep): void {
    this.currentStep.set(step);
  }

  proceedToConfirmacion(): void {
    if (!this.canProceedToConfirmacion()) return;
    this.currentStep.set('confirmacion');
    // Solicitar vista previa de comision
    this.commissionRequest.emit({
      source_account_id: this.selectedSource()!.id,
      destination_clabe: this.destinationClabe,
      amount: this.amount,
    });
  }

  selectBeneficiary(b: TransferBeneficiary): void {
    this.selectedBeneficiaryId = b.id;
    this.destinationClabe = b.clabe;
    this.destinationName = b.name;
  }

  selectParticipant(p: TransferParticipant): void {
    this.selectedBeneficiaryId = p.id;
    this.destinationClabe = p.clabe;
    this.destinationName = p.name;
  }

  submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);

    const sourceId = this.fixedSourceAccount()?.id ?? this.selectedSourceId;

    const data: TransferFormData = {
      source_account_id: sourceId,
      destination_clabe: this.destinationClabe,
      destination_name: this.destinationName || undefined,
      amount: this.amount,
      concept: this.concept,
      reference: this.reference || undefined,
      save_beneficiary: this.saveBeneficiary || undefined,
    };

    if (this.saveBeneficiary && this.destinationName) {
      this.saveBeneficiaryEvent.emit({ name: this.destinationName, clabe: this.destinationClabe });
    }

    this.submit_event.emit(data);
    this.submitting.set(false);
  }
}
