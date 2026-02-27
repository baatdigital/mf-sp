/**
 * AccountsTreeComponent
 *
 * Vista de arbol de cuentas de la organizacion.
 * EP-SP-011: US-SP-039
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccountTreeComponent, AccountNode } from '../../../shared/account-tree/account-tree.component';

@Component({
  selector: 'sp-business-accounts-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, AccountTreeComponent],
  template: `
    <div class="sp-business-accounts-tree">

      <!-- Header -->
      <div class="sp-business-accounts-tree__header">
        <div>
          <a routerLink="/sp/business/accounts" class="sp-business-accounts-tree__back">
            ← Volver a Cuentas
          </a>
          <h1 class="sp-business-accounts-tree__title">Arbol de Cuentas</h1>
          <p class="sp-business-accounts-tree__subtitle">
            Jerarquia completa de las cuentas de tu organizacion
          </p>
        </div>
        <a routerLink="/sp/business/accounts/new" class="sp-business-accounts-tree__btn">
          + Nueva Cuenta
        </a>
      </div>

      <!-- Info -->
      <div class="sp-business-accounts-tree__info-bar">
        <span class="sp-business-accounts-tree__info-item">
          <strong>1</strong> cuenta maestra
        </span>
        <span class="sp-business-accounts-tree__info-sep">·</span>
        <span class="sp-business-accounts-tree__info-item">
          <strong>3</strong> subcuentas directas
        </span>
        <span class="sp-business-accounts-tree__info-sep">·</span>
        <span class="sp-business-accounts-tree__info-item">
          <strong>2</strong> cuentas nietas
        </span>
      </div>

      <!-- Arbol -->
      <div class="sp-business-accounts-tree__tree-wrap">
        <sp-account-tree
          [accounts]="treeData()"
          tierMode="business"
          [showSearch]="true"
          [showActions]="true"
          (nodeClick)="onNodeClick($event)"
          (transferClick)="onTransferClick($event)"
        />
      </div>

      <!-- Cuenta seleccionada (panel lateral) -->
      @if (selectedNode()) {
        <div class="sp-business-accounts-tree__selected-panel">
          <div class="sp-business-accounts-tree__selected-header">
            <h3>Cuenta seleccionada</h3>
            <button (click)="selectedNode.set(null)" class="sp-business-accounts-tree__close-btn">✕</button>
          </div>
          <div class="sp-business-accounts-tree__selected-info">
            <p><strong>{{ selectedNode()!.label }}</strong></p>
            <p class="sp-business-accounts-tree__selected-clabe">{{ selectedNode()!.clabe }}</p>
          </div>
          <div class="sp-business-accounts-tree__selected-actions">
            <a
              [routerLink]="['/sp/business/accounts', selectedNode()!.id]"
              class="sp-business-accounts-tree__action-btn sp-business-accounts-tree__action-btn--primary">
              Ver detalle
            </a>
            <a
              routerLink="/sp/business/transfers/spei"
              class="sp-business-accounts-tree__action-btn">
              Transferir
            </a>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-business-accounts-tree { padding: 24px; max-width: 900px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-business-accounts-tree__back { font-size: 13px; color: #3182ce; text-decoration: none; display: block; margin-bottom: 8px; }
    .sp-business-accounts-tree__back:hover { text-decoration: underline; }
    .sp-business-accounts-tree__header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
    .sp-business-accounts-tree__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-business-accounts-tree__subtitle { font-size: 13px; color: #718096; margin: 0; }
    .sp-business-accounts-tree__btn {
      padding: 8px 18px; background: #3182ce; color: white; border-radius: 8px;
      font-size: 13px; font-weight: 600; text-decoration: none;
    }
    .sp-business-accounts-tree__btn:hover { background: #2b6cb0; }

    /* Info bar */
    .sp-business-accounts-tree__info-bar {
      display: flex; gap: 8px; align-items: center;
      background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 10px 16px; margin-bottom: 20px; font-size: 13px; color: #4a5568;
    }
    .sp-business-accounts-tree__info-item strong { color: #2d3748; }
    .sp-business-accounts-tree__info-sep { color: #cbd5e0; }

    /* Tree wrap */
    .sp-business-accounts-tree__tree-wrap {
      background: white; border-radius: 12px; padding: 16px;
      border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* Selected panel */
    .sp-business-accounts-tree__selected-panel {
      margin-top: 16px; background: #ebf8ff; border: 1px solid #90cdf4;
      border-radius: 10px; padding: 16px;
    }
    .sp-business-accounts-tree__selected-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
    }
    .sp-business-accounts-tree__selected-header h3 { font-size: 14px; color: #2c5282; margin: 0; }
    .sp-business-accounts-tree__close-btn {
      border: none; background: none; cursor: pointer; font-size: 14px; color: #718096;
    }
    .sp-business-accounts-tree__selected-info p { margin: 0 0 4px; font-size: 13px; color: #2d3748; }
    .sp-business-accounts-tree__selected-clabe { font-family: monospace; font-size: 12px; color: #718096; }
    .sp-business-accounts-tree__selected-actions { display: flex; gap: 8px; margin-top: 12px; }
    .sp-business-accounts-tree__action-btn {
      padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 600;
      text-decoration: none; border: 1px solid #bee3f8; background: white; color: #2c5282;
    }
    .sp-business-accounts-tree__action-btn:hover { background: #f7fafc; }
    .sp-business-accounts-tree__action-btn--primary { background: #3182ce; color: white; border-color: #3182ce; }
    .sp-business-accounts-tree__action-btn--primary:hover { background: #2b6cb0; }
  `],
})
export class AccountsTreeComponent {
  readonly selectedNode = signal<AccountNode | null>(null);

  readonly treeData = signal<AccountNode[]>([
    {
      id: 'acc-master-001',
      label: 'Cuenta Maestra Principal',
      clabe: '646180110400000001',
      type: 'MASTER',
      status: 'ACTIVE',
      balance: 3_120_500.00,
      currency: 'MXN',
      children: [
        {
          id: 'acc-sub-001',
          label: 'Subcuenta Operaciones',
          clabe: '646180110400000002',
          type: 'SUB',
          status: 'ACTIVE',
          balance: 854_200.50,
          currency: 'MXN',
          children: [
            {
              id: 'acc-sub-001a',
              label: 'Wallet Norte',
              clabe: '646180110400000005',
              type: 'WALLET',
              status: 'ACTIVE',
              balance: 120_000.00,
              currency: 'MXN',
              children: [],
            },
            {
              id: 'acc-sub-001b',
              label: 'Wallet Sur',
              clabe: '646180110400000006',
              type: 'WALLET',
              status: 'ACTIVE',
              balance: 98_500.00,
              currency: 'MXN',
              children: [],
            },
          ],
        },
        {
          id: 'acc-sub-002',
          label: 'Subcuenta Nomina',
          clabe: '646180110400000003',
          type: 'SUB',
          status: 'ACTIVE',
          balance: 420_000.00,
          currency: 'MXN',
          children: [],
        },
        {
          id: 'acc-wallet-001',
          label: 'Wallet Proveedores',
          clabe: '646180110400000004',
          type: 'WALLET',
          status: 'FROZEN',
          balance: 75_650.25,
          currency: 'MXN',
          children: [],
        },
      ],
    },
  ]);

  onNodeClick(node: AccountNode): void {
    this.selectedNode.set(node);
  }

  onTransferClick(node: AccountNode): void {
    this.selectedNode.set(node);
  }
}
