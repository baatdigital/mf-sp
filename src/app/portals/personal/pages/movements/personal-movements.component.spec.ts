/**
 * Tests: PersonalMovementsComponent
 *
 * Verifica historial de movimientos con filtros para el portal B2C.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PersonalMovementsComponent } from './personal-movements.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { PersonalService } from '../../services/personal.service';

const mockAccount = {
  account_id: 'acc-001',
  organization_id: 'org-001',
  account_type: 'CLABE_PRIVADA' as const,
  status: 'ACTIVE' as const,
  balance: 5000,
  available_balance: 4800,
  clabe: '123456789012345678',
  created_at: '2024-01-01T00:00:00Z',
};

const mockEntries = [
  {
    entry_id: 'e-001',
    account_id: 'acc-001',
    organization_id: 'org-001',
    entry_type: 'CREDIT' as const,
    amount: 1500,
    category: 'SPEI_IN' as const,
    concept: 'Deposito inicial',
    balance_after: 1500,
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    entry_id: 'e-002',
    account_id: 'acc-001',
    organization_id: 'org-001',
    entry_type: 'DEBIT' as const,
    amount: 300,
    category: 'SPEI_OUT' as const,
    concept: 'Pago servicios',
    balance_after: 1200,
    created_at: '2024-01-11T12:00:00Z',
  },
];

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  currentUser: () => ({ name: 'Test User' }),
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAccountsAdapter = {
  getAccounts: jasmine.createSpy('getAccounts').and.returnValue(
    of({ success: true, data: [mockAccount] })
  ),
};

const mockPersonalService = {
  getMovements: jasmine.createSpy('getMovements').and.returnValue(
    of({ success: true, data: mockEntries })
  ),
};

describe('PersonalMovementsComponent', () => {
  let fixture: ComponentFixture<PersonalMovementsComponent>;
  let component: PersonalMovementsComponent;

  beforeEach(async () => {
    mockAccountsAdapter.getAccounts.calls.reset();
    mockPersonalService.getMovements.calls.reset();

    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    mockPersonalService.getMovements.and.returnValue(
      of({ success: true, data: mockEntries })
    );

    await TestBed.configureTestingModule({
      imports: [PersonalMovementsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: PersonalService, useValue: mockPersonalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalMovementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar los movimientos en ngOnInit', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mockAccountsAdapter.getAccounts).toHaveBeenCalledWith('org-001');
    expect(mockPersonalService.getMovements).toHaveBeenCalled();
  });

  it('debe desactivar loading despues de cargar datos', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar todos los movimientos por defecto (filtro all)', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.filteredEntries().length).toBe(2);
    expect(component.activeFilter()).toBe('all');
  });

  it('debe filtrar solo creditos cuando se selecciona "credits"', async () => {
    await fixture.whenStable();
    component.setFilter('credits');
    fixture.detectChanges();
    const filtered = component.filteredEntries();
    expect(filtered.length).toBe(1);
    expect(filtered[0].entry_type).toBe('CREDIT');
  });

  it('debe filtrar solo debitos cuando se selecciona "debits"', async () => {
    await fixture.whenStable();
    component.setFilter('debits');
    fixture.detectChanges();
    const filtered = component.filteredEntries();
    expect(filtered.length).toBe(1);
    expect(filtered[0].entry_type).toBe('DEBIT');
  });

  it('debe volver a mostrar todos al seleccionar "all"', async () => {
    await fixture.whenStable();
    component.setFilter('credits');
    component.setFilter('all');
    fixture.detectChanges();
    expect(component.filteredEntries().length).toBe(2);
  });

  it('debe mostrar error cuando falla la carga de cuentas', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    const fixture2 = TestBed.createComponent(PersonalMovementsComponent);
    fixture2.detectChanges();
    await fixture2.whenStable();
    fixture2.detectChanges();

    expect(fixture2.componentInstance.error()).toBeTruthy();
    expect(fixture2.componentInstance.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando falla la carga de movimientos', async () => {
    mockPersonalService.getMovements.and.returnValue(
      throwError(() => new Error('Ledger error'))
    );
    const fixture3 = TestBed.createComponent(PersonalMovementsComponent);
    fixture3.detectChanges();
    await fixture3.whenStable();
    fixture3.detectChanges();

    expect(fixture3.componentInstance.error()).toBeTruthy();
    expect(fixture3.componentInstance.isLoading()).toBeFalse();
  });

  it('debe renderizar el componente de tabla de movimientos', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('sp-movements-table')).toBeTruthy();
  });

  it('debe llamar loadMovements al recargar despues de error', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(
      throwError(() => new Error('Error'))
    );
    const fixture4 = TestBed.createComponent(PersonalMovementsComponent);
    fixture4.detectChanges();
    await fixture4.whenStable();

    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    mockPersonalService.getMovements.and.returnValue(
      of({ success: true, data: mockEntries })
    );

    fixture4.componentInstance.reload();
    fixture4.detectChanges();
    await fixture4.whenStable();

    expect(fixture4.componentInstance.error()).toBeNull();
  });
});
