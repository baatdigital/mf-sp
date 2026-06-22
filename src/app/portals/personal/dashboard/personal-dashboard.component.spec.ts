import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PersonalDashboardComponent } from './personal-dashboard.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';

const mockSharedState = {
  currentOrganizationId: () => 'org-1',
  currentUser: () => ({ name: 'Juan' }),
  tenant: () => ({ id: 'sp', apiKey: 'k' }),
  accessToken: () => 'tok',
};

const mockAccount = {
  account_id: 'acc-1', organization_id: 'org-1', account_type: 'OPERATIVA' as const,
  status: 'ACTIVE' as const, balance: 1000, available_balance: 900, created_at: '2025-01-01T00:00:00Z',
};

describe('PersonalDashboardComponent', () => {
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  beforeEach(() => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', ['getAccounts', 'getLedgerEntries']);
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [mockAccount] }));
    accountsAdapterSpy.getLedgerEntries.and.returnValue(of({ success: true, data: [] }));

    TestBed.configureTestingModule({
      imports: [PersonalDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set userName from shared state', () => {
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.userName()).toBe('Juan');
  });

  it('should load account and movements on init', () => {
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    fixture.detectChanges();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.primaryAccount()).toBeTruthy();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle no active account', () => {
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [] }));
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.primaryAccount()).toBeNull();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle accounts error', () => {
    accountsAdapterSpy.getAccounts.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle movements error gracefully', () => {
    accountsAdapterSpy.getLedgerEntries.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should stop loading when no orgId', () => {
    TestBed.overrideProvider(SharedStateService, {
      useValue: { ...mockSharedState, currentOrganizationId: () => null },
    });
    const fixture = TestBed.createComponent(PersonalDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });
});
