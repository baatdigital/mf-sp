/**
 * PersonalLayoutComponent
 *
 * Layout del Portal Personal (Tier 3 — sp:personal).
 * Diseño mobile-first con bottom navigation.
 * EP-SP-007: US-SP-031
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SharedStateService } from '../../../core/services/shared-state.service';

@Component({
  selector: 'sp-personal-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="sp-personal-layout">
      <!-- Header simple -->
      <header class="sp-personal-layout__header">
        <div class="sp-personal-layout__brand">
          <span class="sp-personal-layout__brand-logo">SP</span>
          <span class="sp-personal-layout__brand-name">SuperPago</span>
        </div>
        @if (state.currentUser()) {
          <span class="sp-personal-layout__user-name">{{ state.currentUser()!.name }}</span>
        }
      </header>

      <!-- Contenido -->
      <main class="sp-personal-layout__content">
        <router-outlet />
      </main>

      <!-- Bottom navigation (mobile-first) -->
      <nav class="sp-personal-layout__bottom-nav">
        <a routerLink="/sp/personal/dashboard" routerLinkActive="active" class="sp-personal-layout__bottom-item">
          <span class="sp-personal-layout__bottom-icon">🏠</span>
          <span class="sp-personal-layout__bottom-label">Inicio</span>
        </a>
        <a routerLink="/sp/personal/movements" routerLinkActive="active" class="sp-personal-layout__bottom-item">
          <span class="sp-personal-layout__bottom-icon">📋</span>
          <span class="sp-personal-layout__bottom-label">Movimientos</span>
        </a>
        <a routerLink="/sp/personal/transfer" routerLinkActive="active" class="sp-personal-layout__bottom-item sp-personal-layout__bottom-item--cta">
          <span class="sp-personal-layout__bottom-icon">↗</span>
          <span class="sp-personal-layout__bottom-label">Enviar</span>
        </a>
        <a routerLink="/sp/personal/account" routerLinkActive="active" class="sp-personal-layout__bottom-item">
          <span class="sp-personal-layout__bottom-icon">👤</span>
          <span class="sp-personal-layout__bottom-label">Mi cuenta</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .sp-personal-layout {
      display: flex; flex-direction: column; height: 100vh; max-width: 480px;
      margin: 0 auto; background: #f7fafc; position: relative;
    }

    /* Header */
    .sp-personal-layout__header {
      display: flex; align-items: center; justify-content: space-between;
      background: #3182ce; color: white; padding: 14px 16px; flex-shrink: 0;
    }
    .sp-personal-layout__brand { display: flex; align-items: center; gap: 8px; }
    .sp-personal-layout__brand-logo {
      width: 28px; height: 28px; background: white; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; color: #3182ce; font-weight: 900; font-size: 12px;
    }
    .sp-personal-layout__brand-name { font-weight: 700; font-size: 16px; }
    .sp-personal-layout__user-name { font-size: 13px; opacity: 0.9; }

    /* Content */
    .sp-personal-layout__content { flex: 1; overflow-y: auto; }

    /* Bottom nav */
    .sp-personal-layout__bottom-nav {
      display: flex; background: white; border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .sp-personal-layout__bottom-item {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 10px 0; text-decoration: none; color: #a0aec0; font-size: 11px;
    }
    .sp-personal-layout__bottom-item.active { color: #3182ce; }
    .sp-personal-layout__bottom-item--cta { color: #3182ce; }
    .sp-personal-layout__bottom-icon { font-size: 20px; }
    .sp-personal-layout__bottom-label { font-size: 10px; font-weight: 500; }
  `],
})
export class PersonalLayoutComponent {
  readonly state = inject(SharedStateService);
}
