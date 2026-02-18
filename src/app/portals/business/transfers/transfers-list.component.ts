/**
 * TransfersListComponent - Lista de transferencias SPEI (vista Business)
 *
 * Muestra el historial de transferencias de la empresa cliente B2B.
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
import { TransfersAdapter } from '@infrastructure/adapters/transfers.adapter';
import { SpeiTransfer } from '@domain/models/transfer.model';

@Component({
  selector: 'sp-transfers-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="transfers-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Dashboard</a>
        <h1>Transferencias SPEI</h1>
      </header>

      @if (isLoading()) {
        <div class="loading">Cargando transferencias...</div>
      } @else if (transfers().length === 0) {
        <div class="empty-state">
          <p>No hay transferencias registradas.</p>
        </div>
      } @else {
        <div class="transfers-table-wrapper">
          <table class="transfers-table">
            <thead>
              <tr>
                <th>Destinatario</th>
                <th>CLABE</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              @for (transfer of transfers(); track transfer.transfer_id) {
                <tr>
                  <td>{{ transfer.destination_name }}</td>
                  <td class="clabe">{{ transfer.destination_clabe }}</td>
                  <td>{{ transfer.concept }}</td>
                  <td class="amount">{{ transfer.amount | number: '1.2-2' }} MXN</td>
                  <td>
                    <span
                      class="status-badge"
                      [class.completed]="transfer.status === 'COMPLETED'"
                      [class.pending]="transfer.status === 'PENDING'"
                      [class.processing]="transfer.status === 'PROCESSING'"
                      [class.failed]="transfer.status === 'FAILED'"
                    >
                      {{ transfer.status }}
                    </span>
                  </td>
                  <td class="date">{{ transfer.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .transfers-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    .transfers-table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: auto;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .transfers-table {
      width: 100%;
      border-collapse: collapse;
    }

    .transfers-table th {
      background: #f8fafc;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }

    .transfers-table td {
      padding: 13px 16px;
      font-size: 14px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }

    .clabe {
      font-family: monospace;
      font-size: 12px;
      color: #64748b;
    }

    .amount {
      font-weight: 600;
      text-align: right;
    }

    .date {
      color: #94a3b8;
      font-size: 12px;
    }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge.completed { background: #dcfce7; color: #16a34a; }
    .status-badge.pending   { background: #fef3c7; color: #d97706; }
    .status-badge.processing{ background: #dbeafe; color: #1d4ed8; }
    .status-badge.failed    { background: #fee2e2; color: #dc2626; }
  `],
})
export class TransfersListComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly transfersAdapter = inject(TransfersAdapter);

  readonly isLoading = signal(true);
  readonly transfers = signal<SpeiTransfer[]>([]);

  ngOnInit(): void {
    this.loadTransfers();
  }

  private loadTransfers(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      return;
    }

    this.transfersAdapter.getTransfers(orgId).subscribe({
      next: (response) => {
        this.transfers.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
