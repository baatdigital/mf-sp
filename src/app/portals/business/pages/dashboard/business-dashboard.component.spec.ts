import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { BusinessDashboardPageComponent } from './business-dashboard.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { BusinessService } from '../../services/business.service';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';
import { LedgerEntry } from '../../../../domain/models/ledger-entry.model';

const mockAccount: FinancialAccount = {
  account_id: 'acc-1',
  organization_id: 'org-1',
  account_type: 'CONCENTRADORA',
  status: 'ACTIVE',
  balance: 100000,
  available_balance: 95000,
  created_at: '2025-01-01T00:00:00Z',
};

const mockEntry: LedgerEntry = {
  entry_id: 'entry-1',
  account_id: 'acc-1',
  organization_id: 'org-1',
  entry_type: 'CREDIT',
  amount: 5000,
  category: 'SPEI_IN',
  concept: 'Pago recibido',
  balance_after: 100000,
  created_at: '2025-01-15T10:00:00Z',
};

describe('BusinessDashboardPageComponent', () => {
  let fixture: ComponentFixture<BusinessDashboardPageComponent>;
  let component: BusinessDashboardPageComponent;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;
  let sharedStateSpy: jasmine.SpyObj<SharedStateService>;

  beforeEach(async () => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', [
      'getAccounts',
      'getBalance',
      'getLedgerEntries',
    ]);
    sharedStateSpy = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal('org-1'),
      tenant: signal({ name: 'TestOrg', id: 'tenant-1', apiKey: 'key' }),
    });

    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    accountsAdapterSpy.getLedgerEntries.and.returnValue(
      of({ success: true, data: [mockEntry] })
    );
    accountsAdapterSpy.getBalance.and.returnValue(
      of({ success: true, data: { account_id: 'acc-1', balance: 100000, available_balance: 95000, frozen_balance: 1000, currency: 'MXN', updated_at: '2025-01-01T00:00:00Z' } })
    );

    await TestBed.configureTestingModule({
      imports: [BusinessDashboardPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
        { provide: BusinessService, useValue: jasmine.createSpyObj('BusinessService', ['getReports']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessDashboardPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render page title', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.biz-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Portal Empresarial');
  });

  it('should load accounts on init and set activeAccountsCount', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(component.activeAccountsCount()).toBe(1);
  });

  it('should show loading state initially', () => {
    // Before change detection, isLoading should be true
    expect(component.isLoading()).toBeTrue();
    const compiled = fixture.nativeElement;
    fixture.detectChanges();
    // After full load, loading should be false
  });

  it('should set error when no org id is available', async () => {
    sharedStateSpy = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal(null),
      tenant: signal({ name: 'TestOrg', id: 'tenant-1', apiKey: 'key' }),
    });

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BusinessDashboardPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
        { provide: BusinessService, useValue: jasmine.createSpyObj('BusinessService', ['getReports']) },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(BusinessDashboardPageComponent);
    const c = f.componentInstance;
    f.detectChanges();
    await f.whenStable();
    expect(c.error()).toBeTruthy();
    expect(c.isLoading()).toBeFalse();
  });

  it('should set error when accounts API fails', async () => {
    accountsAdapterSpy.getAccounts.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should load recent movements after accounts load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalledWith('org-1', 'acc-1', 1, 5);
    expect(component.recentMovements().length).toBe(1);
  });

  it('should call getBalance when refreshPrimaryAccount is called', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.refreshPrimaryAccount();
    expect(accountsAdapterSpy.getBalance).toHaveBeenCalledWith('org-1', 'acc-1');
  });

  it('should compute totalBalance from accounts', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalBalance()).toBe(95000);
  });
});
