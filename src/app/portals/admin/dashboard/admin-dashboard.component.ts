/**
 * AdminDashboardComponent - Dashboard del portal administrativo SuperPago
 *
 * Vista principal del Tier 1 (Admin).
 * Muestra metricas globales de la plataforma y accesos rapidos.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SharedStateService } from '@shared-state';
import {
  AdminService,
  PlatformMetrics,
} from '../services/admin.service';

@Component({
  selector: 'sp-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-dashboard">
      <header class="dashboard-header">
        <h1>Panel Administrativo SuperPago</h1>
        <p class="subtitle">Bienvenido, {{ userName() }}</p>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando metricas de la plataforma...</div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else {
        <section class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Organizaciones Registradas</span>
            <span class="metric-value">{{ metrics()?.total_organizations ?? 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Cuentas Activas</span>
            <span class="metric-value">{{ metrics()?.total_active_accounts ?? 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Transacciones Hoy (Total)</span>
            <span class="metric-value accent">{{ metrics()?.transactions_today?.total ?? 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">SPEI Hoy</span>
            <span class="metric-value">{{ metrics()?.transactions_today?.spei ?? 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Cash Hoy</span>
            <span class="metric-value">{{ metrics()?.transactions_today?.cash ?? 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">BillPay Hoy</span>
            <span class="metric-value">{{ metrics()?.transactions_today?.billpay ?? 0 }}</span>
          </div>
        </section>

        <section class="quick-actions">
          <h2>Accesos Rapidos</h2>
          <div class="actions-grid">
            <a routerLink="/sp/admin/organizations" class="action-card">
              <span class="action-icon">&#127970;</span>
              <span>Organizaciones</span>
            </a>
            <a routerLink="/sp/admin/transfers" class="action-card">
              <span class="action-icon">&#8644;</span>
              <span>Transferencias</span>
            </a>
            <a routerLink="/sp/admin/system" class="action-card">
              <span class="action-icon">&#9881;</span>
              <span>Salud del Sistema</span>
            </a>
            <a routerLink="/sp/admin/accounts" class="action-card">
              <span class="action-icon">&#9776;</span>
              <span>Cuentas</span>
            </a>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 32px;
    }

    .dashboard-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px;
    }

    .subtitle {
      color: #64748b;
      margin: 0;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-label {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }

    .metric-value.accent {
      color: #2563eb;
    }

    .quick-actions h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 16px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }

    .action-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      text-decoration: none;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .action-card:hover {
      border-color: #2563eb;
      color: #2563eb;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
    }

    .action-icon {
      font-size: 18px;
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly adminService = inject(AdminService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly metrics = signal<PlatformMetrics | null>(null);
  readonly userName = signal<string>('');

  ngOnInit(): void {
    this.userName.set(this.sharedState.currentUser().name ?? 'Administrador');
    this.loadMetrics();
  }

  private loadMetrics(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.adminService.getPlatformMetrics().subscribe({
      next: (response) => {
        this.metrics.set(response.data ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las metricas de la plataforma.');
        this.isLoading.set(false);
      },
    });
  }
}
