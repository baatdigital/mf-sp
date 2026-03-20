/**
 * Tests: ReserveOfferComponent
 *
 * Verifica la reserva de ofertas y el countdown timer de 15 minutos.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReserveOfferComponent } from './reserve-offer.component';
import { SharedStateService } from '@shared-state';
import { CashAuctionService } from '../../services/cash-auction.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  currentUser: () => ({ name: 'Biz' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAuctionService = {
  reserveOffer: jasmine.createSpy('reserveOffer'),
};

const futureExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

const mockReserveResponse = {
  success: true,
  data: {
    reservation_id: 'RES-001',
    authorization_code: 'XY9876',
    amount: 500,
    offer_id: 'OFF-001',
    status: 'RESERVED' as const,
    expires_at: futureExpiry,
  },
};

const mockActivatedRoute = {
  snapshot: {
    paramMap: {
      get: (key: string) => (key === 'offerId' ? 'OFF-001' : null),
    },
  },
};

describe('ReserveOfferComponent', () => {
  let fixture: ComponentFixture<ReserveOfferComponent>;
  let component: ReserveOfferComponent;

  beforeEach(async () => {
    mockAuctionService.reserveOffer.calls.reset();
    mockAuctionService.reserveOffer.and.returnValue(of(mockReserveResponse));

    await TestBed.configureTestingModule({
      imports: [ReserveOfferComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashAuctionService, useValue: mockAuctionService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReserveOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe leer el offerId desde los parametros de ruta', () => {
    expect(component.offerId()).toBe('OFF-001');
  });

  it('debe ser invalido cuando amount esta vacio', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('debe rechazar amount menor o igual a 0', () => {
    component.form.get('amount')?.setValue(0);
    expect(component.form.get('amount')?.errors?.['min']).toBeTruthy();
  });

  it('debe llamar reserveOffer con offerId y amount al submit', () => {
    component.form.get('amount')?.setValue(500);

    component.onSubmit();

    expect(mockAuctionService.reserveOffer).toHaveBeenCalledWith('OFF-001', {
      amount: 500,
    });
  });

  it('debe mostrar authorization_code tras reserva exitosa', async () => {
    component.form.get('amount')?.setValue(500);
    component.onSubmit();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.reservationData()).toEqual(mockReserveResponse.data);
    expect(component.reservationData()?.authorization_code).toBe('XY9876');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe iniciar countdown con tiempo mayor a 0 tras reserva', async () => {
    component.form.get('amount')?.setValue(300);
    component.onSubmit();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.timeRemaining()).toBeGreaterThan(0);
  });

  it('debe mostrar error cuando la reserva falla', async () => {
    mockAuctionService.reserveOffer.and.returnValue(
      throwError(() => ({ error: { message: 'Oferta ya no disponible' } }))
    );

    component.form.get('amount')?.setValue(200);
    component.onSubmit();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Oferta ya no disponible');
    expect(component.reservationData()).toBeNull();
  });

  it('debe limpiar el estado al llamar resetReservation()', async () => {
    component.form.get('amount')?.setValue(300);
    component.onSubmit();
    await fixture.whenStable();

    component.resetReservation();

    expect(component.reservationData()).toBeNull();
    expect(component.error()).toBeNull();
    expect(component.timeRemaining()).toBe(0);
  });

  it('debe limpiar el intervalo al destruirse', () => {
    spyOn(window, 'clearInterval');
    (component as any).countdownInterval = setInterval(() => {}, 1000);
    component.ngOnDestroy();
    expect(window.clearInterval).toHaveBeenCalled();
  });

  it('no debe llamar reserveOffer si el formulario es invalido', () => {
    component.form.get('amount')?.setValue(null as unknown as number);
    component.onSubmit();
    expect(mockAuctionService.reserveOffer).not.toHaveBeenCalled();
  });

  it('no debe llamar reserveOffer si no hay offerId', () => {
    component.offerId.set(null);
    component.form.get('amount')?.setValue(500);
    component.onSubmit();
    expect(component.error()).toBe('ID de oferta no encontrado.');
  });

  it('debe usar error generico cuando falla sin message', async () => {
    mockAuctionService.reserveOffer.and.returnValue(
      throwError(() => ({}))
    );
    component.form.get('amount')?.setValue(200);
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error()).toBe('Error al reservar la oferta. Intente de nuevo.');
  });

  it('isFieldInvalid debe retornar false para campo valido', () => {
    component.form.get('amount')?.setValue(100);
    expect(component.isFieldInvalid('amount')).toBeFalse();
  });

  it('isFieldInvalid debe retornar true para campo invalido y tocado', () => {
    component.form.get('amount')?.markAsTouched();
    expect(component.isFieldInvalid('amount')).toBeTrue();
  });

  it('debe usar fallback de 15 minutos si expires_at ya paso', async () => {
    const pastExpiry = new Date(Date.now() - 60000).toISOString();
    mockAuctionService.reserveOffer.and.returnValue(of({
      success: true,
      data: { ...mockReserveResponse.data, expires_at: pastExpiry },
    }));

    component.form.get('amount')?.setValue(500);
    component.onSubmit();
    await fixture.whenStable();

    expect(component.timeRemaining()).toBe(15 * 60);
    expect(component.formattedTime()).toBe('15:00');
  });

  it('debe usar offerId_input si paramMap no tiene offerId', () => {
    const routeNoId = { snapshot: { paramMap: { get: () => null } } };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ReserveOfferComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashAuctionService, useValue: mockAuctionService },
        { provide: ActivatedRoute, useValue: routeNoId },
      ],
    });
    const fix2 = TestBed.createComponent(ReserveOfferComponent);
    fix2.componentInstance.offerId_input = 'OFF-INPUT';
    fix2.detectChanges();
    expect(fix2.componentInstance.offerId()).toBe('OFF-INPUT');
    fix2.componentInstance.ngOnDestroy();
  });
});
