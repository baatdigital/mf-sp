import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { BusinessReportsComponent } from './business-reports.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { BusinessService } from '../../services/business.service';
import { LedgerEntry } from '../../../../domain/models/ledger-entry.model';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';

const mockAccount: FinancialAccount = {
  account_id: 'acc-1',
  organization_id: 'org-1',
  account_type: 'CONCENTRADORA',
  status: 'ACTIVE',
  balance: 100000,
  available_balance: 95000,
  created_at: '2025-01-01T00:00:00Z',
};

const mockEntries: LedgerEntry[] = [
  {
    entry_id: 'e1',
    account_id: 'acc-1',
    organization_id: 'org-1',
    entry_type: 'CREDIT',
    amount: 10000,
    category: 'SPEI_IN',
    concept: 'Empresa ABC',
    balance_after: 110000,
    created_at: new Date().toISOString(), // today
  },
  {
    entry_id: 'e2',
    account_id: 'acc-1',
    organization_id: 'org-1',
    entry_type: 'DEBIT',
    amount: 3000,
    category: 'SPEI_OUT',
    concept: 'Proveedor XYZ',
    balance_after: 107000,
    created_at: new Date().toISOString(),
  },
  {
    entry_id: 'e3',
    account_id: 'acc-1',
    organization_id: 'org-1',
    entry_type: 'DEBIT',
    amount: 500,
    category: 'FEE',
    concept: 'Comision SPEI',
    balance_after: 106500,
    created_at: new Date().toISOString(),
  },
];

describe('BusinessReportsComponent', () => {
  let fixture: ComponentFixture<BusinessReportsComponent>;
  let component: BusinessReportsComponent;
  let businessServiceSpy: jasmine.SpyObj<BusinessService>;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  beforeEach(async () => {
    businessServiceSpy = jasmine.createSpyObj('BusinessService', ['getReports']);
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', [
      'getAccounts',
      'getLedgerEntries',
    ]);

    businessServiceSpy.getReports.and.returnValue(
      of({ success: true, data: { entries: mockEntries } })
    );
    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    accountsAdapterSpy.getLedgerEntries.and.returnValue(
      of({ success: true, data: mockEntries })
    );

    const sharedStateSpy = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal('org-1'),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    await TestBed.configureTestingModule({
      imports: [BusinessReportsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BusinessService, useValue: businessServiceSpy },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessReportsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render page title', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.page-title');
    expect(title.textContent).toContain('Reportes Empresariales');
  });

  it('should load reports on init and compute totals', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(businessServiceSpy.getReports).toHaveBeenCalledWith('org-1', 'this_month');
    expect(component.totalCredits()).toBe(10000);
    expect(component.totalDebits()).toBe(3500); // 3000 + 500
    expect(component.netBalance()).toBe(6500);
    expect(component.totalMovements()).toBe(3);
  });

  it('should change period and reload when selectPeriod is called', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    businessServiceSpy.getReports.calls.reset();
    component.selectPeriod('last_month');

    expect(component.selectedPeriod()).toBe('last_month');
    expect(businessServiceSpy.getReports).toHaveBeenCalledWith('org-1', 'last_month');
  });

  it('should show error when no org available', async () => {
    const noOrgState = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal(null),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BusinessReportsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BusinessService, useValue: businessServiceSpy },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: noOrgState },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(BusinessReportsComponent);
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.error()).toBeTruthy();
  });

  it('should fallback to ledger when getReports fails', async () => {
    businessServiceSpy.getReports.and.returnValue(
      throwError(() => new Error('Reports endpoint not available'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    // Falls back to getAccounts -> getLedgerEntries
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalled();
    expect(component.allEntries().length).toBeGreaterThan(0);
  });

  it('should compute topDestinations from SPEI_OUT entries', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const destinations = component.topDestinations();
    expect(destinations.length).toBeGreaterThanOrEqual(1);
    expect(destinations[0].name).toBe('Proveedor XYZ');
    expect(destinations[0].total).toBe(3000);
  });

  it('should compute categorySummary from DEBIT entries', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const summary = component.categorySummary();
    expect(summary.length).toBeGreaterThanOrEqual(2);
    const speiOut = summary.find((c) => c.category === 'SPEI_OUT');
    expect(speiOut).toBeTruthy();
    expect(speiOut!.total).toBe(3000);
  });

  it('getBarHeight should return 0 when maxValue is 0', () => {
    expect(component.getBarHeight(0, 0)).toBe(0);
  });

  it('getBarHeight should return proportional height', () => {
    expect(component.getBarHeight(50, 100)).toBe(50);
  });

  it('getBarHeight should return minimum 2 for small values', () => {
    expect(component.getBarHeight(1, 1000)).toBeGreaterThanOrEqual(2);
  });

  it('getCategoryPercent should return 0 when no categories', () => {
    component.allEntries.set([]);
    expect(component.getCategoryPercent(100)).toBe(0);
  });

  it('getCategoryPercent should return proportional percent', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const summary = component.categorySummary();
    if (summary.length > 0) {
      const pct = component.getCategoryPercent(summary[0].total);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it('selectPeriod should change period and reload', () => {
    fixture.detectChanges();
    businessServiceSpy.getReports.calls.reset();
    component.selectPeriod('last_month');
    expect(component.selectedPeriod()).toBe('last_month');
    expect(businessServiceSpy.getReports).toHaveBeenCalled();
  });

  it('should fallback to ledger when reports API fails', async () => {
    businessServiceSpy.getReports.and.returnValue(throwError(() => new Error('err')));
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [mockAccount] }));
    accountsAdapterSpy.getLedgerEntries.and.returnValue(of({ success: true, data: mockEntries }));

    component.selectPeriod('this_month');
    await fixture.whenStable();

    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalled();
  });

  it('should handle fallback with no active accounts', async () => {
    businessServiceSpy.getReports.and.returnValue(throwError(() => new Error('err')));
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [{ ...mockAccount, status: 'FROZEN' }] }));

    component.selectPeriod('this_month');
    await fixture.whenStable();

    expect(component.allEntries()).toEqual([]);
  });

  it('should handle fallback ledger error', async () => {
    businessServiceSpy.getReports.and.returnValue(throwError(() => new Error('err')));
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [mockAccount] }));
    accountsAdapterSpy.getLedgerEntries.and.returnValue(throwError(() => new Error('ledger err')));

    component.selectPeriod('this_month');
    await fixture.whenStable();

    expect(component.error()).toBeTruthy();
  });

  it('should handle fallback accounts error', async () => {
    businessServiceSpy.getReports.and.returnValue(throwError(() => new Error('err')));
    accountsAdapterSpy.getAccounts.and.returnValue(throwError(() => new Error('acc err')));

    component.selectPeriod('this_month');
    await fixture.whenStable();

    expect(component.error()).toBeTruthy();
  });

  it('netBalance should be credits minus debits', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.netBalance()).toBe(component.totalCredits() - component.totalDebits());
  });

  it('totalMovements should count all entries', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.totalMovements()).toBe(component.allEntries().length);
  });

  it('should handle report response with entries nested', async () => {
    businessServiceSpy.getReports.and.returnValue(of({
      success: true,
      data: { entries: mockEntries },
    }));
    component.selectPeriod('this_month');
    await fixture.whenStable();
    expect(component.allEntries().length).toBe(mockEntries.length);
  });

  it('selectPeriod with last_3_months should work', () => {
    businessServiceSpy.getReports.and.returnValue(of({ success: true, data: [] }));
    component.selectPeriod('last_3_months');
    expect(component.selectedPeriod()).toBe('last_3_months');
  });
});
