import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDetailCardComponent } from './account-detail-card.component';
import { FinancialAccount } from '../../../domain/models/financial-account.model';

const makeAccount = (overrides: Partial<FinancialAccount> = {}): FinancialAccount => ({
  account_id: 'acc-001',
  organization_id: 'org-001',
  account_type: 'OPERATIVA',
  status: 'ACTIVE',
  balance: 1000,
  available_balance: 900,
  name: 'Cuenta Principal',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-17T12:00:00Z',
  ...overrides,
});

describe('AccountDetailCardComponent', () => {
  let component: AccountDetailCardComponent;
  let fixture: ComponentFixture<AccountDetailCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountDetailCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDetailCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when account is null and not loading', () => {
    fixture.componentRef.setInput('account', null);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.card-empty')).toBeTruthy();
  });

  it('should show skeleton when isLoading is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.skeleton-title')).toBeTruthy();
  });

  it('should not show account data when loading', () => {
    fixture.componentRef.setInput('account', makeAccount());
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.account-name')).toBeNull();
  });

  it('should display account name when account is provided', () => {
    fixture.componentRef.setInput('account', makeAccount({ name: 'Mi Cuenta' }));
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const nameEl = (fixture.nativeElement as HTMLElement).querySelector('.account-name');
    expect(nameEl?.textContent?.trim()).toBe('Mi Cuenta');
  });

  it('should use account_type as fallback name when name is not set', () => {
    fixture.componentRef.setInput('account', makeAccount({ name: undefined }));
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const nameEl = (fixture.nativeElement as HTMLElement).querySelector('.account-name');
    expect(nameEl?.textContent?.trim()).toBe('OPERATIVA');
  });

  it('should compute totalBalance correctly', () => {
    component.availableBalance = 1000;
    component.pendingBalance = 250;
    expect(component.totalBalance).toBe(1250);
  });

  it('should emit refreshRequested when refresh button is clicked', () => {
    fixture.componentRef.setInput('account', makeAccount());
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    let emitted = false;
    component.refreshRequested.subscribe(() => (emitted = true));

    const btn = (fixture.nativeElement as HTMLElement).querySelector('.refresh-btn') as HTMLButtonElement;
    btn.click();

    expect(emitted).toBeTrue();
  });

  it('getStatusClass should return correct badge class per status', () => {
    expect(component.getStatusClass('ACTIVE')).toBe('badge badge-active');
    expect(component.getStatusClass('FROZEN')).toBe('badge badge-frozen');
    expect(component.getStatusClass('CLOSED')).toBe('badge badge-closed');
  });

  it('getStatusLabel should return spanish labels', () => {
    expect(component.getStatusLabel('ACTIVE')).toBe('Activa');
    expect(component.getStatusLabel('FROZEN')).toBe('Congelada');
    expect(component.getStatusLabel('CLOSED')).toBe('Cerrada');
  });

  it('should display CLABE row when account has clabe', () => {
    fixture.componentRef.setInput('account', makeAccount({ clabe: '012345678901234567' }));
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const clabeEl = (fixture.nativeElement as HTMLElement).querySelector('.clabe');
    expect(clabeEl).toBeTruthy();
    expect(clabeEl?.textContent).toContain('012345678901234567');
  });

  it('should not display CLABE row when account has no clabe', () => {
    fixture.componentRef.setInput('account', makeAccount({ clabe: undefined }));
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const clabeEl = (fixture.nativeElement as HTMLElement).querySelector('.clabe');
    expect(clabeEl).toBeNull();
  });
});
