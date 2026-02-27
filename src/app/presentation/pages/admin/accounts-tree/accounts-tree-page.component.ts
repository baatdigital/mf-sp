/**
 * AccountsTreePageComponent
 *
 * Visualizacion del grafo global de cuentas del sistema usando
 * el componente compartido AccountTreeComponent en modo admin.
 * EP-SP-008 US-SP-031
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountTreeComponent, AccountNode } from '../../../shared/account-tree/account-tree.component';

@Component({
  selector: 'sp-admin-accounts-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AccountTreeComponent],
  template: `
    <div class="sp-admin-tree">

      <!-- Header -->
      <div class="sp-admin-tree__header">
        <div>
          <h1 class="sp-admin-tree__title">Grafo Global de Cuentas</h1>
          <p class="sp-admin-tree__subtitle">
            Vista jerarquica de todas las cuentas del sistema por organizacion
          </p>
        </div>
        <div class="sp-admin-tree__header-actions">
          <button class="sp-admin-tree__btn sp-admin-tree__btn--secondary"
                  (click)="toggleFrozenOnly()">
            @if (showFrozenOnly()) { Mostrar todas } @else { Solo congeladas }
          </button>
          <button class="sp-admin-tree__btn sp-admin-tree__btn--primary">
            Exportar CSV
          </button>
        </div>
      </div>

      <!-- Stats rapidas -->
      <div class="sp-admin-tree__stats-row">
        <div class="sp-admin-tree__stat">
          <span class="sp-admin-tree__stat-value">{{ totalAccounts() }}</span>
          <span class="sp-admin-tree__stat-label">Cuentas totales</span>
        </div>
        <div class="sp-admin-tree__stat">
          <span class="sp-admin-tree__stat-value">2</span>
          <span class="sp-admin-tree__stat-label">Organizaciones</span>
        </div>
        <div class="sp-admin-tree__stat sp-admin-tree__stat--warning">
          <span class="sp-admin-tree__stat-value">1</span>
          <span class="sp-admin-tree__stat-label">Cuentas congeladas</span>
        </div>
        <div class="sp-admin-tree__stat sp-admin-tree__stat--info">
          <span class="sp-admin-tree__stat-value">$5.8M</span>
          <span class="sp-admin-tree__stat-label">Saldo consolidado MXN</span>
        </div>
      </div>

      <!-- Cuenta seleccionada -->
      @if (selectedAccountId()) {
        <div class="sp-admin-tree__selection-banner">
          Cuenta seleccionada: <strong>{{ selectedAccountId() }}</strong>
          <button class="sp-admin-tree__deselect" (click)="selectedAccountId.set(null)">✕</button>
        </div>
      }

      <!-- Arbol de cuentas -->
      <div class="sp-admin-tree__content">
        <sp-account-tree
          [accounts]="visibleAccounts()"
          [selectedId]="selectedAccountId()"
          tierMode="admin"
          [showSearch]="true"
          [showActions]="true"
          (nodeClick)="onNodeClick($event)"
          (transferClick)="onTransfer($event)"
          (freezeClick)="onFreeze($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    .sp-admin-tree {
      padding: 24px;
      font-family: system-ui, sans-serif;
      max-width: 1280px;
    }

    /* Header */
    .sp-admin-tree__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .sp-admin-tree__title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
    }
    .sp-admin-tree__subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #718096;
    }
    .sp-admin-tree__header-actions { display: flex; gap: 8px; align-items: center; }
    .sp-admin-tree__btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .sp-admin-tree__btn--primary {
      background: #3182ce;
      color: white;
      border: none;
    }
    .sp-admin-tree__btn--primary:hover { background: #2b6cb0; }
    .sp-admin-tree__btn--secondary {
      background: white;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }
    .sp-admin-tree__btn--secondary:hover { background: #f7fafc; }

    /* Stats row */
    .sp-admin-tree__stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .sp-admin-tree__stat {
      flex: 1;
      min-width: 140px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sp-admin-tree__stat--warning { border-left: 4px solid #ed8936; }
    .sp-admin-tree__stat--info { border-left: 4px solid #805ad5; }
    .sp-admin-tree__stat-value { font-size: 24px; font-weight: 700; color: #1a202c; }
    .sp-admin-tree__stat-label { font-size: 11px; color: #718096; }

    /* Selection banner */
    .sp-admin-tree__selection-banner {
      background: #ebf8ff;
      border: 1px solid #bee3f8;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13px;
      color: #2b6cb0;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sp-admin-tree__deselect {
      margin-left: auto;
      border: none;
      background: none;
      cursor: pointer;
      color: #2b6cb0;
      font-size: 14px;
    }

    /* Content */
    .sp-admin-tree__content {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
  `],
})
export class AccountsTreePageComponent {

  readonly selectedAccountId = signal<string | null>(null);
  readonly showFrozenOnly = signal(false);

  readonly allAccounts = signal<AccountNode[]>([
    {
      id: 'org-001-master',
      label: 'Tiendas Mayan S.A.',
      clabe: '012345000000000001',
      type: 'MASTER',
      status: 'ACTIVE',
      balance: 4_820_000,
      currency: 'MXN',
      org_name: 'Tiendas Mayan',
      children: [
        {
          id: 'org-001-sub-norte',
          label: 'Division Norte',
          clabe: '012345000000000002',
          type: 'SUB',
          status: 'ACTIVE',
          balance: 1_200_000,
          currency: 'MXN',
          org_name: 'Tiendas Mayan',
          children: [
            {
              id: 'org-001-wallet-monterrey',
              label: 'Wallet Monterrey',
              clabe: '012345000000000003',
              type: 'WALLET',
              status: 'ACTIVE',
              balance: 320_000,
              currency: 'MXN',
              org_name: 'Tiendas Mayan',
            },
            {
              id: 'org-001-wallet-saltillo',
              label: 'Wallet Saltillo',
              clabe: '012345000000000004',
              type: 'WALLET',
              status: 'FROZEN',
              balance: 85_000,
              currency: 'MXN',
              org_name: 'Tiendas Mayan',
            },
          ],
        },
        {
          id: 'org-001-sub-sur',
          label: 'Division Sur',
          clabe: '012345000000000005',
          type: 'SUB',
          status: 'ACTIVE',
          balance: 950_000,
          currency: 'MXN',
          org_name: 'Tiendas Mayan',
          children: [
            {
              id: 'org-001-wallet-merida',
              label: 'Wallet Merida',
              clabe: '012345000000000006',
              type: 'WALLET',
              status: 'ACTIVE',
              balance: 420_000,
              currency: 'MXN',
              org_name: 'Tiendas Mayan',
            },
          ],
        },
      ],
    },
    {
      id: 'org-002-master',
      label: 'Distribuidora Norteña S.A.',
      clabe: '032180000000000010',
      type: 'MASTER',
      status: 'ACTIVE',
      balance: 980_000,
      currency: 'MXN',
      org_name: 'Distribuidora Norteña',
      children: [
        {
          id: 'org-002-sub-ventas',
          label: 'Cuenta Ventas',
          clabe: '032180000000000011',
          type: 'SUB',
          status: 'ACTIVE',
          balance: 580_000,
          currency: 'MXN',
          org_name: 'Distribuidora Norteña',
        },
        {
          id: 'org-002-virtual-cobros',
          label: 'Virtual Cobros Online',
          clabe: '032180000000000012',
          type: 'VIRTUAL',
          status: 'ACTIVE',
          balance: 400_000,
          currency: 'MXN',
          org_name: 'Distribuidora Norteña',
        },
      ],
    },
  ]);

  readonly visibleAccounts = signal<AccountNode[]>(this.allAccounts());

  totalAccounts(): number {
    return this._countAll(this.allAccounts());
  }

  toggleFrozenOnly(): void {
    const next = !this.showFrozenOnly();
    this.showFrozenOnly.set(next);
    // En produccion filtraria llamando al servicio; aqui es mock
    if (next) {
      this.visibleAccounts.set(this._filterFrozen(this.allAccounts()));
    } else {
      this.visibleAccounts.set(this.allAccounts());
    }
  }

  onNodeClick(node: AccountNode): void {
    this.selectedAccountId.set(node.id === this.selectedAccountId() ? null : node.id);
  }

  onTransfer(node: AccountNode): void {
    console.log('[AccountsTree] Iniciar transferencia desde:', node.id);
  }

  onFreeze(node: AccountNode): void {
    console.log('[AccountsTree] Congelar cuenta:', node.id);
  }

  private _countAll(nodes: AccountNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + this._countAll(n.children ?? []), 0);
  }

  private _filterFrozen(nodes: AccountNode[]): AccountNode[] {
    return nodes.reduce<AccountNode[]>((acc, n) => {
      const frozenChildren = this._filterFrozen(n.children ?? []);
      if (n.status === 'FROZEN' || frozenChildren.length > 0) {
        acc.push({ ...n, children: frozenChildren });
      }
      return acc;
    }, []);
  }
}
