/**
 * PersonalMovementsComponent
 *
 * Lista de movimientos del usuario personal con filtros simples.
 * Usa MovementsTableComponent en modo "personal" (4 columnas: fecha, concepto, monto, estado).
 * EP-SP-012: US-SP-044
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovementsTableComponent, Movement } from '../../../shared/movements-table/movements-table.component';

const MOCK_MOVIMIENTOS: Movement[] = [
  {
    id: 'mv-001',
    date: '2026-02-26T10:30:00',
    type: 'CREDIT',
    concept: 'Pago de nómina',
    amount: 8500.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-002',
    date: '2026-02-25T18:45:00',
    type: 'DEBIT',
    concept: 'Transferencia a Luis García',
    amount: 1200.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-003',
    date: '2026-02-25T09:15:00',
    type: 'CREDIT',
    concept: 'Reembolso seguro médico',
    amount: 650.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-004',
    date: '2026-02-24T14:00:00',
    type: 'DEBIT',
    concept: 'Pago servicios SPEI',
    amount: 320.50,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-005',
    date: '2026-02-23T11:20:00',
    type: 'CREDIT',
    concept: 'Depósito en efectivo',
    amount: 5000.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-006',
    date: '2026-02-22T16:00:00',
    type: 'DEBIT',
    concept: 'Pago renta',
    amount: 7500.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-007',
    date: '2026-02-21T08:30:00',
    type: 'CREDIT',
    concept: 'Transferencia recibida Ana López',
    amount: 2000.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
  {
    id: 'mv-008',
    date: '2026-02-20T13:45:00',
    type: 'DEBIT',
    concept: 'Retiro ATM',
    amount: 1000.00,
    status: 'CONFIRMED',
    currency: 'MXN',
  },
];

@Component({
  selector: 'sp-personal-movements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MovementsTableComponent],
  template: `
    <div class="sp-personal-movements">

      <header class="sp-personal-movements__header">
        <h1 class="sp-personal-movements__title">Mis movimientos</h1>
        <p class="sp-personal-movements__subtitle">Historial de transacciones de tu cuenta</p>
      </header>

      <div class="sp-personal-movements__table-wrap">
        <sp-movements-table
          [movements]="movimientos()"
          tierMode="personal"
          [showFilters]="true"
          [showExport]="false"
          [showSubtotals]="false"
          [loading]="cargando()"
        />
      </div>

    </div>
  `,
  styles: [`
    .sp-personal-movements {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 16px 32px;
      background: #f0f4f8;
      min-height: 100vh;
    }

    .sp-personal-movements__header {
      margin-bottom: 20px;
    }
    .sp-personal-movements__title {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
      color: #2d3748;
    }
    .sp-personal-movements__subtitle {
      margin: 0;
      font-size: 13px;
      color: #718096;
    }

    .sp-personal-movements__table-wrap {
      background: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
  `],
})
export class PersonalMovementsComponent {
  readonly movimientos = signal<Movement[]>(MOCK_MOVIMIENTOS);
  readonly cargando = signal<boolean>(false);
}
