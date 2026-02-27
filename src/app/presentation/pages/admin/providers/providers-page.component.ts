/**
 * ProvidersPageComponent
 *
 * Gestion de proveedores SPEI del sistema (STP, FINCH, Banxico, etc.).
 * Permite visualizar estado, metricas de exito y sincronizar configuracion.
 * EP-SP-008 US-SP-032
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

type ProviderStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'MAINTENANCE';

interface SpeiProvider {
  id: string;
  name: string;
  code: string;
  status: ProviderStatus;
  last_sync: string;
  success_rate: number;
  avg_latency_ms: number;
  daily_volume: number;
  endpoint_url: string;
  is_primary: boolean;
}

const STATUS_CONFIG: Record<ProviderStatus, { label: string; bg: string; color: string; dot: string }> = {
  OPERATIONAL: { label: 'Operacional', bg: '#c6f6d5', color: '#276749', dot: '#38a169' },
  DEGRADED:    { label: 'Degradado',   bg: '#fefcbf', color: '#744210', dot: '#d69e2e' },
  DOWN:        { label: 'Caido',       bg: '#fed7d7', color: '#742a2a', dot: '#e53e3e' },
  MAINTENANCE: { label: 'Mantenimiento', bg: '#e9d8fd', color: '#553c9a', dot: '#805ad5' },
};

@Component({
  selector: 'sp-admin-providers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="sp-admin-providers">

      <!-- Header -->
      <div class="sp-admin-providers__header">
        <div>
          <h1 class="sp-admin-providers__title">Proveedores SPEI</h1>
          <p class="sp-admin-providers__subtitle">
            Conectores activos hacia la infraestructura interbancaria
          </p>
        </div>
        <button class="sp-admin-providers__btn-primary" (click)="syncAll()">
          ↻ Sincronizar todos
        </button>
      </div>

      <!-- Cards de proveedores -->
      <div class="sp-admin-providers__grid">
        @for (provider of providers(); track provider.id) {
          <div class="sp-admin-providers__card"
               [class.sp-admin-providers__card--primary]="provider.is_primary">

            <div class="sp-admin-providers__card-header">
              <div class="sp-admin-providers__card-identity">
                <span class="sp-admin-providers__provider-code">{{ provider.code }}</span>
                @if (provider.is_primary) {
                  <span class="sp-admin-providers__primary-badge">Principal</span>
                }
              </div>
              <span
                class="sp-admin-providers__status-badge"
                [style.background]="statusCfg(provider.status).bg"
                [style.color]="statusCfg(provider.status).color">
                <span
                  class="sp-admin-providers__status-dot"
                  [style.background]="statusCfg(provider.status).dot">
                </span>
                {{ statusCfg(provider.status).label }}
              </span>
            </div>

            <h3 class="sp-admin-providers__provider-name">{{ provider.name }}</h3>
            <p class="sp-admin-providers__provider-url">{{ provider.endpoint_url }}</p>

            <div class="sp-admin-providers__metrics">
              <div class="sp-admin-providers__metric">
                <span class="sp-admin-providers__metric-value"
                      [class.sp-admin-providers__metric-value--good]="provider.success_rate >= 99"
                      [class.sp-admin-providers__metric-value--warn]="provider.success_rate >= 95 && provider.success_rate < 99"
                      [class.sp-admin-providers__metric-value--bad]="provider.success_rate < 95">
                  {{ provider.success_rate | number:'1.1-1' }}%
                </span>
                <span class="sp-admin-providers__metric-label">Tasa de exito</span>
              </div>
              <div class="sp-admin-providers__metric">
                <span class="sp-admin-providers__metric-value">{{ provider.avg_latency_ms }} ms</span>
                <span class="sp-admin-providers__metric-label">Latencia prom.</span>
              </div>
              <div class="sp-admin-providers__metric">
                <span class="sp-admin-providers__metric-value">${{ provider.daily_volume / 1_000_000 | number:'1.1-1' }}M</span>
                <span class="sp-admin-providers__metric-label">Volumen hoy</span>
              </div>
            </div>

            <div class="sp-admin-providers__card-footer">
              <span class="sp-admin-providers__last-sync">
                Ultima sync: {{ provider.last_sync | date:'dd/MM HH:mm' }}
              </span>
              <div class="sp-admin-providers__card-actions">
                <button
                  class="sp-admin-providers__action-btn"
                  (click)="syncProvider(provider)"
                  title="Sincronizar">
                  ↻ Sincronizar
                </button>
                <button
                  class="sp-admin-providers__action-btn sp-admin-providers__action-btn--ghost"
                  title="Ver logs">
                  Logs
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Tabla detallada -->
      <div class="sp-admin-providers__table-section">
        <h2 class="sp-admin-providers__section-title">Historial de sincronizaciones</h2>
        <table class="sp-admin-providers__table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Tasa de exito</th>
              <th>Latencia</th>
              <th>Volumen (hoy)</th>
              <th>Ultima sync</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (provider of providers(); track provider.id) {
              <tr class="sp-admin-providers__row">
                <td>
                  <span class="sp-admin-providers__table-name">{{ provider.name }}</span>
                  <span class="sp-admin-providers__table-code">{{ provider.code }}</span>
                </td>
                <td>
                  <span
                    class="sp-admin-providers__status-badge"
                    [style.background]="statusCfg(provider.status).bg"
                    [style.color]="statusCfg(provider.status).color">
                    {{ statusCfg(provider.status).label }}
                  </span>
                </td>
                <td>{{ provider.success_rate | number:'1.1-1' }}%</td>
                <td>{{ provider.avg_latency_ms }} ms</td>
                <td>${{ provider.daily_volume | number:'1.0-0' }}</td>
                <td class="sp-admin-providers__cell--date">
                  {{ provider.last_sync | date:'dd/MM/yyyy HH:mm' }}
                </td>
                <td>
                  <button
                    class="sp-admin-providers__action-btn"
                    (click)="syncProvider(provider)">
                    ↻ Sincronizar
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .sp-admin-providers {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-providers__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .sp-admin-providers__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-providers__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }
    .sp-admin-providers__btn-primary {
      padding: 8px 18px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-providers__btn-primary:hover { background: #2b6cb0; }

    /* Cards grid */
    .sp-admin-providers__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .sp-admin-providers__card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
    .sp-admin-providers__card--primary {
      border-color: #bee3f8;
      box-shadow: 0 0 0 2px rgba(49,130,206,0.15);
    }

    /* Card header */
    .sp-admin-providers__card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .sp-admin-providers__card-identity { display: flex; align-items: center; gap: 8px; }
    .sp-admin-providers__provider-code {
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .sp-admin-providers__primary-badge {
      font-size: 10px;
      background: #ebf8ff;
      color: #2b6cb0;
      border-radius: 10px;
      padding: 1px 8px;
      font-weight: 600;
    }

    /* Status */
    .sp-admin-providers__status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .sp-admin-providers__status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    /* Provider info */
    .sp-admin-providers__provider-name {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-providers__provider-url {
      margin: 0 0 16px;
      font-size: 11px;
      color: #a0aec0;
      font-family: monospace;
    }

    /* Metrics */
    .sp-admin-providers__metrics {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px 0;
      border-top: 1px solid #f0f4f8;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-admin-providers__metric { flex: 1; text-align: center; }
    .sp-admin-providers__metric-value {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-providers__metric-value--good { color: #38a169; }
    .sp-admin-providers__metric-value--warn { color: #d69e2e; }
    .sp-admin-providers__metric-value--bad  { color: #e53e3e; }
    .sp-admin-providers__metric-label {
      display: block;
      font-size: 10px;
      color: #a0aec0;
      margin-top: 2px;
    }

    /* Card footer */
    .sp-admin-providers__card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sp-admin-providers__last-sync { font-size: 11px; color: #a0aec0; }
    .sp-admin-providers__card-actions { display: flex; gap: 6px; }

    /* Action buttons */
    .sp-admin-providers__action-btn {
      padding: 5px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      color: #4a5568;
    }
    .sp-admin-providers__action-btn:hover { background: #f7fafc; }
    .sp-admin-providers__action-btn--ghost { color: #718096; }

    /* Table section */
    .sp-admin-providers__table-section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-providers__section-title {
      margin: 0;
      padding: 16px 20px;
      font-size: 15px;
      font-weight: 600;
      color: #2d3748;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-admin-providers__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-providers__table thead tr { background: #f7fafc; }
    .sp-admin-providers__table th {
      text-align: left;
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-providers__table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f4f8;
      color: #2d3748;
    }
    .sp-admin-providers__row:hover { background: #f7fafc; }
    .sp-admin-providers__table-name { display: block; font-weight: 600; }
    .sp-admin-providers__table-code { display: block; font-size: 11px; color: #a0aec0; }
    .sp-admin-providers__cell--date { color: #718096; white-space: nowrap; }
  `],
})
export class ProvidersPageComponent {

  readonly providers = signal<SpeiProvider[]>([
    {
      id: 'prov-stp',
      name: 'STP — Sistema de Transferencias y Pagos',
      code: 'STP',
      status: 'OPERATIONAL',
      last_sync: '2026-02-26T09:45:00Z',
      success_rate: 99.7,
      avg_latency_ms: 180,
      daily_volume: 32_400_000,
      endpoint_url: 'https://demo.stpmex.com:7024',
      is_primary: true,
    },
    {
      id: 'prov-finch',
      name: 'FINCH Financial Technologies',
      code: 'FINCH',
      status: 'OPERATIONAL',
      last_sync: '2026-02-26T09:40:00Z',
      success_rate: 98.2,
      avg_latency_ms: 240,
      daily_volume: 14_200_000,
      endpoint_url: 'https://api.finchpay.mx/v2',
      is_primary: false,
    },
    {
      id: 'prov-banxico',
      name: 'BANXICO — Sistema de Pagos en Tiempo Real (SPEI)',
      code: 'BANXICO',
      status: 'MAINTENANCE',
      last_sync: '2026-02-26T06:00:00Z',
      success_rate: 100,
      avg_latency_ms: 95,
      daily_volume: 0,
      endpoint_url: 'https://spei.banxico.org.mx/api',
      is_primary: false,
    },
    {
      id: 'prov-openpay',
      name: 'Openpay — Gateway Bancario',
      code: 'OPENPAY',
      status: 'DEGRADED',
      last_sync: '2026-02-26T08:55:00Z',
      success_rate: 94.3,
      avg_latency_ms: 620,
      daily_volume: 2_100_000,
      endpoint_url: 'https://api.openpay.mx/v1',
      is_primary: false,
    },
  ]);

  statusCfg(status: ProviderStatus) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG['DOWN'];
  }

  syncProvider(provider: SpeiProvider): void {
    console.log('[Providers] Sincronizando proveedor:', provider.code);
  }

  syncAll(): void {
    console.log('[Providers] Sincronizando todos los proveedores...');
  }
}
