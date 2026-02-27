/**
 * BillPayProvidersPageComponent
 *
 * Modulo de administracion de proveedores BillPay.
 * Permite visualizar, filtrar por categoria y activar/desactivar
 * los proveedores de servicios disponibles en la plataforma.
 * EP-SP-025
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

type ProviderCategory = 'TELECOM' | 'UTILITIES' | 'GOVT' | 'RETAIL' | 'INSURANCE';

interface BillPayProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  is_active: boolean;
  icon: string;
  fee_pct: number;
}

const CATEGORY_CONFIG: Record<ProviderCategory, { label: string; bg: string; color: string }> = {
  TELECOM:   { label: 'Telecom',    bg: '#ebf8ff', color: '#2b6cb0' },
  UTILITIES: { label: 'Servicios',  bg: '#f0fff4', color: '#276749' },
  GOVT:      { label: 'Gobierno',   bg: '#fefcbf', color: '#744210' },
  RETAIL:    { label: 'Retail',     bg: '#faf5ff', color: '#553c9a' },
  INSURANCE: { label: 'Seguros',    bg: '#fff5f5', color: '#742a2a' },
};

const MOCK_PROVIDERS: BillPayProvider[] = [
  { id: 'cfe',       name: 'CFE',          category: 'UTILITIES', is_active: true,  icon: '⚡', fee_pct: 0.5  },
  { id: 'telmex',    name: 'Telmex',       category: 'TELECOM',   is_active: true,  icon: '📞', fee_pct: 0.8  },
  { id: 'telcel',    name: 'Telcel',       category: 'TELECOM',   is_active: true,  icon: '📱', fee_pct: 0.8  },
  { id: 'izzi',      name: 'IZZI',         category: 'TELECOM',   is_active: true,  icon: '📡', fee_pct: 0.7  },
  { id: 'gas',       name: 'Gas Natural',  category: 'UTILITIES', is_active: false, icon: '🔥', fee_pct: 0.5  },
  { id: 'imss',      name: 'IMSS',         category: 'GOVT',      is_active: true,  icon: '🏥', fee_pct: 0.0  },
  { id: 'sat',       name: 'SAT',          category: 'GOVT',      is_active: true,  icon: '🏛️', fee_pct: 0.0  },
  { id: 'oxxopay',   name: 'OXXO Pay',     category: 'RETAIL',    is_active: true,  icon: '🏪', fee_pct: 1.2  },
  { id: 'sky',       name: 'Sky',          category: 'TELECOM',   is_active: false, icon: '🛰️', fee_pct: 0.9  },
  { id: 'megacable', name: 'Megacable',    category: 'TELECOM',   is_active: true,  icon: '📺', fee_pct: 0.7  },
];

@Component({
  selector: 'sp-admin-billpay-providers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="sp-admin-billpay-providers">

      <!-- Header -->
      <div class="sp-admin-billpay-providers__header">
        <div>
          <h1 class="sp-admin-billpay-providers__title">Proveedores BillPay</h1>
          <p class="sp-admin-billpay-providers__subtitle">
            Catalogo de proveedores de servicios disponibles para pago de recibos
          </p>
        </div>
        <div class="sp-admin-billpay-providers__header-actions">
          <button class="sp-admin-billpay-providers__btn-secondary" (click)="syncCatalog()">
            ↻ Sincronizar catalogo
          </button>
          <button class="sp-admin-billpay-providers__btn-primary">
            + Agregar proveedor
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="sp-admin-billpay-providers__summary">
        <div class="sp-admin-billpay-providers__summary-card sp-admin-billpay-providers__summary-card--success">
          <span class="sp-admin-billpay-providers__summary-count">{{ activeCount() }}</span>
          <span class="sp-admin-billpay-providers__summary-label">Activos</span>
        </div>
        <div class="sp-admin-billpay-providers__summary-card sp-admin-billpay-providers__summary-card--danger">
          <span class="sp-admin-billpay-providers__summary-count">{{ inactiveCount() }}</span>
          <span class="sp-admin-billpay-providers__summary-label">Inactivos</span>
        </div>
        <div class="sp-admin-billpay-providers__summary-card">
          <span class="sp-admin-billpay-providers__summary-count">{{ categoryCount() }}</span>
          <span class="sp-admin-billpay-providers__summary-label">Categorias</span>
        </div>
        <div class="sp-admin-billpay-providers__summary-card">
          <span class="sp-admin-billpay-providers__summary-count">{{ providers().length }}</span>
          <span class="sp-admin-billpay-providers__summary-label">Total proveedores</span>
        </div>
      </div>

      <!-- Tabla -->
      <div class="sp-admin-billpay-providers__table-wrap">
        <div class="sp-admin-billpay-providers__table-header">
          <span class="sp-admin-billpay-providers__table-title">
            Proveedores ({{ filteredProviders().length }})
          </span>
          <select class="sp-admin-billpay-providers__filter-select"
                  (change)="onFilterCategory($event)">
            <option value="">Todas las categorias</option>
            <option value="TELECOM">Telecom</option>
            <option value="UTILITIES">Servicios</option>
            <option value="GOVT">Gobierno</option>
            <option value="RETAIL">Retail</option>
            <option value="INSURANCE">Seguros</option>
          </select>
        </div>

        <table class="sp-admin-billpay-providers__table">
          <thead>
            <tr>
              <th>Icono</th>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Comision %</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (filteredProviders().length === 0) {
              <tr>
                <td colspan="6" class="sp-admin-billpay-providers__empty">
                  No hay proveedores con los filtros actuales.
                </td>
              </tr>
            }
            @for (p of filteredProviders(); track p.id) {
              <tr class="sp-admin-billpay-providers__row"
                  [class.sp-admin-billpay-providers__row--inactive]="!p.is_active">
                <td class="sp-admin-billpay-providers__cell--icon">{{ p.icon }}</td>
                <td class="sp-admin-billpay-providers__cell--name">{{ p.name }}</td>
                <td>
                  <span class="sp-admin-billpay-providers__category-badge"
                        [style.background]="categoryCfg(p.category).bg"
                        [style.color]="categoryCfg(p.category).color">
                    {{ categoryCfg(p.category).label }}
                  </span>
                </td>
                <td class="sp-admin-billpay-providers__cell--fee">
                  {{ p.fee_pct | number:'1.1-2' }}%
                </td>
                <td>
                  <span class="sp-admin-billpay-providers__status-badge"
                        [class.sp-admin-billpay-providers__status-badge--active]="p.is_active"
                        [class.sp-admin-billpay-providers__status-badge--inactive]="!p.is_active">
                    {{ p.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="sp-admin-billpay-providers__actions">
                    <button
                      class="sp-admin-billpay-providers__action-btn"
                      [class.sp-admin-billpay-providers__action-btn--activate]="!p.is_active"
                      [class.sp-admin-billpay-providers__action-btn--deactivate]="p.is_active"
                      (click)="toggleActive(p)">
                      {{ p.is_active ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button class="sp-admin-billpay-providers__action-btn" (click)="editProvider(p)">
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .sp-admin-billpay-providers {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-billpay-providers__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .sp-admin-billpay-providers__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-billpay-providers__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }
    .sp-admin-billpay-providers__header-actions { display: flex; gap: 8px; }
    .sp-admin-billpay-providers__btn-primary {
      padding: 8px 16px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-billpay-providers__btn-primary:hover { background: #2b6cb0; }
    .sp-admin-billpay-providers__btn-secondary {
      padding: 8px 16px;
      background: white;
      color: #4a5568;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .sp-admin-billpay-providers__btn-secondary:hover { background: #f7fafc; }

    /* Summary */
    .sp-admin-billpay-providers__summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .sp-admin-billpay-providers__summary-card {
      flex: 1;
      min-width: 140px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .sp-admin-billpay-providers__summary-card--success { border-left: 4px solid #38a169; }
    .sp-admin-billpay-providers__summary-card--danger  { border-left: 4px solid #e53e3e; }
    .sp-admin-billpay-providers__summary-count {
      font-size: 26px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-billpay-providers__summary-label { font-size: 12px; color: #718096; }

    /* Table */
    .sp-admin-billpay-providers__table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-billpay-providers__table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-admin-billpay-providers__table-title { font-size: 15px; font-weight: 600; color: #2d3748; }
    .sp-admin-billpay-providers__filter-select {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
    .sp-admin-billpay-providers__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-billpay-providers__table thead tr { background: #f7fafc; }
    .sp-admin-billpay-providers__table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-billpay-providers__table td {
      padding: 12px 14px;
      border-top: 1px solid #f0f4f8;
      color: #2d3748;
      vertical-align: middle;
    }
    .sp-admin-billpay-providers__row:hover { background: #f7fafc; }
    .sp-admin-billpay-providers__row--inactive { opacity: 0.6; }
    .sp-admin-billpay-providers__empty {
      text-align: center;
      padding: 32px !important;
      color: #a0aec0;
    }

    /* Cells */
    .sp-admin-billpay-providers__cell--icon { font-size: 20px; }
    .sp-admin-billpay-providers__cell--name { font-weight: 600; color: #1a202c; }
    .sp-admin-billpay-providers__cell--fee  { font-weight: 600; font-family: monospace; }

    /* Badges */
    .sp-admin-billpay-providers__category-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .sp-admin-billpay-providers__status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .sp-admin-billpay-providers__status-badge--active   { background: #c6f6d5; color: #276749; }
    .sp-admin-billpay-providers__status-badge--inactive { background: #fed7d7; color: #742a2a; }

    /* Actions */
    .sp-admin-billpay-providers__actions { display: flex; gap: 4px; }
    .sp-admin-billpay-providers__action-btn {
      padding: 4px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 11px;
      color: #4a5568;
      white-space: nowrap;
    }
    .sp-admin-billpay-providers__action-btn:hover { background: #f7fafc; }
    .sp-admin-billpay-providers__action-btn--activate {
      background: #f0fff4;
      border-color: #9ae6b4;
      color: #276749;
      font-weight: 600;
    }
    .sp-admin-billpay-providers__action-btn--activate:hover { background: #c6f6d5; }
    .sp-admin-billpay-providers__action-btn--deactivate {
      background: #fff5f5;
      border-color: #feb2b2;
      color: #742a2a;
      font-weight: 600;
    }
    .sp-admin-billpay-providers__action-btn--deactivate:hover { background: #fed7d7; }
  `],
})
export class BillPayProvidersPageComponent {

  readonly filterCategory = signal<ProviderCategory | ''>('');

  readonly providers = signal<BillPayProvider[]>(MOCK_PROVIDERS);

  readonly filteredProviders = computed(() => {
    const cat = this.filterCategory();
    if (!cat) return this.providers();
    return this.providers().filter((p) => p.category === cat);
  });

  readonly activeCount = computed(() =>
    this.providers().filter((p) => p.is_active).length,
  );

  readonly inactiveCount = computed(() =>
    this.providers().filter((p) => !p.is_active).length,
  );

  readonly categoryCount = computed(() => {
    const cats = new Set(this.providers().map((p) => p.category));
    return cats.size;
  });

  categoryCfg(category: ProviderCategory) {
    return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['RETAIL'];
  }

  onFilterCategory(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as ProviderCategory | '';
    this.filterCategory.set(val);
  }

  toggleActive(provider: BillPayProvider): void {
    this.providers.update((items) =>
      items.map((p) =>
        p.id === provider.id ? { ...p, is_active: !p.is_active } : p,
      ),
    );
    console.log(`[BillPayProviders] Toggle proveedor ${provider.name}: ${!provider.is_active}`);
  }

  editProvider(provider: BillPayProvider): void {
    console.log('[BillPayProviders] Editar proveedor:', provider);
  }

  syncCatalog(): void {
    console.log('[BillPayProviders] Sincronizando catalogo de proveedores...');
  }
}
