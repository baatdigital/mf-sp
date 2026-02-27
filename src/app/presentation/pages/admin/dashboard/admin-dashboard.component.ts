/**
 * AdminDashboardComponent
 *
 * Dashboard global del portal Admin con KPIs del sistema:
 * total de organizaciones, transferencias del dia, volumen total y alertas activas.
 * EP-SP-008 US-SP-029
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

interface KpiCard {
  title: string;
  value: string | number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: string;
  accentColor: string;
}

interface RecentTransfer {
  id: string;
  origin_org: string;
  destination: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  created_at: string;
}

@Component({
  selector: 'sp-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="sp-admin-dashboard">

      <!-- Encabezado -->
      <div class="sp-admin-dashboard__header">
        <div>
          <h1 class="sp-admin-dashboard__title">Dashboard Global</h1>
          <p class="sp-admin-dashboard__subtitle">
            Resumen del sistema · {{ today | date:'EEEE d MMMM yyyy':'':'es' }}
          </p>
        </div>
        <button class="sp-admin-dashboard__refresh-btn" (click)="refresh()">
          ↻ Actualizar
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="sp-admin-dashboard__kpi-grid">
        @for (kpi of kpis(); track kpi.title) {
          <div class="sp-admin-dashboard__kpi-card"
               [style.border-left-color]="kpi.accentColor">
            <div class="sp-admin-dashboard__kpi-top">
              <span class="sp-admin-dashboard__kpi-icon">{{ kpi.icon }}</span>
              <span
                class="sp-admin-dashboard__kpi-trend"
                [class.sp-admin-dashboard__kpi-trend--up]="kpi.trend === 'up'"
                [class.sp-admin-dashboard__kpi-trend--down]="kpi.trend === 'down'">
                {{ kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—' }}
                {{ kpi.trendValue }}
              </span>
            </div>
            <div class="sp-admin-dashboard__kpi-value">{{ kpi.value }}</div>
            <div class="sp-admin-dashboard__kpi-title">{{ kpi.title }}</div>
            <div class="sp-admin-dashboard__kpi-subtitle">{{ kpi.subtitle }}</div>
          </div>
        }
      </div>

      <!-- Tabla de ultimas transferencias -->
      <div class="sp-admin-dashboard__section">
        <h2 class="sp-admin-dashboard__section-title">
          Ultimas transferencias del sistema
        </h2>

        <div class="sp-admin-dashboard__table-wrap">
          <table class="sp-admin-dashboard__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Org. Origen</th>
                <th>Destino</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (txn of recentTransfers(); track txn.id) {
                <tr class="sp-admin-dashboard__row">
                  <td class="sp-admin-dashboard__cell--mono">{{ txn.id }}</td>
                  <td>{{ txn.origin_org }}</td>
                  <td>{{ txn.destination }}</td>
                  <td class="sp-admin-dashboard__cell--amount">
                    {{ txn.amount | currency:'MXN':'symbol':'1.2-2' }}
                  </td>
                  <td class="sp-admin-dashboard__cell--date">
                    {{ txn.created_at | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td>
                    <span
                      class="sp-admin-dashboard__status-badge"
                      [class.sp-admin-dashboard__status-badge--completed]="txn.status === 'COMPLETED'"
                      [class.sp-admin-dashboard__status-badge--pending]="txn.status === 'PENDING'"
                      [class.sp-admin-dashboard__status-badge--failed]="txn.status === 'FAILED'">
                      {{ statusLabel(txn.status) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="sp-admin-dashboard__table-footer">
          Mostrando {{ recentTransfers().length }} transferencias · Total hoy:
          <strong>{{ totalToday() | currency:'MXN':'symbol':'1.2-2' }}</strong>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sp-admin-dashboard {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-dashboard__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .sp-admin-dashboard__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-dashboard__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
      text-transform: capitalize;
    }
    .sp-admin-dashboard__refresh-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 13px;
      color: #4a5568;
    }
    .sp-admin-dashboard__refresh-btn:hover { background: #f7fafc; }

    /* KPI Grid */
    .sp-admin-dashboard__kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .sp-admin-dashboard__kpi-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3182ce;
      border-radius: 10px;
      padding: 18px 20px;
    }
    .sp-admin-dashboard__kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .sp-admin-dashboard__kpi-icon { font-size: 22px; }
    .sp-admin-dashboard__kpi-trend {
      font-size: 11px;
      font-weight: 600;
      color: #718096;
    }
    .sp-admin-dashboard__kpi-trend--up { color: #38a169; }
    .sp-admin-dashboard__kpi-trend--down { color: #e53e3e; }
    .sp-admin-dashboard__kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 4px;
    }
    .sp-admin-dashboard__kpi-title {
      font-size: 13px;
      font-weight: 600;
      color: #4a5568;
    }
    .sp-admin-dashboard__kpi-subtitle {
      font-size: 11px;
      color: #a0aec0;
      margin-top: 2px;
    }

    /* Section */
    .sp-admin-dashboard__section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-dashboard__section-title {
      margin: 0;
      padding: 16px 20px;
      font-size: 15px;
      font-weight: 600;
      color: #2d3748;
      border-bottom: 1px solid #f0f4f8;
    }

    /* Table */
    .sp-admin-dashboard__table-wrap { overflow-x: auto; }
    .sp-admin-dashboard__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-dashboard__table thead tr {
      background: #f7fafc;
    }
    .sp-admin-dashboard__table th {
      text-align: left;
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-dashboard__row:hover { background: #f7fafc; }
    .sp-admin-dashboard__table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f4f8;
      color: #2d3748;
    }
    .sp-admin-dashboard__cell--mono { font-family: monospace; font-size: 12px; color: #718096; }
    .sp-admin-dashboard__cell--amount { font-weight: 600; color: #2d3748; }
    .sp-admin-dashboard__cell--date { color: #718096; white-space: nowrap; }

    /* Status badges */
    .sp-admin-dashboard__status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .sp-admin-dashboard__status-badge--completed {
      background: #c6f6d5;
      color: #276749;
    }
    .sp-admin-dashboard__status-badge--pending {
      background: #fefcbf;
      color: #744210;
    }
    .sp-admin-dashboard__status-badge--failed {
      background: #fed7d7;
      color: #742a2a;
    }

    /* Footer */
    .sp-admin-dashboard__table-footer {
      padding: 12px 20px;
      font-size: 12px;
      color: #718096;
      border-top: 1px solid #f0f4f8;
    }
  `],
})
export class AdminDashboardComponent {

  readonly today = new Date();

  readonly kpis = signal<KpiCard[]>([
    {
      title: 'Organizaciones activas',
      value: 148,
      subtitle: 'Registradas en el sistema',
      trend: 'up',
      trendValue: '+3 este mes',
      icon: '🏢',
      accentColor: '#3182ce',
    },
    {
      title: 'Transferencias hoy',
      value: '2,341',
      subtitle: 'Operaciones procesadas',
      trend: 'up',
      trendValue: '+12% vs ayer',
      icon: '↗',
      accentColor: '#38a169',
    },
    {
      title: 'Volumen total hoy',
      value: '$48.7M',
      subtitle: 'MXN procesados',
      trend: 'up',
      trendValue: '+8.3%',
      icon: '💰',
      accentColor: '#805ad5',
    },
    {
      title: 'Alertas activas',
      value: 5,
      subtitle: '2 criticas, 3 advertencias',
      trend: 'down',
      trendValue: '-2 vs ayer',
      icon: '⚠',
      accentColor: '#ed8936',
    },
  ]);

  readonly recentTransfers = signal<RecentTransfer[]>([
    {
      id: 'TXN-20250226-0001',
      origin_org: 'Tiendas Mayan S.A.',
      destination: '012345678901234567',
      amount: 125000,
      status: 'COMPLETED',
      created_at: '2026-02-26T08:14:00Z',
    },
    {
      id: 'TXN-20250226-0002',
      origin_org: 'Distribuidora Norteña',
      destination: '032180000118359719',
      amount: 47800,
      status: 'COMPLETED',
      created_at: '2026-02-26T08:32:00Z',
    },
    {
      id: 'TXN-20250226-0003',
      origin_org: 'Farmacia Del Pueblo',
      destination: '021000040335020014',
      amount: 9500,
      status: 'PENDING',
      created_at: '2026-02-26T09:01:00Z',
    },
    {
      id: 'TXN-20250226-0004',
      origin_org: 'Constructora Apex',
      destination: '706180000000013529',
      amount: 280000,
      status: 'FAILED',
      created_at: '2026-02-26T09:15:00Z',
    },
    {
      id: 'TXN-20250226-0005',
      origin_org: 'Grupo Textil Norte',
      destination: '014180655188359824',
      amount: 63200,
      status: 'COMPLETED',
      created_at: '2026-02-26T09:44:00Z',
    },
  ]);

  readonly totalToday = computed(() =>
    this.recentTransfers()
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0),
  );

  statusLabel(status: RecentTransfer['status']): string {
    const labels: Record<RecentTransfer['status'], string> = {
      COMPLETED: 'Completada',
      PENDING: 'Pendiente',
      FAILED: 'Fallida',
    };
    return labels[status] ?? status;
  }

  refresh(): void {
    // Simula actualizacion de datos en produccion llamaria un servicio
    console.log('[AdminDashboard] Actualizando KPIs...');
  }
}
