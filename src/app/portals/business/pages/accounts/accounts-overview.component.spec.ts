import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { AccountsOverviewComponent } from './accounts-overview.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';

const mockAccounts: FinancialAccount[] = [
  {
    account_id: 'acc-1',
    organization_id: 'org-1',
    account_type: 'CONCENTRADORA',
    status: 'ACTIVE',
    balance: 100000,
    available_balance: 95000,
    clabe: '646180123456789012',
    name: 'Cuenta Principal',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    account_id: 'acc-2',
    organization_id: 'org-1',
    account_type: 'OPERATIVA',
    status: 'ACTIVE',
    balance: 20000,
    available_balance: 18000,
    name: 'Cuenta Operativa',
    created_at: '2025-01-01T00:00:00Z',
  },
];

describe('AccountsOverviewComponent', () => {
  let fixture: ComponentFixture<AccountsOverviewComponent>;
  let component: AccountsOverviewComponent;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  beforeEach(async () => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', [
      'getAccounts',
      'getBalance',
    ]);

    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: mockAccounts })
    );
    accountsAdapterSpy.getBalance.and.returnValue(
      of({ success: true, data: { available_balance: 95000, frozen_balance: 500 } })
    );

    const sharedStateSpy = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal('org-1'),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    await TestBed.configureTestingModule({
      imports: [AccountsOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsOverviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load accounts on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(component.accounts().length).toBe(2);
  });

  it('should build account groups after loading', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const groups = component.accountGroups();
    expect(groups.length).toBeGreaterThan(0);
    const concentradora = groups.find((g) => g.type === 'CONCENTRADORA');
    expect(concentradora).toBeTruthy();
    expect(concentradora!.count).toBe(1);
  });

  it('should set error when org is not available', async () => {
    const noOrgState = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal(null),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountsOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: noOrgState },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(AccountsOverviewComponent);
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.error()).toBeTruthy();
  });

  it('should show error when getAccounts fails', async () => {
    accountsAdapterSpy.getAccounts.and.returnValue(
      throwError(() => new Error('API error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error()).toBe('Error al cargar las cuentas.');
    expect(component.isLoading()).toBeFalse();
  });

  it('should select account and refresh balance when onAccountSelected is called', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.onAccountSelected(mockAccounts[0]);
    expect(component.selectedAccountId()).toBe('acc-1');
    expect(component.selectedAccount()).toEqual(mockAccounts[0]);
    expect(accountsAdapterSpy.getBalance).toHaveBeenCalledWith('org-1', 'acc-1');
  });

  it('should render totals section after load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const totalCards = fixture.nativeElement.querySelectorAll('.total-card');
    expect(totalCards.length).toBeGreaterThan(0);
  });
});
