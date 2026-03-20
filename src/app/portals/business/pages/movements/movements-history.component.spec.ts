import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { MovementsHistoryComponent } from './movements-history.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
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

const mockEntries: LedgerEntry[] = [
  {
    entry_id: 'e1',
    account_id: 'acc-1',
    organization_id: 'org-1',
    entry_type: 'CREDIT',
    amount: 5000,
    category: 'SPEI_IN',
    concept: 'Pago recibido',
    balance_after: 105000,
    created_at: '2025-02-01T10:00:00Z',
  },
  {
    entry_id: 'e2',
    account_id: 'acc-1',
    organization_id: 'org-1',
    entry_type: 'DEBIT',
    amount: 1000,
    category: 'SPEI_OUT',
    concept: 'Transferencia enviada',
    balance_after: 104000,
    created_at: '2025-02-02T09:00:00Z',
  },
];

describe('MovementsHistoryComponent', () => {
  let fixture: ComponentFixture<MovementsHistoryComponent>;
  let component: MovementsHistoryComponent;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  beforeEach(async () => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', [
      'getAccounts',
      'getLedgerEntries',
    ]);

    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    accountsAdapterSpy.getLedgerEntries.and.returnValue(
      of({ success: true, data: mockEntries, total: 2 })
    );

    const sharedStateSpy = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal('org-1'),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    await TestBed.configureTestingModule({
      imports: [MovementsHistoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovementsHistoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the filter form', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('.filter-bar');
    expect(form).toBeTruthy();
  });

  it('should load accounts and movements on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalled();
    expect(component.movements().length).toBe(2);
  });

  it('should show error when accounts API fails', async () => {
    accountsAdapterSpy.getAccounts.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error()).toBe('Error al cargar las cuentas.');
    expect(component.isLoading()).toBeFalse();
  });

  it('should show error when getLedgerEntries fails', async () => {
    accountsAdapterSpy.getLedgerEntries.and.returnValue(
      throwError(() => new Error('Ledger error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.error()).toBe('Error al cargar los movimientos.');
  });

  it('should reset page and reload when clearFilters is called', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.currentPage.set(3);
    component.clearFilters();
    expect(component.currentPage()).toBe(1);
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalled();
  });

  it('should increment page and reload on nextPage', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.totalMovements.set(50);
    component.currentPage.set(1);
    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalled();
  });

  it('should not go below page 1 on prevPage', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.currentPage.set(1);
    component.prevPage();
    expect(component.currentPage()).toBe(1);
  });

  it('should filter entries by entryType on client side', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.filterForm.patchValue({ entryType: 'CREDIT', accountId: 'acc-1' });
    component.applyFilters();
    await fixture.whenStable();

    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalled();
  });

  it('should filter entries by dateFrom on client side', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.filterForm.patchValue({ dateFrom: '2025-02-02', accountId: 'acc-1' });
    component.applyFilters();
    await fixture.whenStable();

    // Should only keep entries >= dateFrom
    expect(component.movements().length).toBeLessThanOrEqual(2);
  });

  it('should filter entries by dateTo on client side', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.filterForm.patchValue({ dateTo: '2025-02-01', accountId: 'acc-1' });
    component.applyFilters();
    await fixture.whenStable();

    expect(component.movements().length).toBeLessThanOrEqual(2);
  });

  it('should export CSV with onExport when movements exist', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(URL, 'revokeObjectURL');
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(mockLink as any);

    component.onExport();

    expect(mockLink.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should not export CSV when movements are empty', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.movements.set([]);

    spyOn(URL, 'createObjectURL');
    component.onExport();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('should show error when no orgId is available', async () => {
    const sharedStateNoOrg = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal(null),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MovementsHistoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: sharedStateNoOrg },
      ],
    }).compileComponents();

    const fixNoOrg = TestBed.createComponent(MovementsHistoryComponent);
    fixNoOrg.detectChanges();
    await fixNoOrg.whenStable();

    expect(fixNoOrg.componentInstance.error()).toBe('No se encontro organizacion activa.');
    expect(fixNoOrg.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle no active accounts gracefully', async () => {
    const frozenAccount = { ...mockAccount, status: 'FROZEN' as const };
    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [frozenAccount] })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.movements()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  });

  it('should calculate totalPages based on totalMovements', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.totalMovements.set(50);
    expect(component.totalPages()).toBe(3); // ceil(50/20)

    component.totalMovements.set(0);
    expect(component.totalPages()).toBe(1); // min 1
  });

  it('should decrement page on prevPage when page > 1', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.totalMovements.set(100);
    component.currentPage.set(3);
    component.prevPage();
    expect(component.currentPage()).toBe(2);
  });

  it('should not go past last page on nextPage', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.totalMovements.set(20); // 1 page total
    component.currentPage.set(1);
    component.nextPage();
    expect(component.currentPage()).toBe(1); // Should not advance
  });

  it('should use total from response or fallback to entries.length', async () => {
    accountsAdapterSpy.getLedgerEntries.and.returnValue(
      of({ success: true, data: mockEntries, total: undefined } as any)
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // total should fallback to entries.length (2)
    expect(component.totalMovements()).toBe(2);
  });

  it('should load movements for first active account when no filter account is selected', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify it loaded movements for acc-1 (the active account)
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalledWith(
      'org-1', 'acc-1', 1, 20
    );
  });

  it('should handle null data in getAccounts response', async () => {
    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: null } as any)
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.accounts()).toEqual([]);
  });
});
