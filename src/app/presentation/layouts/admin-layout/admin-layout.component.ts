/**
 * AdminLayoutComponent
 *
 * Layout del Portal Admin (Tier 1 — sp:admin).
 * Sidebar con navegacion global + router-outlet.
 * EP-SP-007: US-SP-029
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SharedStateService } from '../.././../core/services/shared-state.service';

@Component({
  selector: 'sp-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="sp-admin-layout">
      <!-- Sidebar -->
      <aside class="sp-admin-layout__sidebar">
        <div class="sp-admin-layout__brand">
          <span class="sp-admin-layout__brand-logo">SP</span>
          <span class="sp-admin-layout__brand-name">SuperPago</span>
          <span class="sp-admin-layout__brand-tier">Admin</span>
        </div>

        <nav class="sp-admin-layout__nav">
          <a routerLink="/sp/admin/dashboard" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/sp/admin/organizations" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>🏢</span> Organizaciones
          </a>
          <a routerLink="/sp/admin/accounts/tree" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>🌳</span> Grafo Global
          </a>
          <a routerLink="/sp/admin/providers" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>🔌</span> Proveedores SPEI
          </a>
          <a routerLink="/sp/admin/reconciliation" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>⚖️</span> Reconciliación
          </a>
          <a routerLink="/sp/admin/audit" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>📋</span> Audit Trail
          </a>
          <a routerLink="/sp/admin/policies" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>🛡</span> Políticas
          </a>
          <a routerLink="/sp/admin/alerts" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>🔔</span> Alertas
          </a>
          <a routerLink="/sp/admin/dlq" routerLinkActive="active" class="sp-admin-layout__nav-item">
            <span>🔧</span> DLQ
          </a>
        </nav>

        @if (state.currentUser()) {
          <div class="sp-admin-layout__user">
            <span class="sp-admin-layout__user-avatar">{{ initials() }}</span>
            <div>
              <div class="sp-admin-layout__user-name">{{ state.currentUser()!.name }}</div>
              <div class="sp-admin-layout__user-role">Super Admin</div>
            </div>
          </div>
        }
      </aside>

      <!-- Contenido -->
      <main class="sp-admin-layout__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .sp-admin-layout { display: flex; height: 100vh; overflow: hidden; background: #f7fafc; }

    /* Sidebar */
    .sp-admin-layout__sidebar {
      width: 220px; background: #1a202c; color: white;
      display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto;
    }
    .sp-admin-layout__brand {
      display: flex; align-items: center; gap: 8px;
      padding: 20px 16px; border-bottom: 1px solid #2d3748;
    }
    .sp-admin-layout__brand-logo {
      width: 32px; height: 32px; background: #3182ce; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;
    }
    .sp-admin-layout__brand-name { font-weight: 700; font-size: 15px; }
    .sp-admin-layout__brand-tier {
      font-size: 9px; background: #e53e3e; padding: 2px 6px; border-radius: 10px;
      font-weight: 600; letter-spacing: 0.5px;
    }

    /* Nav */
    .sp-admin-layout__nav { flex: 1; padding: 12px 0; }
    .sp-admin-layout__nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; color: #a0aec0; text-decoration: none; font-size: 13px;
      transition: all 0.15s;
    }
    .sp-admin-layout__nav-item:hover { background: #2d3748; color: white; }
    .sp-admin-layout__nav-item.active { background: #2d3748; color: #90cdf4; font-weight: 600; }

    /* User */
    .sp-admin-layout__user {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-top: 1px solid #2d3748;
    }
    .sp-admin-layout__user-avatar {
      width: 32px; height: 32px; background: #3182ce; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
    }
    .sp-admin-layout__user-name { font-size: 12px; font-weight: 600; }
    .sp-admin-layout__user-role { font-size: 10px; color: #718096; }

    /* Content */
    .sp-admin-layout__content { flex: 1; overflow-y: auto; padding: 24px; }
  `],
})
export class AdminLayoutComponent {
  readonly state = inject(SharedStateService);

  initials(): string {
    const name = this.state.currentUser()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}
