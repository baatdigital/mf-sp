/**
 * OrganizationsPageComponent
 *
 * Lista de organizaciones registradas en el sistema con filtros
 * de busqueda por nombre y estado.
 * EP-SP-008 US-SP-030
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'CLOSED';

interface Organization {
  id: string;
  name: string;
  rfc: string;
  status: OrgStatus;
  account_count: number;
  total_balance: number;
  created_at: string;
  contact_email: string;
}

const STATUS_CONFIG: Record<OrgStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:    { label: 'Activa',      bg: '#c6f6d5', color: '#276749' },
  SUSPENDED: { label: 'Suspendida',  bg: '#fed7d7', color: '#742a2a' },
  PENDING:   { label: 'Pendiente',   bg: '#fefcbf', color: '#744210' },
  CLOSED:    { label: 'Cerrada',     bg: '#e2e8f0', color: '#718096' },
};

@Component({
  selector: 'sp-admin-organizations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  template: `
    <div class="sp-admin-orgs">

      <!-- Header -->
      <div class="sp-admin-orgs__header">
        <div>
          <h1 class="sp-admin-orgs__title">Organizaciones</h1>
          <p class="sp-admin-orgs__subtitle">
            {{ filteredOrgs().length }} de {{ organizations().length }} organizaciones
          </p>
        </div>
        <button class="sp-admin-orgs__new-btn">+ Nueva org.</button>
      </div>

      <!-- Filtros -->
      <div class="sp-admin-orgs__filters">
        <input
          type="text"
          class="sp-admin-orgs__search"
          placeholder="Buscar por nombre, RFC o ID..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearch($event)"
        />

        <select class="sp-admin-orgs__select" (change)="onStatusFilter($event)">
          <option value="">Todos los estados</option>
          @for (opt of statusOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
      </div>

      <!-- Tabla -->
      <div class="sp-admin-orgs__table-wrap">
        <table class="sp-admin-orgs__table">
          <thead>
            <tr>
              <th>Organizacion</th>
              <th>RFC</th>
              <th>ID</th>
              <th>Estado</th>
              <th>Cuentas</th>
              <th>Saldo total</th>
              <th>Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (filteredOrgs().length === 0) {
              <tr>
                <td colspan="8" class="sp-admin-orgs__empty">
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            }
            @for (org of filteredOrgs(); track org.id) {
              <tr class="sp-admin-orgs__row">
                <td class="sp-admin-orgs__cell--name">
                  <span class="sp-admin-orgs__org-name">{{ org.name }}</span>
                  <span class="sp-admin-orgs__org-email">{{ org.contact_email }}</span>
                </td>
                <td class="sp-admin-orgs__cell--mono">{{ org.rfc }}</td>
                <td class="sp-admin-orgs__cell--mono sp-admin-orgs__cell--id">{{ org.id }}</td>
                <td>
                  <span
                    class="sp-admin-orgs__status-badge"
                    [style.background]="statusConfig(org.status).bg"
                    [style.color]="statusConfig(org.status).color">
                    {{ statusConfig(org.status).label }}
                  </span>
                </td>
                <td class="sp-admin-orgs__cell--center">{{ org.account_count }}</td>
                <td class="sp-admin-orgs__cell--amount">
                  {{ org.total_balance | currency:'MXN':'symbol':'1.2-2' }}
                </td>
                <td class="sp-admin-orgs__cell--date">{{ org.created_at }}</td>
                <td>
                  <div class="sp-admin-orgs__actions">
                    <button class="sp-admin-orgs__action-btn" title="Ver detalle">👁</button>
                    <button class="sp-admin-orgs__action-btn" title="Editar">✏</button>
                    @if (org.status === 'ACTIVE') {
                      <button class="sp-admin-orgs__action-btn sp-admin-orgs__action-btn--danger"
                              title="Suspender">⛔</button>
                    }
                    @if (org.status === 'SUSPENDED') {
                      <button class="sp-admin-orgs__action-btn sp-admin-orgs__action-btn--success"
                              title="Reactivar">✅</button>
                    }
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
    .sp-admin-orgs {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-orgs__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .sp-admin-orgs__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-orgs__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }
    .sp-admin-orgs__new-btn {
      padding: 8px 18px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .sp-admin-orgs__new-btn:hover { background: #2b6cb0; }

    /* Filtros */
    .sp-admin-orgs__filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .sp-admin-orgs__search {
      flex: 1;
      padding: 9px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .sp-admin-orgs__search:focus { border-color: #3182ce; }
    .sp-admin-orgs__select {
      padding: 9px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      background: white;
      min-width: 180px;
    }

    /* Tabla */
    .sp-admin-orgs__table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sp-admin-orgs__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sp-admin-orgs__table thead tr { background: #f7fafc; }
    .sp-admin-orgs__table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sp-admin-orgs__table td {
      padding: 12px 14px;
      border-top: 1px solid #f0f4f8;
      color: #2d3748;
      vertical-align: middle;
    }
    .sp-admin-orgs__row:hover { background: #f7fafc; }
    .sp-admin-orgs__empty {
      text-align: center;
      padding: 32px !important;
      color: #a0aec0;
    }

    /* Cell variants */
    .sp-admin-orgs__cell--name { min-width: 180px; }
    .sp-admin-orgs__org-name {
      display: block;
      font-weight: 600;
      color: #2d3748;
    }
    .sp-admin-orgs__org-email {
      display: block;
      font-size: 11px;
      color: #a0aec0;
      margin-top: 2px;
    }
    .sp-admin-orgs__cell--mono { font-family: monospace; font-size: 12px; color: #718096; }
    .sp-admin-orgs__cell--id { font-size: 10px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
    .sp-admin-orgs__cell--center { text-align: center; font-weight: 600; }
    .sp-admin-orgs__cell--amount { font-weight: 600; color: #2d3748; }
    .sp-admin-orgs__cell--date { color: #718096; white-space: nowrap; font-size: 12px; }

    /* Status badge */
    .sp-admin-orgs__status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }

    /* Actions */
    .sp-admin-orgs__actions { display: flex; gap: 4px; }
    .sp-admin-orgs__action-btn {
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
    .sp-admin-orgs__action-btn:hover { background: #f7fafc; }
    .sp-admin-orgs__action-btn--danger:hover { background: #fff5f5; border-color: #fed7d7; }
    .sp-admin-orgs__action-btn--success:hover { background: #f0fff4; border-color: #c6f6d5; }
  `],
})
export class OrganizationsPageComponent {

  searchTerm = '';
  readonly selectedStatus = signal<OrgStatus | ''>('');

  readonly statusOptions = [
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'SUSPENDED', label: 'Suspendida' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'CLOSED', label: 'Cerrada' },
  ];

  readonly organizations = signal<Organization[]>([
    {
      id: 'org-001-tiendas-mayan',
      name: 'Tiendas Mayan S.A. de C.V.',
      rfc: 'TMA901201ABC',
      status: 'ACTIVE',
      account_count: 12,
      total_balance: 4_820_000,
      created_at: '2024-01-15',
      contact_email: 'finanzas@mayan.com.mx',
    },
    {
      id: 'org-002-distribuidora-nortena',
      name: 'Distribuidora Norteña S.A.',
      rfc: 'DNO150630XYZ',
      status: 'ACTIVE',
      account_count: 5,
      total_balance: 980_000,
      created_at: '2024-03-08',
      contact_email: 'contabilidad@nortena.mx',
    },
    {
      id: 'org-003-farmacia-del-pueblo',
      name: 'Farmacia Del Pueblo S.C.',
      rfc: 'FDP780920DEF',
      status: 'SUSPENDED',
      account_count: 3,
      total_balance: 125_400,
      created_at: '2023-11-20',
      contact_email: 'admin@farmaciadelpueblo.mx',
    },
    {
      id: 'org-004-constructora-apex',
      name: 'Constructora Apex SAPI',
      rfc: 'CAP200110GHI',
      status: 'PENDING',
      account_count: 1,
      total_balance: 0,
      created_at: '2026-02-20',
      contact_email: 'soporte@apex-mx.com',
    },
  ]);

  readonly searchSignal = signal('');
  readonly filteredOrgs = computed(() => {
    const term = this.searchSignal().toLowerCase();
    const status = this.selectedStatus();
    return this.organizations().filter((org) => {
      const matchesTerm =
        !term ||
        org.name.toLowerCase().includes(term) ||
        org.rfc.toLowerCase().includes(term) ||
        org.id.toLowerCase().includes(term);
      const matchesStatus = !status || org.status === status;
      return matchesTerm && matchesStatus;
    });
  });

  statusConfig(status: OrgStatus): { label: string; bg: string; color: string } {
    return STATUS_CONFIG[status] ?? { label: status, bg: '#e2e8f0', color: '#718096' };
  }

  onSearch(value: string): void {
    this.searchSignal.set(value);
  }

  onStatusFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as OrgStatus | '';
    this.selectedStatus.set(val);
  }
}
