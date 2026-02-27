/**
 * UsersPageComponent
 *
 * Gestion de usuarios de la organizacion con roles y permisos.
 * EP-SP-011: US-SP-046
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

type UserRole = 'admin' | 'operator' | 'readonly';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  last_login?: string;
  avatar_initials?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  readonly: 'Solo lectura',
};

const ROLE_STYLES: Record<UserRole, string> = {
  admin: 'background:#e9d8fd;color:#553c9a',
  operator: 'background:#bee3f8;color:#2c5282',
  readonly: 'background:#e2e8f0;color:#4a5568',
};

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'background:#c6f6d5;color:#276749',
  INACTIVE: 'background:#e2e8f0;color:#718096',
  PENDING: 'background:#fefcbf;color:#744210',
};

@Component({
  selector: 'sp-users-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="sp-business-users">

      <!-- Header -->
      <div class="sp-business-users__header">
        <div>
          <h1 class="sp-business-users__title">Usuarios</h1>
          <p class="sp-business-users__subtitle">
            {{ activeCount() }} activos de {{ users().length }} totales
          </p>
        </div>
        <button (click)="showInviteModal.set(true)" class="sp-business-users__btn sp-business-users__btn--primary">
          + Invitar usuario
        </button>
      </div>

      <!-- Modal de invitacion -->
      @if (showInviteModal()) {
        <div class="sp-business-users__modal-overlay" (click)="showInviteModal.set(false)">
          <div class="sp-business-users__modal" (click)="$event.stopPropagation()">
            <div class="sp-business-users__modal-header">
              <h3>Invitar nuevo usuario</h3>
              <button (click)="showInviteModal.set(false)" class="sp-business-users__modal-close">✕</button>
            </div>
            <div class="sp-business-users__modal-body">
              <div class="sp-business-users__field">
                <label>Email corporativo <span class="sp-business-users__required">*</span></label>
                <input
                  type="email"
                  [value]="inviteEmail()"
                  (input)="inviteEmail.set($any($event.target).value)"
                  placeholder="nombre@empresa.com"
                  class="sp-business-users__input"
                />
              </div>
              <div class="sp-business-users__field">
                <label>Rol a asignar <span class="sp-business-users__required">*</span></label>
                <select
                  [value]="inviteRole()"
                  (change)="inviteRole.set($any($event.target).value)"
                  class="sp-business-users__select">
                  <option value="readonly">Solo lectura</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
                <span class="sp-business-users__hint">
                  @if (inviteRole() === 'admin') {
                    Puede aprobar transferencias y gestionar usuarios.
                  } @else if (inviteRole() === 'operator') {
                    Puede crear transferencias pero requiere aprobacion para montos altos.
                  } @else {
                    Solo puede consultar informacion, no realizar operaciones.
                  }
                </span>
              </div>
            </div>
            <div class="sp-business-users__modal-footer">
              <button (click)="showInviteModal.set(false)" class="sp-business-users__btn sp-business-users__btn--secondary">
                Cancelar
              </button>
              <button (click)="sendInvite()" class="sp-business-users__btn sp-business-users__btn--primary">
                Enviar invitacion
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Filtros de rol -->
      <div class="sp-business-users__filters">
        <button
          [class]="'sp-business-users__filter-btn' + (roleFilter() === null ? ' active' : '')"
          (click)="roleFilter.set(null)">
          Todos ({{ users().length }})
        </button>
        @for (role of roles; track role) {
          <button
            [class]="'sp-business-users__filter-btn' + (roleFilter() === role ? ' active' : '')"
            (click)="roleFilter.set(role)">
            {{ roleLabel(role) }}
          </button>
        }
      </div>

      <!-- Tabla -->
      <div class="sp-business-users__table-wrap">
        <table class="sp-business-users__table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Ultimo acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track user.id) {
              <tr class="sp-business-users__row">
                <td>
                  <div class="sp-business-users__user-cell">
                    <div class="sp-business-users__avatar">{{ initials(user.name) }}</div>
                    <strong>{{ user.name }}</strong>
                  </div>
                </td>
                <td class="sp-business-users__email">{{ user.email }}</td>
                <td>
                  <span [style]="roleStyle(user.role)" class="sp-business-users__role-badge">
                    {{ roleLabel(user.role) }}
                  </span>
                </td>
                <td>
                  <span [style]="statusStyle(user.status)" class="sp-business-users__status-badge">
                    {{ user.status === 'ACTIVE' ? 'Activo' : user.status === 'PENDING' ? 'Pendiente' : 'Inactivo' }}
                  </span>
                </td>
                <td class="sp-business-users__last-login">
                  @if (user.last_login) {
                    {{ user.last_login | date:'d MMM yyyy, HH:mm':'':'es' }}
                  } @else {
                    <span style="color:#a0aec0">Nunca</span>
                  }
                </td>
                <td>
                  <div class="sp-business-users__row-actions">
                    <button class="sp-business-users__row-btn">Editar</button>
                    @if (user.status === 'ACTIVE') {
                      <button
                        (click)="deactivateUser(user.id)"
                        class="sp-business-users__row-btn sp-business-users__row-btn--danger">
                        Desactivar
                      </button>
                    } @else if (user.status === 'INACTIVE') {
                      <button
                        (click)="activateUser(user.id)"
                        class="sp-business-users__row-btn sp-business-users__row-btn--success">
                        Activar
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Roles info -->
      <div class="sp-business-users__roles-info">
        <h3 class="sp-business-users__roles-title">Descripcion de roles</h3>
        <div class="sp-business-users__roles-grid">
          @for (roleInfo of rolesInfo; track roleInfo.role) {
            <div class="sp-business-users__role-card">
              <span [style]="roleStyle(roleInfo.role)" class="sp-business-users__role-badge">{{ roleLabel(roleInfo.role) }}</span>
              <p>{{ roleInfo.description }}</p>
            </div>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .sp-business-users { padding: 24px; max-width: 1100px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-business-users__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .sp-business-users__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-business-users__subtitle { font-size: 13px; color: #718096; margin: 0; }

    /* Buttons */
    .sp-business-users__btn {
      padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none;
    }
    .sp-business-users__btn--primary { background: #3182ce; color: white; }
    .sp-business-users__btn--primary:hover { background: #2b6cb0; }
    .sp-business-users__btn--secondary { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-business-users__btn--secondary:hover { background: #f7fafc; }

    /* Modal */
    .sp-business-users__modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-business-users__modal {
      background: white; border-radius: 14px; padding: 0; width: 480px; max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .sp-business-users__modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #e2e8f0;
    }
    .sp-business-users__modal-header h3 { font-size: 16px; color: #1a202c; margin: 0; }
    .sp-business-users__modal-close { border: none; background: none; cursor: pointer; font-size: 16px; color: #718096; }
    .sp-business-users__modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .sp-business-users__modal-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; justify-content: flex-end; }
    .sp-business-users__field { display: flex; flex-direction: column; gap: 5px; }
    .sp-business-users__field label { font-size: 12px; font-weight: 600; color: #4a5568; }
    .sp-business-users__required { color: #e53e3e; }
    .sp-business-users__input, .sp-business-users__select {
      padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none;
    }
    .sp-business-users__input:focus, .sp-business-users__select:focus { border-color: #3182ce; }
    .sp-business-users__hint { font-size: 11px; color: #718096; font-style: italic; }

    /* Filters */
    .sp-business-users__filters { display: flex; gap: 8px; margin-bottom: 16px; }
    .sp-business-users__filter-btn {
      padding: 5px 14px; border: 1px solid #e2e8f0; border-radius: 20px;
      font-size: 12px; cursor: pointer; background: white; color: #4a5568;
    }
    .sp-business-users__filter-btn.active { background: #3182ce; color: white; border-color: #3182ce; }

    /* Table */
    .sp-business-users__table-wrap { overflow-x: auto; margin-bottom: 24px; }
    .sp-business-users__table {
      width: 100%; border-collapse: collapse; font-size: 13px;
      background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-business-users__table thead th {
      background: #f7fafc; padding: 12px 14px; text-align: left;
      font-size: 11px; font-weight: 700; color: #718096;
      text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;
    }
    .sp-business-users__row td { padding: 14px; border-bottom: 1px solid #f7fafc; }
    .sp-business-users__row:last-child td { border-bottom: none; }
    .sp-business-users__row:hover { background: #f7fafc; }

    .sp-business-users__user-cell { display: flex; align-items: center; gap: 10px; }
    .sp-business-users__avatar {
      width: 34px; height: 34px; background: #e9d8fd; color: #553c9a;
      border-radius: 50%; font-size: 12px; font-weight: 700; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-business-users__user-cell strong { font-size: 13px; color: #2d3748; }
    .sp-business-users__email { font-size: 12px; color: #718096; }
    .sp-business-users__last-login { font-size: 12px; color: #4a5568; }
    .sp-business-users__role-badge, .sp-business-users__status-badge {
      font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600;
    }

    .sp-business-users__row-actions { display: flex; gap: 6px; }
    .sp-business-users__row-btn {
      padding: 4px 12px; border-radius: 7px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: 1px solid #e2e8f0; background: white; color: #4a5568;
    }
    .sp-business-users__row-btn:hover { background: #f7fafc; }
    .sp-business-users__row-btn--danger { color: #c53030; border-color: #fed7d7; }
    .sp-business-users__row-btn--danger:hover { background: #fff5f5; }
    .sp-business-users__row-btn--success { color: #276749; border-color: #9ae6b4; }
    .sp-business-users__row-btn--success:hover { background: #f0fff4; }

    /* Roles info */
    .sp-business-users__roles-info { background: #f7fafc; border-radius: 10px; padding: 16px 20px; }
    .sp-business-users__roles-title { font-size: 13px; font-weight: 700; color: #4a5568; margin: 0 0 12px; }
    .sp-business-users__roles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .sp-business-users__role-card { display: flex; flex-direction: column; gap: 6px; }
    .sp-business-users__role-card p { font-size: 11px; color: #718096; margin: 0; }
  `],
})
export class UsersPageComponent {
  readonly roles: UserRole[] = ['admin', 'operator', 'readonly'];
  readonly roleFilter = signal<UserRole | null>(null);
  readonly showInviteModal = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<UserRole>('readonly');

  readonly rolesInfo = [
    { role: 'admin' as UserRole, description: 'Acceso completo: aprobaciones, gestion de usuarios, configuracion.' },
    { role: 'operator' as UserRole, description: 'Crear transferencias y movimientos. Requiere aprobacion para montos altos.' },
    { role: 'readonly' as UserRole, description: 'Consulta de saldos, movimientos y reportes. Sin operaciones.' },
  ];

  readonly users = signal<OrgUser[]>([
    { id: 'usr-001', name: 'Luis Alberto Reyes', email: 'luis.reyes@empresa.com', role: 'admin', status: 'ACTIVE', last_login: '2026-02-26T08:30:00Z' },
    { id: 'usr-002', name: 'Carlos Mendoza Vega', email: 'c.mendoza@empresa.com', role: 'operator', status: 'ACTIVE', last_login: '2026-02-26T10:15:00Z' },
    { id: 'usr-003', name: 'Ana Torres Ruiz', email: 'ana.torres@empresa.com', role: 'readonly', status: 'ACTIVE', last_login: '2026-02-25T17:00:00Z' },
  ]);

  readonly filteredUsers = computed<OrgUser[]>(() => {
    const filter = this.roleFilter();
    if (!filter) return this.users();
    return this.users().filter((u) => u.role === filter);
  });

  readonly activeCount = computed(() =>
    this.users().filter((u) => u.status === 'ACTIVE').length
  );

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  roleStyle(role: UserRole): string {
    return ROLE_STYLES[role] ?? '';
  }

  statusStyle(status: UserStatus): string {
    return STATUS_STYLES[status] ?? '';
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  sendInvite(): void {
    if (!this.inviteEmail()) return;
    const newUser: OrgUser = {
      id: `usr-${Date.now()}`,
      name: this.inviteEmail().split('@')[0],
      email: this.inviteEmail(),
      role: this.inviteRole(),
      status: 'PENDING',
    };
    this.users.update((list) => [...list, newUser]);
    this.showInviteModal.set(false);
    this.inviteEmail.set('');
    this.inviteRole.set('readonly');
  }

  deactivateUser(id: string): void {
    this.users.update((list) =>
      list.map((u) => u.id === id ? { ...u, status: 'INACTIVE' as UserStatus } : u)
    );
  }

  activateUser(id: string): void {
    this.users.update((list) =>
      list.map((u) => u.id === id ? { ...u, status: 'ACTIVE' as UserStatus } : u)
    );
  }
}
