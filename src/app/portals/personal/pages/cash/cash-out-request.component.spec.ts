/**
 * Tests: CashOutRequestComponent
 *
 * Verifica la solicitud de retiro y el countdown timer.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CashOutRequestComponent } from './cash-out-request.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { CashService } from '../../services/cash.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-123',
  currentUser: () => ({ name: 'Test' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAccountsAdapter = {
  getAccounts: jasmine.createSpy('getAccounts').and.returnValue(
    of({
      success: true,
      data: [
        { account_id: 'ACC-001', status: 'ACTIVE', available_balance: 1000, balance: 1200, currency: 'MXN', account_type: 'PERSONAL', org_id: 'org-123', created_at: '' },
      ],
    })
  ),
};

const mockCashService = {
  requestCashOut: jasmine.createSpy('requestCashOut'),
};

const futureExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

const mockRequestResponse = {
  success: true,
  data: {
    withdrawal_id: 'WD-001',
    authorization_code: 'AB1234',
    amount: 200,
    status: 'PENDING',
    expires_at: futureExpiry,
  },
};

describe('CashOutRequestComponent', () => {
  let fixture: ComponentFixture<CashOutRequestComponent>;
  let component: CashOutRequestComponent;

  beforeEach(async () => {
    mockAccountsAdapter.getAccounts.calls.reset();
    mockCashService.requestCashOut.calls.reset();
    mockCashService.requestCashOut.and.returnValue(of(mockRequestResponse));

    await TestBed.configureTestingModule({
      imports: [CashOutRequestComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: CashService, useValue: mockCashService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashOutRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar el saldo disponible al inicializar', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mockAccountsAdapter.getAccounts).toHaveBeenCalled();
    expect(component.availableBalance()).toBe(1000);
  });

  it('debe ser invalido cuando los campos estan vacios', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('debe llamar requestCashOut con los datos del formulario', () => {
    component.form.get('amount')?.setValue(200);
    component.form.get('point_id')?.setValue('PP-001');

    component.onSubmit();

    expect(mockCashService.requestCashOut).toHaveBeenCalledWith('org-123', {
      amount: 200,
      point_id: 'PP-001',
    });
  });

  it('debe mostrar el authorization_code despues de submit exitoso', async () => {
    component.form.get('amount')?.setValue(200);
    component.form.get('point_id')?.setValue('PP-001');

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.authorizationData()).toEqual(mockRequestResponse.data);
    expect(component.authorizationData()?.authorization_code).toBe('AB1234');
  });

  it('debe mostrar error cuando el servicio falla', async () => {
    mockCashService.requestCashOut.and.returnValue(
      throwError(() => ({ error: { message: 'Saldo insuficiente' } }))
    );

    component.form.get('amount')?.setValue(9999);
    component.form.get('point_id')?.setValue('PP-001');

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Saldo insuficiente');
    expect(component.authorizationData()).toBeNull();
  });

  it('debe limpiar el estado al llamar resetForm()', async () => {
    component.form.get('amount')?.setValue(200);
    component.form.get('point_id')?.setValue('PP-001');
    component.onSubmit();
    await fixture.whenStable();

    component.resetForm();

    expect(component.authorizationData()).toBeNull();
    expect(component.error()).toBeNull();
  });

  it('debe limpiar el intervalo al destruirse el componente', () => {
    spyOn(window, 'clearInterval');
    // Forzar intervalo
    (component as any).countdownInterval = setInterval(() => {}, 1000);
    component.ngOnDestroy();
    expect(window.clearInterval).toHaveBeenCalled();
  });
});
