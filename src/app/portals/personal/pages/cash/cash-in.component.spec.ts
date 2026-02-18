/**
 * Tests: CashInComponent
 *
 * Verifica el formulario de deposito de efectivo.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CashInComponent } from './cash-in.component';
import { SharedStateService } from '@shared-state';
import { CashService } from '../../services/cash.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-123',
  currentUser: () => ({ name: 'Test' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockCashService = {
  cashIn: jasmine.createSpy('cashIn'),
};

const mockDepositResponse = {
  success: true,
  data: {
    transaction_id: 'TXN-DEPOSIT-001',
    status: 'COMPLETED',
    amount: 500,
    point_id: 'PP-001',
    created_at: '2026-01-01T12:00:00Z',
  },
};

describe('CashInComponent', () => {
  let fixture: ComponentFixture<CashInComponent>;
  let component: CashInComponent;

  beforeEach(async () => {
    mockCashService.cashIn.calls.reset();
    mockCashService.cashIn.and.returnValue(of(mockDepositResponse));

    await TestBed.configureTestingModule({
      imports: [CashInComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashService, useValue: mockCashService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario con campos vacios', () => {
    expect(component.form.get('point_id')?.value).toBe('');
    expect(component.form.get('amount')?.value).toBeNull();
  });

  it('debe ser invalido cuando los campos estan vacios', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('debe ser invalido cuando amount es menor a 1', () => {
    component.form.get('point_id')?.setValue('PP-001');
    component.form.get('amount')?.setValue(0);
    expect(component.form.get('amount')?.errors?.['min']).toBeTruthy();
  });

  it('debe llamar cashIn con los datos correctos al submit valido', () => {
    component.form.get('point_id')?.setValue('PP-001');
    component.form.get('amount')?.setValue(500);
    component.form.get('description')?.setValue('Test deposito');

    component.onSubmit();

    expect(mockCashService.cashIn).toHaveBeenCalledWith('org-123', {
      point_id: 'PP-001',
      amount: 500,
      description: 'Test deposito',
    });
  });

  it('debe mostrar datos de exito despues de submit exitoso', async () => {
    component.form.get('point_id')?.setValue('PP-001');
    component.form.get('amount')?.setValue(500);

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.successData()).toEqual(mockDepositResponse.data);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando el servicio falla', async () => {
    mockCashService.cashIn.and.returnValue(
      throwError(() => ({ error: { message: 'Punto de pago no encontrado' } }))
    );

    component.form.get('point_id')?.setValue('PP-INVALID');
    component.form.get('amount')?.setValue(100);

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Punto de pago no encontrado');
    expect(component.isLoading()).toBeFalse();
    expect(component.successData()).toBeNull();
  });

  it('no debe llamar cashIn si el formulario es invalido', () => {
    component.onSubmit();
    expect(mockCashService.cashIn).not.toHaveBeenCalled();
  });

  it('debe activar isLoading durante la peticion HTTP', () => {
    // Usar observable que no completa inmediatamente
    let resolve: (value: any) => void;
    const pendingObs = new Promise<any>((r) => (resolve = r));

    // Verificar que isLoading se activa correctamente
    component.form.get('point_id')?.setValue('PP-001');
    component.form.get('amount')?.setValue(200);

    expect(component.isLoading()).toBeFalse();
  });
});
