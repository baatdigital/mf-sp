/**
 * Tests: PostOfferComponent
 *
 * Verifica el formulario para publicar ofertas en el marketplace.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PostOfferComponent } from './post-offer.component';
import { SharedStateService } from '@shared-state';
import { CashAuctionService } from '../../services/cash-auction.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  currentUser: () => ({ name: 'Biz' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAuctionService = {
  postOffer: jasmine.createSpy('postOffer'),
};

const mockPostResponse = {
  success: true,
  data: {
    offer_id: 'OFF-NEW-001',
    status: 'OPEN' as const,
    point_id: 'PP-001',
    available_amount: 5000,
    commission_rate: 0.5,
    expires_at: '2026-02-18T00:00:00Z',
    created_at: '2026-02-17T00:00:00Z',
  },
};

describe('PostOfferComponent', () => {
  let fixture: ComponentFixture<PostOfferComponent>;
  let component: PostOfferComponent;

  beforeEach(async () => {
    mockAuctionService.postOffer.calls.reset();
    mockAuctionService.postOffer.and.returnValue(of(mockPostResponse));

    await TestBed.configureTestingModule({
      imports: [PostOfferComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashAuctionService, useValue: mockAuctionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar con valores por defecto correctos', () => {
    expect(component.form.get('min_amount')?.value).toBe(100);
    expect(component.form.get('max_amount')?.value).toBe(5000);
    expect(component.form.get('commission_rate')?.value).toBe(0.5);
    expect(component.form.get('expires_in_hours')?.value).toBe(24);
  });

  it('debe ser invalido cuando point_id y available_amount estan vacios', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('debe rechazar available_amount menor a 100', () => {
    component.form.get('available_amount')?.setValue(50);
    expect(component.form.get('available_amount')?.errors?.['min']).toBeTruthy();
  });

  it('debe rechazar commission_rate mayor a 10', () => {
    component.form.get('commission_rate')?.setValue(15);
    expect(component.form.get('commission_rate')?.errors?.['max']).toBeTruthy();
  });

  it('debe llamar postOffer con los datos del formulario al submit', () => {
    component.form.get('point_id')?.setValue('PP-001');
    component.form.get('available_amount')?.setValue(5000);

    component.onSubmit();

    expect(mockAuctionService.postOffer).toHaveBeenCalledWith('org-biz-001', {
      point_id: 'PP-001',
      available_amount: 5000,
      min_amount: 100,
      max_amount: 5000,
      commission_rate: 0.5,
      expires_in_hours: 24,
    });
  });

  it('debe mostrar datos de exito tras submit exitoso', async () => {
    component.form.get('point_id')?.setValue('PP-001');
    component.form.get('available_amount')?.setValue(5000);

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.successData()).toEqual(mockPostResponse.data);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando el servicio falla', async () => {
    mockAuctionService.postOffer.and.returnValue(
      throwError(() => ({ error: { message: 'Punto de pago ya tiene oferta activa' } }))
    );

    component.form.get('point_id')?.setValue('PP-INVALID');
    component.form.get('available_amount')?.setValue(500);

    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Punto de pago ya tiene oferta activa');
    expect(component.successData()).toBeNull();
  });

  it('no debe llamar postOffer cuando el formulario es invalido', () => {
    component.onSubmit();
    expect(mockAuctionService.postOffer).not.toHaveBeenCalled();
  });

  it('debe validar expires_in_hours entre 1 y 168', () => {
    component.form.get('expires_in_hours')?.setValue(0);
    expect(component.form.get('expires_in_hours')?.errors?.['min']).toBeTruthy();

    component.form.get('expires_in_hours')?.setValue(200);
    expect(component.form.get('expires_in_hours')?.errors?.['max']).toBeTruthy();

    component.form.get('expires_in_hours')?.setValue(48);
    expect(component.form.get('expires_in_hours')?.errors).toBeNull();
  });
});
