import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountTreeComponent } from './account-tree.component';
import { FinancialAccount, AccountStatus } from '../../../domain/models/financial-account.model';

const makeAccount = (overrides: Partial<FinancialAccount> = {}): FinancialAccount => ({
  account_id: 'acc-001',
  organization_id: 'org-001',
  account_type: 'OPERATIVA',
  status: 'ACTIVE',
  balance: 1000,
  available_balance: 900,
  name: 'Cuenta Operativa',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('AccountTreeComponent', () => {
  let component: AccountTreeComponent;
  let fixture: ComponentFixture<AccountTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty message when no accounts', () => {
    component.accounts = [];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tree-empty')).toBeTruthy();
  });

  it('should render org node for each unique organization', () => {
    component.accounts = [
      makeAccount({ organization_id: 'org-A', account_id: 'a1' }),
      makeAccount({ organization_id: 'org-A', account_id: 'a2' }),
      makeAccount({ organization_id: 'org-B', account_id: 'a3' }),
    ];
    component.ngOnChanges();
    fixture.detectChanges();
    const orgHeaders = (fixture.nativeElement as HTMLElement).querySelectorAll('.org-header');
    expect(orgHeaders.length).toBe(2);
  });

  it('should expand first org automatically on ngOnChanges', () => {
    component.accounts = [makeAccount({ organization_id: 'org-001' })];
    component.ngOnChanges();
    fixture.detectChanges();
    const nodes = component.orgNodes();
    expect(nodes[0].expanded).toBeTrue();
  });

  it('should emit accountSelected when account item clicked', () => {
    const account = makeAccount();
    component.accounts = [account];
    component.ngOnChanges();
    fixture.detectChanges();

    const emittedValues: FinancialAccount[] = [];
    component.accountSelected.subscribe((a: FinancialAccount) => emittedValues.push(a));

    const accountItem = (fixture.nativeElement as HTMLElement).querySelector('.account-item');
    (accountItem as HTMLElement).click();

    expect(emittedValues.length).toBe(1);
    expect(emittedValues[0].account_id).toBe('acc-001');
  });

  it('should highlight selected account with account-selected class', () => {
    component.accounts = [makeAccount({ account_id: 'acc-selected' })];
    component.selectedAccountId = 'acc-selected';
    component.ngOnChanges();
    fixture.detectChanges();

    const selected = (fixture.nativeElement as HTMLElement).querySelector('.account-selected');
    expect(selected).toBeTruthy();
  });

  it('should not apply selected class when no account is selected', () => {
    component.accounts = [makeAccount()];
    component.selectedAccountId = null;
    component.ngOnChanges();
    fixture.detectChanges();

    const selected = (fixture.nativeElement as HTMLElement).querySelector('.account-selected');
    expect(selected).toBeNull();
  });

  it('getStatusBadgeClass should return correct class per status', () => {
    expect(component.getStatusBadgeClass('ACTIVE')).toBe('badge badge-active');
    expect(component.getStatusBadgeClass('FROZEN')).toBe('badge badge-frozen');
    expect(component.getStatusBadgeClass('CLOSED')).toBe('badge badge-closed');
  });

  it('getStatusLabel should return spanish label', () => {
    expect(component.getStatusLabel('ACTIVE')).toBe('Activa');
    expect(component.getStatusLabel('FROZEN')).toBe('Congelada');
    expect(component.getStatusLabel('CLOSED')).toBe('Cerrada');
  });

  it('toggleOrg should expand a collapsed org and collapse an expanded org', () => {
    component.accounts = [makeAccount({ organization_id: 'org-X' })];
    component.ngOnChanges();

    // org-X starts expanded (first org auto-expanded)
    expect(component.orgNodes()[0].expanded).toBeTrue();

    component.toggleOrg('org-X');
    expect(component.orgNodes()[0].expanded).toBeFalse();

    component.toggleOrg('org-X');
    expect(component.orgNodes()[0].expanded).toBeTrue();
  });

  it('trackByOrgId should return organizationId', () => {
    const node = { organizationId: 'org-Z', accounts: [], expanded: false };
    expect(component.trackByOrgId(0, node)).toBe('org-Z');
  });

  it('trackByAccountId should return account_id', () => {
    const account = makeAccount({ account_id: 'acc-ZZZ' });
    expect(component.trackByAccountId(0, account)).toBe('acc-ZZZ');
  });
});
