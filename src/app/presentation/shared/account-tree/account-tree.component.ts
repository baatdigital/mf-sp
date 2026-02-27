/**
 * AccountTreeComponent
 *
 * Visualiza la jerarquia de cuentas (padre → hijos → nietos).
 * EP-SP-013: US-SP-048
 *
 * Soporta expansion/colapso de nodos, seleccion de cuenta,
 * y diferentes modos de vista (admin, business, personal).
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PENDING';
export type AccountType = 'MASTER' | 'SUB' | 'WALLET' | 'VIRTUAL';

export interface AccountNode {
  id: string;
  label: string;
  clabe: string;
  type: AccountType;
  status: AccountStatus;
  balance?: number;
  currency?: string;
  org_name?: string;
  children?: AccountNode[];
  level?: number;
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Activa', color: '#276749', bg: '#c6f6d5' },
  FROZEN: { label: 'Congelada', color: '#2a4365', bg: '#bee3f8' },
  CLOSED: { label: 'Cerrada', color: '#742a2a', bg: '#fed7d7' },
  PENDING: { label: 'Pendiente', color: '#744210', bg: '#fefcbf' },
};

const TYPE_ICON: Record<AccountType, string> = {
  MASTER: '🏛',
  SUB: '🏢',
  WALLET: '👛',
  VIRTUAL: '💻',
};

@Component({
  selector: 'sp-account-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="sp-tree">
      <!-- Header con busqueda -->
      @if (showSearch()) {
        <div class="sp-tree__search-wrap">
          <input
            type="text"
            [value]="searchTerm()"
            (input)="onSearch($event)"
            placeholder="Buscar cuenta por nombre o CLABE..."
            class="sp-tree__search"
          />
          @if (searchTerm()) {
            <button class="sp-tree__search-clear" (click)="searchTerm.set('')">✕</button>
          }
        </div>
      }

      <!-- Controles expand/collapse -->
      @if (accounts().length > 0) {
        <div class="sp-tree__controls">
          <button class="sp-tree__ctrl-btn" (click)="expandAll()">Expandir todo</button>
          <button class="sp-tree__ctrl-btn" (click)="collapseAll()">Colapsar todo</button>
          <span class="sp-tree__count">{{ totalCount() }} cuenta{{ totalCount() !== 1 ? 's' : '' }}</span>
        </div>
      }

      <!-- Arbol de cuentas -->
      @if (filteredAccounts().length > 0) {
        <div class="sp-tree__root">
          @for (node of filteredAccounts(); track node.id) {
            <ng-container *ngTemplateOutlet="nodeTemplate; context: { node: node, depth: 0 }"></ng-container>
          }
        </div>
      } @else if (searchTerm()) {
        <div class="sp-tree__empty">Sin resultados para "{{ searchTerm() }}"</div>
      } @else {
        <div class="sp-tree__empty">No hay cuentas disponibles</div>
      }

      <!-- Template recursivo (emulado con componente auxiliar) -->
      <ng-template #nodeTemplate let-node="node" let-depth="depth">
        <div [style.padding-left.px]="depth * 24" class="sp-tree__node-wrap">
          <div
            [class]="nodeClass(node)"
            (click)="onNodeClick(node)">

            <!-- Toggle expand -->
            <button
              class="sp-tree__toggle"
              (click)="toggleExpand(node.id, $event)">
              @if (hasChildren(node)) {
                <span>{{ isExpanded(node.id) ? '▾' : '▸' }}</span>
              } @else {
                <span class="sp-tree__toggle-leaf">·</span>
              }
            </button>

            <!-- Icono tipo -->
            <span class="sp-tree__type-icon">{{ typeIcon(node.type) }}</span>

            <!-- Info principal -->
            <div class="sp-tree__node-main">
              <div class="sp-tree__node-top">
                <span class="sp-tree__node-label">{{ node.label }}</span>
                @if (tierMode() === 'admin' && node.org_name) {
                  <span class="sp-tree__org-badge">{{ node.org_name }}</span>
                }
                <span [style]="statusStyle(node.status)" class="sp-tree__status-badge">
                  {{ statusLabel(node.status) }}
                </span>
              </div>
              <div class="sp-tree__node-bottom">
                <span class="sp-tree__clabe">{{ node.clabe }}</span>
                @if (node.balance !== undefined) {
                  <span class="sp-tree__balance">
                    {{ node.balance | currency:(node.currency ?? 'MXN'):'symbol':'1.2-2' }}
                  </span>
                }
                @if (hasChildren(node)) {
                  <span class="sp-tree__children-count">
                    {{ node.children!.length }} sub{{ node.children!.length !== 1 ? 'cuentas' : 'cuenta' }}
                  </span>
                }
              </div>
            </div>

            <!-- Acciones contextuales -->
            @if (showActions() && node.status === 'ACTIVE') {
              <div class="sp-tree__actions" (click)="$event.stopPropagation()">
                <button
                  class="sp-tree__action-btn"
                  title="Transferir"
                  (click)="transferClick.emit(node)">↗</button>
                @if (tierMode() === 'admin') {
                  <button
                    class="sp-tree__action-btn sp-tree__action-btn--danger"
                    title="Congelar"
                    (click)="freezeClick.emit(node)">❄</button>
                }
              </div>
            }
          </div>

          <!-- Hijos recursivos -->
          @if (hasChildren(node) && isExpanded(node.id)) {
            @for (child of node.children!; track child.id) {
              <ng-container *ngTemplateOutlet="nodeTemplate; context: { node: child, depth: depth + 1 }"></ng-container>
            }
          }
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .sp-tree { font-family: system-ui, sans-serif; }

    /* Search */
    .sp-tree__search-wrap { position: relative; margin-bottom: 12px; }
    .sp-tree__search {
      width: 100%; padding: 8px 36px 8px 12px; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box;
    }
    .sp-tree__search:focus { border-color: #3182ce; }
    .sp-tree__search-clear {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      border: none; background: none; cursor: pointer; font-size: 12px; color: #718096;
    }

    /* Controls */
    .sp-tree__controls { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .sp-tree__ctrl-btn {
      padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 11px; cursor: pointer; background: white; color: #4a5568;
    }
    .sp-tree__ctrl-btn:hover { background: #f7fafc; }
    .sp-tree__count { font-size: 11px; color: #a0aec0; margin-left: auto; }

    /* Root */
    .sp-tree__root { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .sp-tree__node-wrap { border-bottom: 1px solid #f7fafc; }
    .sp-tree__node-wrap:last-child { border-bottom: none; }

    /* Node */
    .sp-tree__node {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; cursor: pointer; transition: background 0.15s;
    }
    .sp-tree__node:hover { background: #f7fafc; }
    .sp-tree__node.selected { background: #ebf8ff; }
    .sp-tree__node.frozen { opacity: 0.6; }
    .sp-tree__node.closed { opacity: 0.4; }

    /* Toggle */
    .sp-tree__toggle {
      width: 20px; height: 20px; border: none; background: none;
      cursor: pointer; font-size: 12px; color: #718096; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-tree__toggle-leaf { color: #cbd5e0; }

    /* Type icon */
    .sp-tree__type-icon { font-size: 16px; flex-shrink: 0; }

    /* Main info */
    .sp-tree__node-main { flex: 1; min-width: 0; }
    .sp-tree__node-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .sp-tree__node-label { font-size: 13px; font-weight: 600; color: #2d3748; }
    .sp-tree__org-badge {
      font-size: 10px; padding: 1px 6px; background: #e9d8fd; color: #553c9a;
      border-radius: 10px; font-weight: 500;
    }
    .sp-tree__status-badge { font-size: 10px; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
    .sp-tree__node-bottom { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
    .sp-tree__clabe { font-size: 11px; color: #a0aec0; font-family: monospace; }
    .sp-tree__balance { font-size: 12px; color: #38a169; font-weight: 600; }
    .sp-tree__children-count { font-size: 11px; color: #718096; }

    /* Actions */
    .sp-tree__actions { display: flex; gap: 4px; flex-shrink: 0; }
    .sp-tree__action-btn {
      width: 26px; height: 26px; border: 1px solid #e2e8f0; border-radius: 6px;
      background: white; cursor: pointer; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-tree__action-btn:hover { background: #f7fafc; }
    .sp-tree__action-btn--danger:hover { background: #fff5f5; border-color: #fed7d7; }

    /* Empty */
    .sp-tree__empty { text-align: center; padding: 20px; color: #a0aec0; font-size: 13px; }
  `],
})
export class AccountTreeComponent {
  // Inputs
  accounts = input<AccountNode[]>([]);
  selectedId = input<string | null>(null);
  tierMode = input<'admin' | 'business' | 'personal'>('business');
  showSearch = input(true);
  showActions = input(false);

  // Outputs
  nodeClick = output<AccountNode>();
  transferClick = output<AccountNode>();
  freezeClick = output<AccountNode>();

  // Internal
  readonly searchTerm = signal('');
  private readonly expandedIds = signal<Set<string>>(new Set());

  readonly totalCount = computed(() => this._countAll(this.accounts()));

  readonly filteredAccounts = computed<AccountNode[]>(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.accounts();
    return this._filterNodes(this.accounts(), term);
  });

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    if (val) this.expandAll();
  }

  hasChildren(node: AccountNode): boolean {
    return !!node.children && node.children.length > 0;
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: string, event: Event): void {
    event.stopPropagation();
    const set = new Set(this.expandedIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.expandedIds.set(set);
  }

  expandAll(): void {
    const ids = new Set<string>();
    this._collectIds(this.accounts(), ids);
    this.expandedIds.set(ids);
  }

  collapseAll(): void {
    this.expandedIds.set(new Set());
  }

  onNodeClick(node: AccountNode): void {
    this.nodeClick.emit(node);
    if (this.hasChildren(node)) {
      this.toggleExpand(node.id, new MouseEvent('click'));
    }
  }

  nodeClass(node: AccountNode): string {
    const classes = ['sp-tree__node'];
    if (this.selectedId() === node.id) classes.push('selected');
    if (node.status === 'FROZEN') classes.push('frozen');
    if (node.status === 'CLOSED') classes.push('closed');
    return classes.join(' ');
  }

  typeIcon(type: AccountType): string {
    return TYPE_ICON[type] ?? '📄';
  }

  statusLabel(status: AccountStatus): string {
    return STATUS_CONFIG[status]?.label ?? status;
  }

  statusStyle(status: AccountStatus): string {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return '';
    return `background: ${cfg.bg}; color: ${cfg.color};`;
  }

  private _countAll(nodes: AccountNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + this._countAll(n.children ?? []), 0);
  }

  private _collectIds(nodes: AccountNode[], ids: Set<string>): void {
    for (const n of nodes) {
      if (this.hasChildren(n)) {
        ids.add(n.id);
        this._collectIds(n.children!, ids);
      }
    }
  }

  private _filterNodes(nodes: AccountNode[], term: string): AccountNode[] {
    const result: AccountNode[] = [];
    for (const n of nodes) {
      const matches =
        n.label.toLowerCase().includes(term) ||
        n.clabe.includes(term) ||
        (n.org_name ?? '').toLowerCase().includes(term);
      const filteredChildren = this._filterNodes(n.children ?? [], term);
      if (matches || filteredChildren.length > 0) {
        result.push({ ...n, children: filteredChildren });
      }
    }
    return result;
  }
}
