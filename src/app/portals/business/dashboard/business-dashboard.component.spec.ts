import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BusinessDashboardComponent } from './business-dashboard.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { TransfersAdapter } from '@infrastructure/adapters/transfers.adapter';

const mockSharedState = {
  currentOrganizationId: () => 'org-1',
  tenant: () => ({ name: 'TestOrg', id: 't-1', apiKey: 'k' }),
  accessToken: () => 'tok',
};

describe('BusinessDashboardComponent (dashboard)', () => {
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;
  let transfersAdapterSpy: jasmine.SpyObj<TransfersAdapter>;

  beforeEach(() => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', ['getAccounts']);
    transfersAdapterSpy = jasmine.createSpyObj('TransfersAdapter', ['getTransfers']);

    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [] }));
    transfersAdapterSpy.getTransfers.and.returnValue(of({ success: true, data: [] }));

    TestBed.configureTestingModule({
      imports: [BusinessDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: TransfersAdapter, useValue: transfersAdapterSpy },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BusinessDashboardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load accounts and transfers on init', () => {
    const fixture = TestBed.createComponent(BusinessDashboardComponent);
    fixture.detectChanges();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.orgName()).toBe('TestOrg');
  });

  it('should handle accounts error', () => {
    accountsAdapterSpy.getAccounts.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(BusinessDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should stop loading when no orgId', () => {
    TestBed.overrideProvider(SharedStateService, {
      useValue: { ...mockSharedState, currentOrganizationId: () => null },
    });
    const fixture = TestBed.createComponent(BusinessDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle transfers error', () => {
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: [{ account_id: 'a1' }] as any }));
    transfersAdapterSpy.getTransfers.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(BusinessDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });
});
