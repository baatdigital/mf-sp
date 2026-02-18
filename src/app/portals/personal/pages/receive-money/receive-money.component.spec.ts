/**
 * Tests: ReceiveMoneyComponent
 *
 * Verifica la pantalla de CLABE para recibir dinero en el portal B2C.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReceiveMoneyComponent } from './receive-money.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';

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

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  currentUser: () => ({ name: 'Ana Lopez', id: 'u-001', email: 'ana@test.com' }),
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAccountsAdapter = {
  getAccounts: jasmine.createSpy('getAccounts').and.returnValue(
    of({ success: true, data: [mockAccount] })
  ),
};

describe('ReceiveMoneyComponent', () => {
  let fixture: ComponentFixture<ReceiveMoneyComponent>;
  let component: ReceiveMoneyComponent;

  beforeEach(async () => {
    mockAccountsAdapter.getAccounts.calls.reset();
    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );

    await TestBed.configureTestingModule({
      imports: [ReceiveMoneyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiveMoneyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar la cuenta activa en ngOnInit', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mockAccountsAdapter.getAccounts).toHaveBeenCalledWith('org-001');
    expect(component.account()).toEqual(mockAccount);
  });

  it('debe desactivar loading despues de cargar la cuenta', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar la CLABE formateada en la vista', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // La CLABE 123456789012345678 se formatea como 12-3456-7890-12345678
    expect(compiled.textContent).toContain('12-3456-7890-12345678');
  });

  it('debe formatear la CLABE de 18 digitos correctamente', () => {
    expect(component.formatClabe('123456789012345678')).toBe('12-3456-7890-12345678');
  });

  it('debe retornar la CLABE sin cambios si no tiene 18 digitos', () => {
    expect(component.formatClabe('1234')).toBe('1234');
    expect(component.formatClabe('')).toBe('');
  });

  it('debe mostrar error cuando falla la carga', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    const fixture2 = TestBed.createComponent(ReceiveMoneyComponent);
    fixture2.detectChanges();
    await fixture2.whenStable();
    fixture2.detectChanges();

    expect(fixture2.componentInstance.error()).toBeTruthy();
    expect(fixture2.componentInstance.isLoading()).toBeFalse();
  });

  it('debe resetear error y recargar al llamar reload()', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(
      throwError(() => new Error('Error inicial'))
    );
    const fixture3 = TestBed.createComponent(ReceiveMoneyComponent);
    fixture3.detectChanges();
    await fixture3.whenStable();

    expect(fixture3.componentInstance.error()).toBeTruthy();

    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    fixture3.componentInstance.reload();
    fixture3.detectChanges();
    await fixture3.whenStable();

    expect(fixture3.componentInstance.error()).toBeNull();
    expect(fixture3.componentInstance.account()).toEqual(mockAccount);
  });

  it('debe inicializar el nombre del titular desde SharedState', async () => {
    await fixture.whenStable();
    expect(component.holderName()).toBe('Ana Lopez');
  });

  it('debe mostrar estado sin cuenta si no hay cuenta activa', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [] })
    );
    const fixture4 = TestBed.createComponent(ReceiveMoneyComponent);
    fixture4.detectChanges();
    await fixture4.whenStable();
    fixture4.detectChanges();

    expect(fixture4.componentInstance.account()).toBeNull();
  });
});
