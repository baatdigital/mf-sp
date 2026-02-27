/**
 * PersonalTransferComponent
 *
 * Formulario de transferencia SPEI personal simplificado.
 * Maneja dos estados: 'form' (formulario) y 'tracking' (seguimiento).
 * EP-SP-012: US-SP-045
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { TransferFormComponent, TransferAccount, TransferFormData } from '../../../shared/transfer-form/transfer-form.component';
import { TransferStatusTrackerComponent } from '../../../shared/transfer-status-tracker/transfer-status-tracker.component';

type TransferView = 'form' | 'tracking';

const MOCK_CUENTA_ORIGEN: TransferAccount = {
  id: 'acc-personal-001',
  label: 'Mi cuenta personal',
  clabe: '012180015151515151',
  balance: 12450.75,
  currency: 'MXN',
};

@Component({
  selector: 'sp-personal-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TransferFormComponent, TransferStatusTrackerComponent],
  template: `
    <div class="sp-personal-transfer">

      <header class="sp-personal-transfer__header">
        @if (vistaActual() === 'tracking') {
          <button class="sp-personal-transfer__back-btn" (click)="volverAlFormulario()">
            ← Volver
          </button>
        }
        <h1 class="sp-personal-transfer__title">
          {{ vistaActual() === 'form' ? 'Enviar dinero' : 'Estado de transferencia' }}
        </h1>
      </header>

      <div class="sp-personal-transfer__content">

        @if (vistaActual() === 'form') {
          <sp-transfer-form
            mode="personal"
            [fixedSourceAccount]="cuentaOrigen()"
            (submit)="onFormSubmit($event)"
          />
        }

        @if (vistaActual() === 'tracking') {
          <sp-transfer-status-tracker
            [transferId]="transferIdActivo()"
            [autoRefresh]="true"
            [refreshInterval]="5000"
          />
        }

      </div>

    </div>
  `,
  styles: [`
    .sp-personal-transfer {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 16px 32px;
      background: #f0f4f8;
      min-height: 100vh;
    }

    .sp-personal-transfer__header {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sp-personal-transfer__title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #2d3748;
    }
    .sp-personal-transfer__back-btn {
      align-self: flex-start;
      background: none;
      border: none;
      font-size: 14px;
      color: #3182ce;
      cursor: pointer;
      padding: 0;
      font-weight: 600;
    }
    .sp-personal-transfer__back-btn:hover {
      color: #2b6cb0;
    }

    .sp-personal-transfer__content {
      background: white;
      border-radius: 16px;
      padding: 20px 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
  `],
})
export class PersonalTransferComponent {
  readonly vistaActual = signal<TransferView>('form');
  readonly cuentaOrigen = signal<TransferAccount>(MOCK_CUENTA_ORIGEN);
  readonly transferIdActivo = signal<string>('');

  onFormSubmit(_data: TransferFormData): void {
    // En produccion: llamar al servicio de transferencia y usar el ID real
    const mockTransferId = `txn-${Date.now()}`;
    this.transferIdActivo.set(mockTransferId);
    this.vistaActual.set('tracking');
  }

  volverAlFormulario(): void {
    this.vistaActual.set('form');
    this.transferIdActivo.set('');
  }
}
