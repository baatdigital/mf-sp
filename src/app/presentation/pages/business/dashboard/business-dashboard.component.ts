/**
 * BusinessDashboardComponent
 *
 * Dashboard principal de la empresa con KPIs consolidados,
 * ultimos movimientos y accesos rapidos.
 * EP-SP-011: US-SP-036
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface KpiCard {
  label: string;
  value: number;
  type: 'currency' | 'number';
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface QuickMovement {
  id: string;
  date: string;
  concept: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  counterpart: string;
}

@Component({
  selector: 'sp-business-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="sp-business-dashboard">

      <!-- Header -->
      <div class="sp-business-dashboard__header">
        <div>
          <h1 class="sp-business-dashboard__title">Dashboard Empresarial</h1>
          <p class="sp-business-dashboard__subtitle">Resumen financiero de la organizacion</p>
        </div>
        <span class="sp-business-dashboard__date">{{ today | date:'EEEE d MMMM, yyyy':'':'es' }}</span>
      </div>

      <!-- KPI Cards -->
      <div class="sp-business-dashboard__kpis">
        @for (kpi of kpis(); track kpi.label) {
          <div class="sp-business-dashboard__kpi-card">
            <span class="sp-business-dashboard__kpi-label">{{ kpi.label }}</span>
            @if (kpi.type === 'currency') {
              <span class="sp-business-dashboard__kpi-value">
                {{ kpi.value | currency:'MXN':'symbol':'1.2-2' }}
              </span>
            } @else {
              <span class="sp-business-dashboard__kpi-value">{{ kpi.value }}</span>
            }
            @if (kpi.subtitle) {
              <span class="sp-business-dashboard__kpi-subtitle">{{ kpi.subtitle }}</span>
            }
            @if (kpi.trend) {
              <span [class]="'sp-business-dashboard__kpi-trend sp-business-dashboard__kpi-trend--' + kpi.trend">
                {{ kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—' }}
              </span>
            }
          </div>
        }
      </div>

      <!-- Contenido principal -->
      <div class="sp-business-dashboard__body">

        <!-- Ultimos movimientos -->
        <div class="sp-business-dashboard__movements-card">
          <div class="sp-business-dashboard__card-header">
            <h2 class="sp-business-dashboard__card-title">Ultimos movimientos</h2>
            <a routerLink="/sp/business/movements" class="sp-business-dashboard__link">Ver todos</a>
          </div>
          <div class="sp-business-dashboard__movements-list">
            @for (mov of recentMovements(); track mov.id) {
              <div class="sp-business-dashboard__movement-row">
                <div [class]="'sp-business-dashboard__movement-indicator sp-business-dashboard__movement-indicator--' + mov.type.toLowerCase()">
                  {{ mov.type === 'CREDIT' ? '+' : '-' }}
                </div>
                <div class="sp-business-dashboard__movement-info">
                  <span class="sp-business-dashboard__movement-concept">{{ mov.concept }}</span>
                  <span class="sp-business-dashboard__movement-counterpart">{{ mov.counterpart }}</span>
                </div>
                <div class="sp-business-dashboard__movement-right">
                  <span [class]="'sp-business-dashboard__movement-amount sp-business-dashboard__movement-amount--' + mov.type.toLowerCase()">
                    {{ mov.type === 'CREDIT' ? '+' : '-' }}{{ mov.amount | currency:'MXN':'symbol':'1.2-2' }}
                  </span>
                  <span class="sp-business-dashboard__movement-date">{{ mov.date | date:'d MMM':'':'es' }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Accesos rapidos -->
        <div class="sp-business-dashboard__quick-card">
          <h2 class="sp-business-dashboard__card-title">Accesos rapidos</h2>
          <div class="sp-business-dashboard__quick-actions">
            <a routerLink="/sp/business/transfers/spei" class="sp-business-dashboard__quick-btn">
              <span class="sp-business-dashboard__quick-icon">↗</span>
              <span class="sp-business-dashboard__quick-label">Transferir SPEI</span>
            </a>
            <a routerLink="/sp/business/transfers/internal" class="sp-business-dashboard__quick-btn">
              <span class="sp-business-dashboard__quick-icon">⇄</span>
              <span class="sp-business-dashboard__quick-label">Movimiento Interno</span>
            </a>
            <a routerLink="/sp/business/accounts/tree" class="sp-business-dashboard__quick-btn">
              <span class="sp-business-dashboard__quick-icon">🌲</span>
              <span class="sp-business-dashboard__quick-label">Ver Arbol</span>
            </a>
            <a routerLink="/sp/business/accounts" class="sp-business-dashboard__quick-btn">
              <span class="sp-business-dashboard__quick-icon">🏦</span>
              <span class="sp-business-dashboard__quick-label">Mis Cuentas</span>
            </a>
            <a routerLink="/sp/business/beneficiaries" class="sp-business-dashboard__quick-btn">
              <span class="sp-business-dashboard__quick-icon">👥</span>
              <span class="sp-business-dashboard__quick-label">Beneficiarios</span>
            </a>
            <a routerLink="/sp/business/approvals" class="sp-business-dashboard__quick-btn sp-business-dashboard__quick-btn--alert">
              <span class="sp-business-dashboard__quick-icon">✅</span>
              <span class="sp-business-dashboard__quick-label">Aprobaciones</span>
              @if (pendingApprovals() > 0) {
                <span class="sp-business-dashboard__badge">{{ pendingApprovals() }}</span>
              }
            </a>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .sp-business-dashboard { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-business-dashboard__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .sp-business-dashboard__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-business-dashboard__subtitle { font-size: 13px; color: #718096; margin: 0; }
    .sp-business-dashboard__date { font-size: 12px; color: #a0aec0; text-transform: capitalize; }

    /* KPIs */
    .sp-business-dashboard__kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .sp-business-dashboard__kpi-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 18px 20px; display: flex; flex-direction: column; gap: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-business-dashboard__kpi-label { font-size: 11px; color: #718096; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .sp-business-dashboard__kpi-value { font-size: 22px; font-weight: 700; color: #1a202c; }
    .sp-business-dashboard__kpi-subtitle { font-size: 11px; color: #a0aec0; }
    .sp-business-dashboard__kpi-trend { font-size: 11px; }
    .sp-business-dashboard__kpi-trend--up { color: #38a169; }
    .sp-business-dashboard__kpi-trend--down { color: #e53e3e; }
    .sp-business-dashboard__kpi-trend--neutral { color: #718096; }

    /* Body */
    .sp-business-dashboard__body { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }

    /* Card base */
    .sp-business-dashboard__movements-card,
    .sp-business-dashboard__quick-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sp-business-dashboard__card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .sp-business-dashboard__card-title { font-size: 15px; font-weight: 700; color: #2d3748; margin: 0 0 16px; }
    .sp-business-dashboard__link { font-size: 12px; color: #3182ce; text-decoration: none; }
    .sp-business-dashboard__link:hover { text-decoration: underline; }

    /* Movements */
    .sp-business-dashboard__movements-list { display: flex; flex-direction: column; }
    .sp-business-dashboard__movement-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid #f7fafc;
    }
    .sp-business-dashboard__movement-row:last-child { border-bottom: none; }
    .sp-business-dashboard__movement-indicator {
      width: 32px; height: 32px; border-radius: 50%; font-size: 16px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sp-business-dashboard__movement-indicator--credit { background: #c6f6d5; color: #276749; }
    .sp-business-dashboard__movement-indicator--debit { background: #fed7d7; color: #742a2a; }
    .sp-business-dashboard__movement-info { flex: 1; min-width: 0; }
    .sp-business-dashboard__movement-concept { font-size: 13px; font-weight: 600; color: #2d3748; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sp-business-dashboard__movement-counterpart { font-size: 11px; color: #a0aec0; display: block; }
    .sp-business-dashboard__movement-right { text-align: right; flex-shrink: 0; }
    .sp-business-dashboard__movement-amount { font-size: 13px; font-weight: 700; display: block; }
    .sp-business-dashboard__movement-amount--credit { color: #38a169; }
    .sp-business-dashboard__movement-amount--debit { color: #e53e3e; }
    .sp-business-dashboard__movement-date { font-size: 11px; color: #a0aec0; }

    /* Quick actions */
    .sp-business-dashboard__quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .sp-business-dashboard__quick-btn {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 14px 10px; background: #f7fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; cursor: pointer; text-decoration: none;
      transition: all 0.15s; position: relative;
    }
    .sp-business-dashboard__quick-btn:hover { background: #ebf8ff; border-color: #90cdf4; }
    .sp-business-dashboard__quick-btn--alert { border-color: #fbb6ce; background: #fff5f7; }
    .sp-business-dashboard__quick-icon { font-size: 20px; }
    .sp-business-dashboard__quick-label { font-size: 11px; font-weight: 600; color: #4a5568; text-align: center; }
    .sp-business-dashboard__badge {
      position: absolute; top: -6px; right: -6px;
      background: #e53e3e; color: white; font-size: 10px; font-weight: 700;
      width: 18px; height: 18px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }

    @media (max-width: 1024px) {
      .sp-business-dashboard__body { grid-template-columns: 1fr; }
    }
  `],
})
export class BusinessDashboardComponent {
  readonly today = new Date();

  readonly kpis = signal<KpiCard[]>([
    { label: 'Saldo Total Consolidado', value: 4_820_350.75, type: 'currency', subtitle: '4 cuentas activas', trend: 'up' },
    { label: 'Transferencias Hoy', value: 12, type: 'number', subtitle: 'cantidad', trend: 'neutral' },
    { label: 'Monto Transferido Hoy', value: 345_800.00, type: 'currency', subtitle: 'SPEI + internos', trend: 'down' },
    { label: 'Cuentas Activas', value: 4, type: 'number', subtitle: 'de 5 totales', trend: 'neutral' },
  ]);

  readonly recentMovements = signal<QuickMovement[]>([
    { id: 'mov-001', date: '2026-02-26', concept: 'Pago a proveedor', amount: 58_000.00, type: 'DEBIT', counterpart: 'Proveedor ABC SA' },
    { id: 'mov-002', date: '2026-02-26', concept: 'Cobro de cliente', amount: 120_500.00, type: 'CREDIT', counterpart: 'Cliente XYZ' },
    { id: 'mov-003', date: '2026-02-25', concept: 'Nomina quincenal', amount: 210_000.00, type: 'DEBIT', counterpart: 'Multiple destinatarios' },
    { id: 'mov-004', date: '2026-02-25', concept: 'Deposito socio', amount: 500_000.00, type: 'CREDIT', counterpart: 'Juan Garcia Soto' },
    { id: 'mov-005', date: '2026-02-24', concept: 'Renta oficina', amount: 35_000.00, type: 'DEBIT', counterpart: 'Inmobiliaria Moderna' },
  ]);

  readonly pendingApprovals = signal(3);

  readonly totalBalance = computed(() =>
    this.kpis()[0]?.value ?? 0
  );
}
