/**
 * AuditPageComponent
 *
 * Audit trail de acciones realizadas en el sistema por usuarios y procesos.
 * Permite filtrar por rango de fechas, usuario y tipo de accion.
 * Incluye paginacion simulada del lado del cliente.
 * EP-SP-008 US-SP-034
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'TRANSFER_CREATED'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_REJECTED'
  | 'ACCOUNT_FROZEN'
  | 'ACCOUNT_UNFROZEN'
  | 'USER_CREATED'
  | 'USER_SUSPENDED'
  | 'POLICY_UPDATED'
  | 'CREDENTIALS_CHANGED'
  | 'PROVIDER_SYNCED';

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  user_email: string;
  action: AuditAction;
  resource: string;
  resource_id: string;
  ip: string;
  severity: AuditSeverity;
  details: string;
  org: string;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN:               'Inicio de sesion',
  LOGOUT:              'Cierre de sesion',
  TRANSFER_CREATED:    'Transferencia creada',
  TRANSFER_APPROVED:   'Transferencia aprobada',
  TRANSFER_REJECTED:   'Transferencia rechazada',
  ACCOUNT_FROZEN:      'Cuenta congelada',
  ACCOUNT_UNFROZEN:    'Cuenta descongelada',
  USER_CREATED:        'Usuario creado',
  USER_SUSPENDED:      'Usuario suspendido',
  POLICY_UPDATED:      'Politica actualizada',
  CREDENTIALS_CHANGED: 'Credenciales modificadas',
  PROVIDER_SYNCED:     'Proveedor sincronizado',
};

const SEVERITY_CONFIG: Record<AuditSeverity, { label: string; bg: string; color: string }> = {
  INFO:     { label: 'Info',      bg: '#ebf8ff', color: '#2b6cb0' },
  WARNING:  { label: 'Advertencia', bg: '#fefcbf', color: '#744210' },
  CRITICAL: { label: 'Critico',   bg: '#fed7d7', color: '#742a2a' },
};

const PAGE_SIZE = 5;

@Component({
  selector: 'sp-admin-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div class="sp-admin-audit">

      <!-- Header -->
      <div class="sp-admin-audit__header">
        <div>
          <h1 class="sp-admin-audit__title">Audit Trail</h1>
          <p class="sp-admin-audit__subtitle">
            Registro de acciones criticas del sistema ordenadas por fecha
          </p>
        </div>
        <button class="sp-admin-audit__export-btn">
          Exportar CSV
        </button>
      </div>

      <!-- Filtros -->
      <div class="sp-admin-audit__filters">
        <input
          type="text"
          class="sp-admin-audit__search"
          placeholder="Buscar por usuario, accion o IP..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange($event)"
        />
        <select class="sp-admin-audit__select" (change)="onSeverityFilter($event)">
          <option value="">Todas las severidades</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Advertencia</option>
          <option value="CRITICAL">Critico</option>
        </select>
        <select class="sp-admin-audit__select" (change)="onActionFilter($event)">
          <option value="">Todas las acciones</option>
          @for (action of actionOptions; track action.value) {
            <option [value]="action.value">{{ action.label }}</option>
          }
        </select>
        <button class="sp-admin-audit__clear-btn" (click)="clearFilters()">
          Limpiar filtros
        </button>
      </div>

      <!-- Stats rapidas -->
      <div class="sp-admin-audit__stats">
        <span class="sp-admin-audit__stat">
          {{ filteredEvents().length }} eventos encontrados
        </span>
        <span class="sp-admin-audit__stat sp-admin-audit__stat--critical">
          {{ criticalCount() }} criticos
        </span>
        <span class="sp-admin-audit__stat sp-admin-audit__stat--warning">
          {{ warningCount() }} advertencias
        </span>
      </div>

      <!-- Tabla -->
      <div class="sp-admin-audit__table-wrap">
        <table class="sp-admin-audit__table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Usuario</th>
              <th>Accion</th>
              <th>Recurso</th>
              <th>IP</th>
              <th>Severidad</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            @if (pagedEvents().length === 0) {
              <tr>
                <td colspan="7" class="sp-admin-audit__empty">
                  Sin eventos para los filtros aplicados.
                </td>
              </tr>
            }
            @for (event of pagedEvents(); track event.id) {
              <tr class="sp-admin-audit__row">
                <td class="sp-admin-audit__cell--date">
                  <span class="sp-admin-audit__date-primary">
                    {{ event.timestamp | date:'dd/MM/yyyy' }}
                  </span>
                  <span class="sp-admin-audit__date-secondary">
                    {{ event.timestamp | date:'HH:mm:ss' }}
                  </span>
                </td>
                <td>
                  <span class="sp-admin-audit__user-name">{{ event.user }}</span>
                  <span class="sp-admin-audit__user-email">{{ event.user_email }}</span>
                </td>
                <td>
                  <span class="sp-admin-audit__action-label">
                    {{ actionLabel(event.action) }}
                  </span>
                </td>
                <td>
                  <span class="sp-admin-audit__resource">{{ event.resource }}</span>
                  <span class="sp-admin-audit__resource-id">{{ event.resource_id }}</span>
                </td>
                <td class="sp-admin-audit__cell--mono">{{ event.ip }}</td>
                <td>
                  <span
                    class="sp-admin-audit__severity-badge"
                    [style.background]="severityCfg(event.severity).bg"
                    [style.color]="severityCfg(event.severity).color">
                    {{ severityCfg(event.severity).label }}
                  </span>
                </td>
                <td class="sp-admin-audit__cell--details">{{ event.details }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginacion -->
      @if (totalPages() > 1) {
        <div class="sp-admin-audit__pagination">
          <button
            class="sp-admin-audit__page-btn"
            [disabled]="currentPage() === 1"
            (click)="goToPage(currentPage() - 1)">
            ← Anterior
          </button>
          <span class="sp-admin-audit__page-info">
            Pagina {{ currentPage() }} de {{ totalPages() }}
          </span>
          <button
            class="sp-admin-audit__page-btn"
            [disabled]="currentPage() === totalPages()"
            (click)="goToPage(currentPage() + 1)">
            Siguiente →
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .sp-admin-audit {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-audit__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .sp-admin-audit__title { margin: 0; font-size: 22px; font-weight: 700; color: #1a202c; }
    .sp-admin-audit__subtitle { margin: 4px 0 0; font-size: 13px; color: #718096; }
    .sp-admin-audit__export-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 13px;
      color: #4a5568;
    }
    .sp-admin-audit__export-btn:hover { background: #f7fafc; }

    /* Filters */
    .sp-admin-audit__filters {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .sp-admin-audit__search {
      flex: 1;
      min-width: 200px;
      padding: 8px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .sp-admin-audit__search:focus { border-color: #3182ce; }
    .sp-admin-audit__select {
      padding: 8px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      background: white;
      outline: none;
    }
    .sp-admin-audit__clear-btn {
      padding: 8px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      color: #718096;
    }
    .sp-admin-audit__clear-btn:hover { background: #f7fafc; }

    /* Stats */
    .sp-admin-audit__stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 12px;
      color: #718096;
    }
    .sp-admin-audit__stat--critical { color: #742a2a; font-weight: 600; }
    .sp-admin-audit__stat--warning  { color: #744210; font-weight: 600; }

    /* Table */
    .sp-admin-audit__table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-audit__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-audit__table thead tr { background: #f7fafc; }
    .sp-admin-audit__table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-audit__table td {
      padding: 11px 14px;
      border-top: 1px solid #f0f4f8;
      vertical-align: top;
    }
    .sp-admin-audit__row:hover { background: #f7fafc; }
    .sp-admin-audit__empty { text-align: center; padding: 32px !important; color: #a0aec0; }

    /* Cell variants */
    .sp-admin-audit__cell--date { white-space: nowrap; }
    .sp-admin-audit__date-primary { display: block; color: #2d3748; font-weight: 500; }
    .sp-admin-audit__date-secondary { display: block; font-size: 11px; color: #a0aec0; }
    .sp-admin-audit__user-name { display: block; font-weight: 600; color: #2d3748; }
    .sp-admin-audit__user-email { display: block; font-size: 11px; color: #a0aec0; }
    .sp-admin-audit__action-label { font-size: 12px; color: #2d3748; }
    .sp-admin-audit__resource { display: block; font-size: 12px; color: #4a5568; }
    .sp-admin-audit__resource-id { display: block; font-size: 10px; font-family: monospace; color: #a0aec0; }
    .sp-admin-audit__cell--mono { font-family: monospace; font-size: 12px; color: #718096; white-space: nowrap; }
    .sp-admin-audit__cell--details { font-size: 12px; color: #718096; max-width: 250px; }

    /* Severity badge */
    .sp-admin-audit__severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }

    /* Pagination */
    .sp-admin-audit__pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 16px 0;
    }
    .sp-admin-audit__page-btn {
      padding: 6px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 13px;
      color: #4a5568;
    }
    .sp-admin-audit__page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .sp-admin-audit__page-btn:not(:disabled):hover { background: #f7fafc; }
    .sp-admin-audit__page-info { font-size: 13px; color: #718096; }
  `],
})
export class AuditPageComponent {

  searchTerm = '';
  readonly searchSignal = signal('');
  readonly filterSeverity = signal<AuditSeverity | ''>('');
  readonly filterAction = signal<AuditAction | ''>('');
  readonly currentPage = signal(1);

  readonly actionOptions = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }));

  readonly events = signal<AuditEvent[]>([
    {
      id: 'EVT-001',
      timestamp: '2026-02-26T09:44:12Z',
      user: 'Ana Torres',
      user_email: 'ana.torres@superpago.mx',
      action: 'TRANSFER_APPROVED',
      resource: 'Transfer',
      resource_id: 'TXN-20260226-0003',
      ip: '192.168.1.45',
      severity: 'INFO',
      details: 'Transferencia SPEI de $9,500 aprobada por operador',
      org: 'Farmacia Del Pueblo',
    },
    {
      id: 'EVT-002',
      timestamp: '2026-02-26T09:15:30Z',
      user: 'Sistema CRON',
      user_email: 'system@superpago.mx',
      action: 'PROVIDER_SYNCED',
      resource: 'Provider',
      resource_id: 'prov-stp',
      ip: '10.0.0.1',
      severity: 'INFO',
      details: 'Sincronizacion automatica STP completada en 180ms',
      org: 'Sistema',
    },
    {
      id: 'EVT-003',
      timestamp: '2026-02-26T08:50:00Z',
      user: 'Carlos Mendez',
      user_email: 'cmendez@tiendas-mayan.com',
      action: 'ACCOUNT_FROZEN',
      resource: 'Account',
      resource_id: 'org-001-wallet-saltillo',
      ip: '201.148.72.12',
      severity: 'CRITICAL',
      details: 'Cuenta congelada por actividad sospechosa reportada por STP',
      org: 'Tiendas Mayan',
    },
    {
      id: 'EVT-004',
      timestamp: '2026-02-26T08:32:00Z',
      user: 'Root Admin',
      user_email: 'root@superpago.mx',
      action: 'POLICY_UPDATED',
      resource: 'Policy',
      resource_id: 'POL-LIMIT-DAY',
      ip: '10.0.0.5',
      severity: 'WARNING',
      details: 'Limite diario de transferencias actualizado de $500,000 a $750,000',
      org: 'Sistema',
    },
    {
      id: 'EVT-005',
      timestamp: '2026-02-26T08:14:00Z',
      user: 'Maria Lopez',
      user_email: 'mlopez@nortena.mx',
      action: 'LOGIN',
      resource: 'Session',
      resource_id: 'sess-a8f3c2',
      ip: '187.164.23.9',
      severity: 'INFO',
      details: 'Inicio de sesion exitoso desde Mexico City',
      org: 'Distribuidora Norteña',
    },
    {
      id: 'EVT-006',
      timestamp: '2026-02-25T17:45:00Z',
      user: 'Root Admin',
      user_email: 'root@superpago.mx',
      action: 'CREDENTIALS_CHANGED',
      resource: 'User',
      resource_id: 'usr-cmendez',
      ip: '10.0.0.5',
      severity: 'CRITICAL',
      details: 'Cambio forzado de contrasena por politica de seguridad',
      org: 'Tiendas Mayan',
    },
    {
      id: 'EVT-007',
      timestamp: '2026-02-25T16:30:00Z',
      user: 'Sistema CRON',
      user_email: 'system@superpago.mx',
      action: 'TRANSFER_REJECTED',
      resource: 'Transfer',
      resource_id: 'TXN-20260225-0203',
      ip: '10.0.0.1',
      severity: 'WARNING',
      details: 'Transferencia rechazada por superar limite horario nocturno',
      org: 'Constructora Apex',
    },
  ]);

  readonly filteredEvents = computed(() => {
    const term = this.searchSignal().toLowerCase();
    const severity = this.filterSeverity();
    const action = this.filterAction();
    return this.events().filter((e) => {
      const matchesTerm =
        !term ||
        e.user.toLowerCase().includes(term) ||
        e.user_email.toLowerCase().includes(term) ||
        e.ip.includes(term) ||
        ACTION_LABELS[e.action]?.toLowerCase().includes(term);
      const matchesSeverity = !severity || e.severity === severity;
      const matchesAction = !action || e.action === action;
      return matchesTerm && matchesSeverity && matchesAction;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredEvents().length / PAGE_SIZE)),
  );

  readonly pagedEvents = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredEvents().slice(start, start + PAGE_SIZE);
  });

  readonly criticalCount = computed(() =>
    this.filteredEvents().filter((e) => e.severity === 'CRITICAL').length,
  );
  readonly warningCount = computed(() =>
    this.filteredEvents().filter((e) => e.severity === 'WARNING').length,
  );

  actionLabel(action: AuditAction): string {
    return ACTION_LABELS[action] ?? action;
  }

  severityCfg(severity: AuditSeverity) {
    return SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG['INFO'];
  }

  onSearchChange(value: string): void {
    this.searchSignal.set(value);
    this.currentPage.set(1);
  }

  onSeverityFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as AuditSeverity | '';
    this.filterSeverity.set(val);
    this.currentPage.set(1);
  }

  onActionFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as AuditAction | '';
    this.filterAction.set(val);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.searchSignal.set('');
    this.filterSeverity.set('');
    this.filterAction.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }
}
