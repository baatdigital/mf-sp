/**
 * Tests: CashOutConfirmComponent
 *
 * Verifica el formulario de confirmacion de retiro de efectivo.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CashOutConfirmComponent } from './cash-out-confirm.component';
import { SharedStateService } from '@shared-state';
import { CashService } from '../../services/cash.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-123',
  currentUser: () => ({ name: 'Test' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockCashService = {
  confirmCashOut: jasmine.createSpy('confirmCashOut'),
};

const mockConfirmResponse = {
  success: true,
  data: {
    transaction_id: 'TXN-CONFIRM-001',
    status: 'COMPLETED',
    amount: 200,
    completed_at: '2026-01-01T12:15:00Z',
  },
};

describe('CashOutConfirmComponent', () => {
  let fixture: ComponentFixture<CashOutConfirmComponent>;
  let component: CashOutConfirmComponent;

  beforeEach(async () => {
    mockCashService.confirmCashOut.calls.reset();
    mockCashService.confirmCashOut.and.returnValue(of(mockConfirmResponse));

    await TestBed.configureTestingModule({
      imports: [CashOutConfirmComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashService, useValue: mockCashService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashOutConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar con formulario invalido', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('debe requerir exactamente 6 caracteres en authorization_code', () => {
    component.form.get('authorization_code')?.setValue('AB12');
    expect(component.form.get('authorization_code')?.errors?.['minlength']).toBeTruthy();

    component.form.get('authorization_code')?.setValue('AB12345');
    expect(component.form.get('authorization_code')?.errors?.['maxlength']).toBeTruthy();

    component.form.get('authorization_code')?.setValue('AB1234');
    expect(component.form.get('authorization_code')?.errors).toBeNull();
  });

  it('debe llamar confirmCashOut con los datos correctos al submit', () => {
    component.form.get('authorization_code')?.setValue('AB1234');
    component.form.get('point_id')?.setValue('PP-001');

    component.onSubmit();

    expect(mockCashService.confirmCashOut).toHaveBeenCalledWith('org-123', {
      authorization_code: 'AB1234',
      point_id: 'PP-001',
    });
  });

  it('debe mostrar datos completados tras submit exitoso', async () => {
    component.form.get('authorization_code')?.setValue('AB1234');
    component.form.get('point_id')?.setValue('PP-001');

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.completedData()).toEqual(mockConfirmResponse.data);
    expect(component.completedData()?.status).toBe('COMPLETED');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando el codigo es invalido', async () => {
    mockCashService.confirmCashOut.and.returnValue(
      throwError(() => ({ error: { message: 'Código de autorización inválido o expirado' } }))
    );

    component.form.get('authorization_code')?.setValue('XXXXXX');
    component.form.get('point_id')?.setValue('PP-001');

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Código de autorización inválido o expirado');
    expect(component.completedData()).toBeNull();
  });

  it('no debe llamar confirmCashOut cuando el formulario es invalido', () => {
    component.onSubmit();
    expect(mockCashService.confirmCashOut).not.toHaveBeenCalled();
  });

  it('debe convertir el authorization_code a mayusculas via onCodeInput', () => {
    const mockEvent = {
      target: { value: 'ab1234' } as HTMLInputElement,
    } as unknown as Event;

    component.onCodeInput(mockEvent);

    const value = component.form.get('authorization_code')?.value;
    expect(value).toBe('AB1234');
  });
});
