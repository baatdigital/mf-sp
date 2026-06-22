import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AccountsListComponent } from './accounts-list.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';

const mockAccounts = [
  { account_id: 'acc-1', organization_id: 'org-1', account_type: 'CONCENTRADORA' as const, status: 'ACTIVE' as const, balance: 100000, available_balance: 95000, created_at: '2025-01-01T00:00:00Z' },
];

describe('AccountsListComponent', () => {
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  const mockSharedState = {
    currentOrganizationId: () => 'org-1',
    tenant: () => ({ id: 'sp', apiKey: 'k' }),
    accessToken: () => 'tok',
  };

  beforeEach(() => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', ['getAccounts']);
    accountsAdapterSpy.getAccounts.and.returnValue(of({ success: true, data: mockAccounts }));

    TestBed.configureTestingModule({
      imports: [AccountsListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AccountsListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load accounts on init', () => {
    const fixture = TestBed.createComponent(AccountsListComponent);
    fixture.detectChanges();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.accounts().length).toBe(1);
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle error and stop loading', () => {
    accountsAdapterSpy.getAccounts.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(AccountsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should stop loading when no orgId', () => {
    TestBed.overrideProvider(SharedStateService, { useValue: { ...mockSharedState, currentOrganizationId: () => null } });
    const fixture = TestBed.createComponent(AccountsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  // ─── Regresión responsive (ISS-000) ─────────────────────────────
  // Verifica que el wrapper de tabla usa overflow-x:auto, no overflow:hidden,
  // para evitar scroll horizontal en la página en móvil (360-430px).
  it('[responsive] accounts-table-wrapper should not use overflow:hidden', () => {
    const fixture = TestBed.createComponent(AccountsListComponent);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    const wrapper = nativeEl.querySelector('.accounts-table-wrapper') as HTMLElement | null;
    expect(wrapper).withContext('accounts-table-wrapper debe existir cuando hay cuentas').toBeTruthy();
    // overflow:hidden en contenedor de tabla causa scroll de página en móvil.
    expect(getComputedStyle(wrapper!).overflow).not.toBe('hidden');
  });

  it('[responsive] accounts-table should be inside the scrollable wrapper', () => {
    const fixture = TestBed.createComponent(AccountsListComponent);
    fixture.detectChanges();
    const wrapper = (fixture.nativeElement as HTMLElement).querySelector('.accounts-table-wrapper');
    const table = wrapper?.querySelector('table.accounts-table');
    expect(table).withContext('la tabla debe ser descendiente del wrapper con scroll').toBeTruthy();
  });
});
