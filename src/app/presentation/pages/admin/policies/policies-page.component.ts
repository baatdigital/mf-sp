/**
 * PoliciesPageComponent
 *
 * Gestion de politicas de transferencia del sistema:
 * limites diarios, restricciones horarias, montos maximos por tipo de operacion.
 * Permite activar/desactivar cada politica con un toggle.
 * EP-SP-008 US-SP-035
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

type PolicyType = 'LIMIT' | 'SCHEDULE' | 'RESTRICTION' | 'THRESHOLD' | 'APPROVAL';
type PolicyScope = 'GLOBAL' | 'ORG' | 'ACCOUNT';

interface TransferPolicy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  value: string;
  org_scope: PolicyScope;
  active: boolean;
  last_modified: string;
  modified_by: string;
}

const TYPE_CONFIG: Record<PolicyType, { label: string; icon: string; color: string }> = {
  LIMIT:       { label: 'Limite',       icon: '🔒', color: '#2b6cb0' },
  SCHEDULE:    { label: 'Horario',      icon: '🕐', color: '#553c9a' },
  RESTRICTION: { label: 'Restriccion', icon: '⛔', color: '#742a2a' },
  THRESHOLD:   { label: 'Umbral',      icon: '📊', color: '#276749' },
  APPROVAL:    { label: 'Aprobacion',  icon: '✅', color: '#744210' },
};

const SCOPE_CONFIG: Record<PolicyScope, { label: string; bg: string; color: string }> = {
  GLOBAL:  { label: 'Global',        bg: '#fed7d7', color: '#742a2a' },
  ORG:     { label: 'Organizacion',  bg: '#ebf8ff', color: '#2b6cb0' },
  ACCOUNT: { label: 'Cuenta',        bg: '#f0fff4', color: '#276749' },
};

@Component({
  selector: 'sp-admin-policies',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="sp-admin-policies">

      <!-- Header -->
      <div class="sp-admin-policies__header">
        <div>
          <h1 class="sp-admin-policies__title">Politicas de Transferencia</h1>
          <p class="sp-admin-policies__subtitle">
            Limites, horarios y restricciones aplicadas al sistema SPEI
          </p>
        </div>
        <button class="sp-admin-policies__add-btn">+ Nueva politica</button>
      </div>

      <!-- Resumen -->
      <div class="sp-admin-policies__summary">
        <div class="sp-admin-policies__summary-item">
          <span class="sp-admin-policies__summary-value">{{ totalCount() }}</span>
          <span class="sp-admin-policies__summary-label">Politicas totales</span>
        </div>
        <div class="sp-admin-policies__summary-item sp-admin-policies__summary-item--active">
          <span class="sp-admin-policies__summary-value">{{ activeCount() }}</span>
          <span class="sp-admin-policies__summary-label">Activas</span>
        </div>
        <div class="sp-admin-policies__summary-item sp-admin-policies__summary-item--inactive">
          <span class="sp-admin-policies__summary-value">{{ inactiveCount() }}</span>
          <span class="sp-admin-policies__summary-label">Inactivas</span>
        </div>
      </div>

      <!-- Filtro por tipo -->
      <div class="sp-admin-policies__type-filter">
        <button
          class="sp-admin-policies__type-chip"
          [class.sp-admin-policies__type-chip--active]="!selectedType()"
          (click)="selectedType.set(null)">
          Todas
        </button>
        @for (type of typeOptions; track type.value) {
          <button
            class="sp-admin-policies__type-chip"
            [class.sp-admin-policies__type-chip--active]="selectedType() === type.value"
            (click)="selectedType.set(type.value)">
            {{ type.icon }} {{ type.label }}
          </button>
        }
      </div>

      <!-- Lista de politicas -->
      <div class="sp-admin-policies__list">
        @if (filteredPolicies().length === 0) {
          <div class="sp-admin-policies__empty">
            No hay politicas del tipo seleccionado.
          </div>
        }
        @for (policy of filteredPolicies(); track policy.id) {
          <div
            class="sp-admin-policies__item"
            [class.sp-admin-policies__item--inactive]="!policy.active">

            <div class="sp-admin-policies__item-left">
              <div class="sp-admin-policies__item-icon"
                   [style.color]="typeCfg(policy.type).color">
                {{ typeCfg(policy.type).icon }}
              </div>
              <div class="sp-admin-policies__item-info">
                <div class="sp-admin-policies__item-name">{{ policy.name }}</div>
                <div class="sp-admin-policies__item-description">{{ policy.description }}</div>
                <div class="sp-admin-policies__item-meta">
                  <span
                    class="sp-admin-policies__type-badge"
                    [style.color]="typeCfg(policy.type).color">
                    {{ typeCfg(policy.type).label }}
                  </span>
                  <span
                    class="sp-admin-policies__scope-badge"
                    [style.background]="scopeCfg(policy.org_scope).bg"
                    [style.color]="scopeCfg(policy.org_scope).color">
                    {{ scopeCfg(policy.org_scope).label }}
                  </span>
                  <span class="sp-admin-policies__value-tag">
                    Valor: <strong>{{ policy.value }}</strong>
                  </span>
                  <span class="sp-admin-policies__modified">
                    Modificado: {{ policy.last_modified }} por {{ policy.modified_by }}
                  </span>
                </div>
              </div>
            </div>

            <div class="sp-admin-policies__item-right">
              <!-- Toggle activo/inactivo -->
              <button
                class="sp-admin-policies__toggle"
                [class.sp-admin-policies__toggle--on]="policy.active"
                (click)="togglePolicy(policy)"
                [title]="policy.active ? 'Desactivar politica' : 'Activar politica'">
                <span class="sp-admin-policies__toggle-knob"></span>
              </button>
              <span class="sp-admin-policies__toggle-label">
                {{ policy.active ? 'Activa' : 'Inactiva' }}
              </span>

              <!-- Acciones -->
              <div class="sp-admin-policies__actions">
                <button class="sp-admin-policies__action-btn" title="Editar">✏</button>
                <button class="sp-admin-policies__action-btn" title="Ver historial">📋</button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sp-admin-policies {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1100px;
    }

    /* Header */
    .sp-admin-policies__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .sp-admin-policies__title { margin: 0; font-size: 22px; font-weight: 700; color: #1a202c; }
    .sp-admin-policies__subtitle { margin: 4px 0 0; font-size: 13px; color: #718096; }
    .sp-admin-policies__add-btn {
      padding: 8px 18px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-policies__add-btn:hover { background: #2b6cb0; }

    /* Summary */
    .sp-admin-policies__summary {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 16px 20px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .sp-admin-policies__summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sp-admin-policies__summary-value {
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-policies__summary-label { font-size: 13px; color: #718096; }
    .sp-admin-policies__summary-item--active .sp-admin-policies__summary-value { color: #38a169; }
    .sp-admin-policies__summary-item--inactive .sp-admin-policies__summary-value { color: #a0aec0; }

    /* Type filter chips */
    .sp-admin-policies__type-filter {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .sp-admin-policies__type-chip {
      padding: 5px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      color: #4a5568;
    }
    .sp-admin-policies__type-chip:hover { background: #f7fafc; }
    .sp-admin-policies__type-chip--active {
      background: #3182ce;
      color: white;
      border-color: #3182ce;
    }

    /* List */
    .sp-admin-policies__list { display: flex; flex-direction: column; gap: 10px; }
    .sp-admin-policies__empty {
      text-align: center;
      padding: 32px;
      color: #a0aec0;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }

    /* Item */
    .sp-admin-policies__item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      transition: opacity 0.2s;
    }
    .sp-admin-policies__item--inactive {
      opacity: 0.6;
      background: #fafafa;
    }
    .sp-admin-policies__item-left { display: flex; align-items: flex-start; gap: 14px; flex: 1; }
    .sp-admin-policies__item-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }

    .sp-admin-policies__item-name {
      font-size: 14px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 3px;
    }
    .sp-admin-policies__item-description { font-size: 13px; color: #718096; margin-bottom: 8px; }
    .sp-admin-policies__item-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .sp-admin-policies__type-badge { font-size: 11px; font-weight: 600; }
    .sp-admin-policies__scope-badge {
      font-size: 10px;
      padding: 1px 8px;
      border-radius: 10px;
      font-weight: 700;
    }
    .sp-admin-policies__value-tag {
      font-size: 11px;
      background: #f7fafc;
      padding: 2px 8px;
      border-radius: 6px;
      color: #4a5568;
    }
    .sp-admin-policies__modified { font-size: 11px; color: #a0aec0; }

    /* Item right */
    .sp-admin-policies__item-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    /* Toggle */
    .sp-admin-policies__toggle {
      position: relative;
      width: 44px;
      height: 24px;
      border-radius: 12px;
      border: none;
      background: #e2e8f0;
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .sp-admin-policies__toggle--on { background: #38a169; }
    .sp-admin-policies__toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      transition: transform 0.2s;
      display: block;
    }
    .sp-admin-policies__toggle--on .sp-admin-policies__toggle-knob {
      transform: translateX(20px);
    }
    .sp-admin-policies__toggle-label { font-size: 12px; color: #718096; min-width: 48px; }

    /* Actions */
    .sp-admin-policies__actions { display: flex; gap: 4px; }
    .sp-admin-policies__action-btn {
      width: 28px;
      height: 28px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sp-admin-policies__action-btn:hover { background: #f7fafc; }
  `],
})
export class PoliciesPageComponent {

  readonly selectedType = signal<PolicyType | null>(null);

  readonly typeOptions = Object.entries(TYPE_CONFIG).map(([value, cfg]) => ({
    value: value as PolicyType,
    label: cfg.label,
    icon: cfg.icon,
  }));

  readonly policies = signal<TransferPolicy[]>([
    {
      id: 'POL-LIMIT-DAY',
      name: 'Limite diario por organizacion',
      description: 'Monto maximo de transferencias acumuladas en el dia por organizacion',
      type: 'LIMIT',
      value: '$750,000 MXN/dia',
      org_scope: 'ORG',
      active: true,
      last_modified: '2026-02-26',
      modified_by: 'root@superpago.mx',
    },
    {
      id: 'POL-LIMIT-TXN',
      name: 'Limite por transaccion individual',
      description: 'Monto maximo permitido en una sola transferencia SPEI',
      type: 'LIMIT',
      value: '$200,000 MXN',
      org_scope: 'GLOBAL',
      active: true,
      last_modified: '2026-01-10',
      modified_by: 'root@superpago.mx',
    },
    {
      id: 'POL-SCHEDULE-NOCTURNO',
      name: 'Restriccion horario nocturno',
      description: 'Transferencias suspendidas entre 23:00 y 06:00 (tiempo del centro de Mexico)',
      type: 'SCHEDULE',
      value: '23:00 - 06:00 CT',
      org_scope: 'GLOBAL',
      active: true,
      last_modified: '2025-11-20',
      modified_by: 'operaciones@superpago.mx',
    },
    {
      id: 'POL-THRESHOLD-ALERTA',
      name: 'Umbral de alerta por monto',
      description: 'Genera alerta automatica cuando una transferencia supera el umbral',
      type: 'THRESHOLD',
      value: '$100,000 MXN',
      org_scope: 'GLOBAL',
      active: true,
      last_modified: '2025-12-01',
      modified_by: 'root@superpago.mx',
    },
    {
      id: 'POL-APPROVAL-HIGH',
      name: 'Aprobacion dual para montos altos',
      description: 'Transferencias mayores a $50,000 requieren doble aprobacion',
      type: 'APPROVAL',
      value: '> $50,000 MXN',
      org_scope: 'ORG',
      active: true,
      last_modified: '2025-10-15',
      modified_by: 'root@superpago.mx',
    },
    {
      id: 'POL-RESTRICT-INTL',
      name: 'Bloqueo de cuentas internacionales',
      description: 'No se permiten transferencias a cuentas fuera del sistema SPEI mexicano',
      type: 'RESTRICTION',
      value: 'Solo CLABE 18 digitos MX',
      org_scope: 'GLOBAL',
      active: true,
      last_modified: '2024-09-01',
      modified_by: 'root@superpago.mx',
    },
    {
      id: 'POL-LIMIT-WEEKEND',
      name: 'Limite reducido en fin de semana',
      description: 'Limite diario reducido al 50% los sabados y domingos',
      type: 'LIMIT',
      value: '$375,000 MXN/dia (sab-dom)',
      org_scope: 'GLOBAL',
      active: false,
      last_modified: '2026-02-10',
      modified_by: 'operaciones@superpago.mx',
    },
  ]);

  readonly filteredPolicies = computed(() => {
    const type = this.selectedType();
    if (!type) return this.policies();
    return this.policies().filter((p) => p.type === type);
  });

  readonly totalCount = computed(() => this.policies().length);
  readonly activeCount = computed(() => this.policies().filter((p) => p.active).length);
  readonly inactiveCount = computed(() => this.policies().filter((p) => !p.active).length);

  typeCfg(type: PolicyType) {
    return TYPE_CONFIG[type] ?? TYPE_CONFIG['LIMIT'];
  }

  scopeCfg(scope: PolicyScope) {
    return SCOPE_CONFIG[scope] ?? SCOPE_CONFIG['GLOBAL'];
  }

  togglePolicy(policy: TransferPolicy): void {
    this.policies.update((list) =>
      list.map((p) => p.id === policy.id ? { ...p, active: !p.active } : p),
    );
  }
}
