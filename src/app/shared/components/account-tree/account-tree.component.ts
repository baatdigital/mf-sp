import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  FinancialAccount,
  AccountStatus,
} from '../../../domain/models/financial-account.model';

interface OrgNode {
  organizationId: string;
  accounts: FinancialAccount[];
  expanded: boolean;
}

@Component({
  selector: 'sp-account-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="account-tree">
      <div class="tree-header">
        <span class="tree-title">Cuentas</span>
        <span class="tree-count">{{ accounts.length }}</span>
      </div>

      <ng-container *ngIf="accounts.length === 0">
        <div class="tree-empty">No hay cuentas disponibles.</div>
      </ng-container>

      <div class="org-node" *ngFor="let org of orgNodes(); trackBy: trackByOrgId">
        <!-- Organization header -->
        <button
          class="org-header"
          (click)="toggleOrg(org.organizationId)"
          [attr.aria-expanded]="org.expanded"
        >
          <span class="expand-icon">{{ org.expanded ? '▾' : '▸' }}</span>
          <span class="org-icon">🏢</span>
          <span class="org-id">{{ org.organizationId | slice:0:12 }}...</span>
          <span class="org-count badge-neutral">{{ org.accounts.length }}</span>
        </button>

        <!-- Account items -->
        <ng-container *ngIf="org.expanded">
          <div
            class="account-item"
            *ngFor="let account of org.accounts; trackBy: trackByAccountId"
            [class.account-selected]="account.account_id === selectedAccountId"
            (click)="selectAccount(account)"
            role="button"
            [attr.aria-pressed]="account.account_id === selectedAccountId"
            [attr.tabindex]="0"
            (keydown.enter)="selectAccount(account)"
            (keydown.space)="selectAccount(account)"
          >
            <div class="account-item-header">
              <span class="account-name">{{ account.name ?? account.account_type }}</span>
              <span [class]="getStatusBadgeClass(account.status)">
                {{ getStatusLabel(account.status) }}
              </span>
            </div>

            <div class="account-item-details">
              <span class="account-type">{{ account.account_type }}</span>
              <span class="account-balance" *ngIf="account.available_balance !== undefined">
                {{ account.available_balance | currency:'MXN':'symbol':'1.2-2' }}
              </span>
            </div>

            <div class="account-id-row" *ngIf="account.clabe">
              <span class="account-clabe">CLABE: {{ account.clabe }}</span>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .account-tree {
      width: 100%;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
      background: #FFFFFF;
    }

    .tree-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }

    .tree-title {
      font-weight: 600;
      color: #111827;
      font-size: 0.9rem;
    }

    .tree-count {
      background: #E5E7EB;
      color: #374151;
      border-radius: 9999px;
      padding: 0.1rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .tree-empty {
      padding: 1.5rem;
      color: #9CA3AF;
      text-align: center;
      font-size: 0.875rem;
    }

    /* Org node */
    .org-node { border-bottom: 1px solid #F3F4F6; }
    .org-node:last-child { border-bottom: none; }

    .org-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.625rem 1rem;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      font-size: 0.875rem;
      color: #374151;
      transition: background 0.15s;
    }

    .org-header:hover { background: #F9FAFB; }

    .expand-icon { color: #9CA3AF; font-size: 0.8rem; width: 12px; }
    .org-icon { font-size: 1rem; }
    .org-id { font-family: monospace; flex: 1; }

    .badge-neutral {
      background: #E5E7EB;
      color: #374151;
      border-radius: 9999px;
      padding: 0.1rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 600;
    }

    /* Account item */
    .account-item {
      padding: 0.625rem 1rem 0.625rem 2.5rem;
      cursor: pointer;
      border-top: 1px solid #F3F4F6;
      transition: background 0.12s;
      outline: none;
    }

    .account-item:hover { background: #F0F9FF; }
    .account-item:focus { box-shadow: inset 0 0 0 2px #3B82F6; }

    .account-selected {
      background: #EFF6FF;
      border-left: 3px solid #3B82F6;
      padding-left: calc(2.5rem - 3px);
    }

    .account-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .account-name {
      font-weight: 500;
      color: #111827;
      font-size: 0.875rem;
    }

    .account-item-details {
      display: flex;
      justify-content: space-between;
      margin-top: 0.2rem;
    }

    .account-type {
      font-size: 0.75rem;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .account-balance {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #059669;
      font-variant-numeric: tabular-nums;
    }

    .account-id-row { margin-top: 0.15rem; }
    .account-clabe { font-size: 0.7rem; color: #9CA3AF; font-family: monospace; }

    /* Status badges */
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
    .badge-active  { background: #D1FAE5; color: #065F46; }
    .badge-frozen  { background: #FEF3C7; color: #92400E; }
    .badge-closed  { background: #F3F4F6; color: #6B7280; }
  `],
})
export class AccountTreeComponent implements OnChanges {
  @Input() accounts: FinancialAccount[] = [];
  @Input() selectedAccountId: string | null = null;
  @Output() accountSelected = new EventEmitter<FinancialAccount>();

  private expandedOrgs = signal<Set<string>>(new Set());

  ngOnChanges(): void {
    // Auto-expand first org on data load
    const orgs = this.getUniqueOrgIds();
    if (orgs.length > 0 && this.expandedOrgs().size === 0) {
      this.expandedOrgs.set(new Set([orgs[0]]));
    }
  }

  orgNodes(): OrgNode[] {
    const expanded = this.expandedOrgs();
    return this.getUniqueOrgIds().map(orgId => ({
      organizationId: orgId,
      accounts: this.accounts.filter(a => a.organization_id === orgId),
      expanded: expanded.has(orgId),
    }));
  }

  toggleOrg(orgId: string): void {
    const current = new Set(this.expandedOrgs());
    if (current.has(orgId)) {
      current.delete(orgId);
    } else {
      current.add(orgId);
    }
    this.expandedOrgs.set(current);
  }

  selectAccount(account: FinancialAccount): void {
    this.accountSelected.emit(account);
  }

  getStatusBadgeClass(status: AccountStatus): string {
    const map: Record<AccountStatus, string> = {
      ACTIVE: 'badge badge-active',
      FROZEN: 'badge badge-frozen',
      CLOSED: 'badge badge-closed',
    };
    return map[status];
  }

  getStatusLabel(status: AccountStatus): string {
    const map: Record<AccountStatus, string> = {
      ACTIVE: 'Activa',
      FROZEN: 'Congelada',
      CLOSED: 'Cerrada',
    };
    return map[status];
  }

  trackByOrgId(_index: number, org: OrgNode): string {
    return org.organizationId;
  }

  trackByAccountId(_index: number, account: FinancialAccount): string {
    return account.account_id;
  }

  private getUniqueOrgIds(): string[] {
    return [...new Set(this.accounts.map(a => a.organization_id))];
  }
}
