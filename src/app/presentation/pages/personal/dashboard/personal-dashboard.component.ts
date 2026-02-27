/**
 * PersonalDashboardComponent
 *
 * Dashboard personal tipo "home banking mobile".
 * Muestra saldo principal, últimos 5 movimientos y acceso rápido a "Enviar".
 * EP-SP-012: US-SP-043
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface DashboardMovimiento {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  tipo: 'CREDIT' | 'DEBIT';
  estado: string;
}

const MOCK_MOVIMIENTOS: DashboardMovimiento[] = [
  { id: 'mv-001', fecha: '2026-02-26T10:30:00', concepto: 'Pago de nómina', monto: 8500.00, tipo: 'CREDIT', estado: 'CONFIRMED' },
  { id: 'mv-002', fecha: '2026-02-25T18:45:00', concepto: 'Transferencia a Luis García', monto: 1200.00, tipo: 'DEBIT', estado: 'CONFIRMED' },
  { id: 'mv-003', fecha: '2026-02-25T09:15:00', concepto: 'Reembolso seguro médico', monto: 650.00, tipo: 'CREDIT', estado: 'CONFIRMED' },
  { id: 'mv-004', fecha: '2026-02-24T14:00:00', concepto: 'Pago servicios SPEI', monto: 320.50, tipo: 'DEBIT', estado: 'CONFIRMED' },
  { id: 'mv-005', fecha: '2026-02-23T11:20:00', concepto: 'Deposito en efectivo', monto: 5000.00, tipo: 'CREDIT', estado: 'CONFIRMED' },
];

@Component({
  selector: 'sp-personal-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="sp-personal-dashboard">

      <!-- Header saludo -->
      <header class="sp-personal-dashboard__header">
        <div class="sp-personal-dashboard__greeting">
          <span class="sp-personal-dashboard__greeting-label">Bienvenido</span>
          <h1 class="sp-personal-dashboard__greeting-name">Mi cuenta</h1>
        </div>
        <div class="sp-personal-dashboard__avatar">SP</div>
      </header>

      <!-- Card saldo principal -->
      <div class="sp-personal-dashboard__balance-card">
        <span class="sp-personal-dashboard__balance-label">Saldo disponible</span>
        <span class="sp-personal-dashboard__balance-amount">
          {{ saldo() | currency:'MXN':'symbol':'1.2-2' }}
        </span>
        <span class="sp-personal-dashboard__balance-currency">MXN</span>
      </div>

      <!-- Acciones rapidas -->
      <div class="sp-personal-dashboard__quick-actions">
        <a
          class="sp-personal-dashboard__quick-btn sp-personal-dashboard__quick-btn--primary"
          routerLink="../transfer"
        >
          <span class="sp-personal-dashboard__quick-icon">↑</span>
          <span>Enviar</span>
        </a>
        <a
          class="sp-personal-dashboard__quick-btn"
          routerLink="../movements"
        >
          <span class="sp-personal-dashboard__quick-icon">≡</span>
          <span>Movimientos</span>
        </a>
        <a
          class="sp-personal-dashboard__quick-btn"
          routerLink="../account"
        >
          <span class="sp-personal-dashboard__quick-icon">◉</span>
          <span>Cuenta</span>
        </a>
      </div>

      <!-- Ultimos movimientos -->
      <section class="sp-personal-dashboard__section">
        <div class="sp-personal-dashboard__section-header">
          <h2 class="sp-personal-dashboard__section-title">Últimos movimientos</h2>
          <a class="sp-personal-dashboard__ver-todos" routerLink="../movements">Ver todos</a>
        </div>

        <div class="sp-personal-dashboard__movimientos">
          @for (mov of movimientos(); track mov.id) {
            <div class="sp-personal-dashboard__movimiento">
              <div [class]="'sp-personal-dashboard__mov-icon sp-personal-dashboard__mov-icon--' + mov.tipo.toLowerCase()">
                {{ mov.tipo === 'CREDIT' ? '↓' : '↑' }}
              </div>
              <div class="sp-personal-dashboard__mov-info">
                <span class="sp-personal-dashboard__mov-concepto">{{ mov.concepto }}</span>
                <span class="sp-personal-dashboard__mov-fecha">{{ mov.fecha | date:'dd MMM, HH:mm' }}</span>
              </div>
              <div [class]="'sp-personal-dashboard__mov-monto sp-personal-dashboard__mov-monto--' + mov.tipo.toLowerCase()">
                {{ mov.tipo === 'CREDIT' ? '+' : '-' }}{{ mov.monto | currency:'MXN':'symbol':'1.2-2' }}
              </div>
            </div>
          }
        </div>
      </section>

    </div>
  `,
  styles: [`
    .sp-personal-dashboard {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 16px 32px;
      background: #f0f4f8;
      min-height: 100vh;
    }

    /* Header */
    .sp-personal-dashboard__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .sp-personal-dashboard__greeting-label {
      display: block;
      font-size: 12px;
      color: #718096;
    }
    .sp-personal-dashboard__greeting-name {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #2d3748;
    }
    .sp-personal-dashboard__avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3182ce;
      color: white;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Balance card */
    .sp-personal-dashboard__balance-card {
      background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%);
      border-radius: 16px;
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(49, 130, 206, 0.35);
    }
    .sp-personal-dashboard__balance-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .sp-personal-dashboard__balance-amount {
      font-size: 40px;
      font-weight: 800;
      color: white;
      line-height: 1.1;
      letter-spacing: -1px;
    }
    .sp-personal-dashboard__balance-currency {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Quick actions */
    .sp-personal-dashboard__quick-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .sp-personal-dashboard__quick-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 16px 8px;
      background: white;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      color: #4a5568;
      font-weight: 600;
      text-decoration: none;
      transition: box-shadow 0.15s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .sp-personal-dashboard__quick-btn:active {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .sp-personal-dashboard__quick-btn--primary {
      background: #3182ce;
      color: white;
    }
    .sp-personal-dashboard__quick-btn--primary .sp-personal-dashboard__quick-icon {
      color: white;
    }
    .sp-personal-dashboard__quick-icon {
      font-size: 22px;
      color: #3182ce;
      line-height: 1;
    }

    /* Section */
    .sp-personal-dashboard__section {
      background: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .sp-personal-dashboard__section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .sp-personal-dashboard__section-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #2d3748;
    }
    .sp-personal-dashboard__ver-todos {
      font-size: 13px;
      color: #3182ce;
      text-decoration: none;
      font-weight: 600;
    }

    /* Movimientos */
    .sp-personal-dashboard__movimientos {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .sp-personal-dashboard__movimiento {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-personal-dashboard__movimiento:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .sp-personal-dashboard__mov-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .sp-personal-dashboard__mov-icon--credit {
      background: #c6f6d5;
      color: #276749;
    }
    .sp-personal-dashboard__mov-icon--debit {
      background: #fed7d7;
      color: #9b2c2c;
    }
    .sp-personal-dashboard__mov-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .sp-personal-dashboard__mov-concepto {
      font-size: 13px;
      font-weight: 600;
      color: #2d3748;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sp-personal-dashboard__mov-fecha {
      font-size: 11px;
      color: #a0aec0;
    }
    .sp-personal-dashboard__mov-monto {
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .sp-personal-dashboard__mov-monto--credit {
      color: #276749;
    }
    .sp-personal-dashboard__mov-monto--debit {
      color: #c53030;
    }
  `],
})
export class PersonalDashboardComponent {
  readonly saldo = signal<number>(12450.75);
  readonly movimientos = signal<DashboardMovimiento[]>(MOCK_MOVIMIENTOS);
}
