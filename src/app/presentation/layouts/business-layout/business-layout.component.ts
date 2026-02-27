/**
 * BusinessLayoutComponent
 *
 * Layout del Portal Empresa (Tier 2 — sp:business).
 * Topbar + sidebar colapsable + router-outlet.
 * EP-SP-007: US-SP-030
 */
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SharedStateService } from '../../../core/services/shared-state.service';

@Component({
  selector: 'sp-business-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="sp-biz-layout">
      <!-- Topbar -->
      <header class="sp-biz-layout__topbar">
        <button class="sp-biz-layout__menu-btn" (click)="sidebarOpen.set(!sidebarOpen())">☰</button>
        <div class="sp-biz-layout__brand">
          <span class="sp-biz-layout__brand-logo">SP</span>
          <span class="sp-biz-layout__brand-name">SuperPago</span>
        </div>
        @if (state.currentUser()?.org_name) {
          <span class="sp-biz-layout__org-badge">{{ state.currentUser()!.org_name }}</span>
        }
        <div class="sp-biz-layout__topbar-spacer"></div>
        @if (state.currentUser()) {
          <span class="sp-biz-layout__user-chip">{{ state.currentUser()!.name }}</span>
        }
      </header>

      <div class="sp-biz-layout__body">
        <!-- Sidebar -->
        <aside [class]="'sp-biz-layout__sidebar' + (sidebarOpen() ? ' open' : '')">
          <nav class="sp-biz-layout__nav">
            <a routerLink="/sp/business/dashboard" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>📊</span> <span class="sp-biz-layout__nav-label">Dashboard</span>
            </a>
            <a routerLink="/sp/business/accounts" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>🏦</span> <span class="sp-biz-layout__nav-label">Cuentas</span>
            </a>
            <a routerLink="/sp/business/accounts/tree" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>🌳</span> <span class="sp-biz-layout__nav-label">Árbol</span>
            </a>
            <a routerLink="/sp/business/transfers/spei" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>↗</span> <span class="sp-biz-layout__nav-label">Transferir SPEI</span>
            </a>
            <a routerLink="/sp/business/transfers/internal" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>↔</span> <span class="sp-biz-layout__nav-label">Mov. Interno</span>
            </a>
            <a routerLink="/sp/business/movements" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>📋</span> <span class="sp-biz-layout__nav-label">Movimientos</span>
            </a>
            <a routerLink="/sp/business/beneficiaries" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>👥</span> <span class="sp-biz-layout__nav-label">Beneficiarios</span>
            </a>
            <a routerLink="/sp/business/approvals" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>✅</span> <span class="sp-biz-layout__nav-label">Aprobaciones</span>
            </a>
            <a routerLink="/sp/business/users" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>👤</span> <span class="sp-biz-layout__nav-label">Usuarios</span>
            </a>
            <a routerLink="/sp/business/settings" routerLinkActive="active" class="sp-biz-layout__nav-item">
              <span>⚙️</span> <span class="sp-biz-layout__nav-label">Configuración</span>
            </a>
          </nav>
        </aside>

        <!-- Contenido -->
        <main class="sp-biz-layout__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .sp-biz-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: #f7fafc; }

    /* Topbar */
    .sp-biz-layout__topbar {
      display: flex; align-items: center; gap: 12px;
      background: white; border-bottom: 1px solid #e2e8f0; padding: 0 16px; height: 56px; flex-shrink: 0;
    }
    .sp-biz-layout__menu-btn { border: none; background: none; font-size: 18px; cursor: pointer; color: #4a5568; }
    .sp-biz-layout__brand { display: flex; align-items: center; gap: 8px; }
    .sp-biz-layout__brand-logo {
      width: 28px; height: 28px; background: #3182ce; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 12px;
    }
    .sp-biz-layout__brand-name { font-weight: 700; font-size: 15px; color: #2d3748; }
    .sp-biz-layout__org-badge {
      font-size: 11px; background: #ebf8ff; color: #2b6cb0; padding: 2px 10px; border-radius: 12px; font-weight: 500;
    }
    .sp-biz-layout__topbar-spacer { flex: 1; }
    .sp-biz-layout__user-chip { font-size: 12px; color: #4a5568; }

    /* Body */
    .sp-biz-layout__body { display: flex; flex: 1; overflow: hidden; }

    /* Sidebar */
    .sp-biz-layout__sidebar {
      width: 52px; background: #2d3748; transition: width 0.2s; overflow: hidden; flex-shrink: 0;
    }
    .sp-biz-layout__sidebar.open { width: 200px; }
    .sp-biz-layout__nav { padding: 8px 0; }
    .sp-biz-layout__nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 14px; color: #a0aec0; text-decoration: none; font-size: 13px;
      white-space: nowrap; transition: background 0.15s;
    }
    .sp-biz-layout__nav-item:hover { background: #3d4f63; color: white; }
    .sp-biz-layout__nav-item.active { background: #3d4f63; color: #90cdf4; font-weight: 600; }
    .sp-biz-layout__nav-label { opacity: 0; transition: opacity 0.2s; }
    .sp-biz-layout__sidebar.open .sp-biz-layout__nav-label { opacity: 1; }

    /* Content */
    .sp-biz-layout__content { flex: 1; overflow-y: auto; padding: 24px; }
  `],
})
export class BusinessLayoutComponent {
  readonly state = inject(SharedStateService);
  readonly sidebarOpen = signal(true);
}
