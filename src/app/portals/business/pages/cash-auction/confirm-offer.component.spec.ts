/**
 * Tests: ConfirmOfferComponent
 *
 * Verifica la confirmacion de reservas en el Cash Auction marketplace.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmOfferComponent } from './confirm-offer.component';
import { SharedStateService } from '@shared-state';
import { CashAuctionService } from '../../services/cash-auction.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  currentUser: () => ({ name: 'Biz' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAuctionService = {
  confirmReservation: jasmine.createSpy('confirmReservation'),
};

const mockConfirmResponse = {
  success: true,
  data: {
    transaction_id: 'TXN-AUCTION-001',
    status: 'COMPLETED' as const,
    amount: 500,
    completed_at: '2026-02-17T00:10:00Z',
  },
};

const mockActivatedRoute = {
  snapshot: {
    paramMap: {
      get: (key: string) => (key === 'offerId' ? 'OFF-001' : null),
    },
  },
};

describe('ConfirmOfferComponent', () => {
  let fixture: ComponentFixture<ConfirmOfferComponent>;
  let component: ConfirmOfferComponent;

  beforeEach(async () => {
    mockAuctionService.confirmReservation.calls.reset();
    mockAuctionService.confirmReservation.and.returnValue(of(mockConfirmResponse));

    await TestBed.configureTestingModule({
      imports: [ConfirmOfferComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashAuctionService, useValue: mockAuctionService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe leer el offerId desde los parametros de ruta', () => {
    expect(component.offerId()).toBe('OFF-001');
  });

  it('debe ser invalido con formulario vacio', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('debe validar que el codigo tenga exactamente 6 caracteres', () => {
    component.form.get('authorization_code')?.setValue('AB12');
    expect(component.form.get('authorization_code')?.errors?.['minlength']).toBeTruthy();

    component.form.get('authorization_code')?.setValue('AB12345');
    expect(component.form.get('authorization_code')?.errors?.['maxlength']).toBeTruthy();

    component.form.get('authorization_code')?.setValue('XY9876');
    expect(component.form.get('authorization_code')?.errors).toBeNull();
  });

  it('debe llamar confirmReservation con offerId y codigo al submit', () => {
    component.form.get('authorization_code')?.setValue('XY9876');

    component.onSubmit();

    expect(mockAuctionService.confirmReservation).toHaveBeenCalledWith('OFF-001', {
      authorization_code: 'XY9876',
    });
  });

  it('debe mostrar datos completados tras confirmacion exitosa', async () => {
    component.form.get('authorization_code')?.setValue('XY9876');
    component.onSubmit();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.completedData()).toEqual(mockConfirmResponse.data);
    expect(component.completedData()?.status).toBe('COMPLETED');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando el codigo es invalido o la reserva expiro', async () => {
    mockAuctionService.confirmReservation.and.returnValue(
      throwError(() => ({ error: { message: 'Reserva expirada o código inválido' } }))
    );

    component.form.get('authorization_code')?.setValue('XXXXXX');
    component.onSubmit();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Reserva expirada o código inválido');
    expect(component.completedData()).toBeNull();
  });

  it('no debe llamar confirmReservation cuando el formulario es invalido', () => {
    component.onSubmit();
    expect(mockAuctionService.confirmReservation).not.toHaveBeenCalled();
  });

  it('debe convertir el codigo a mayusculas via onCodeInput', () => {
    const mockEvent = {
      target: { value: 'xy9876' } as HTMLInputElement,
    } as unknown as Event;

    component.onCodeInput(mockEvent);

    expect(component.form.get('authorization_code')?.value).toBe('XY9876');
  });
});
