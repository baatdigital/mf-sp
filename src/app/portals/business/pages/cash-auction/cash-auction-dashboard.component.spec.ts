/**
 * Tests: CashAuctionDashboardComponent
 *
 * Verifica la carga del marketplace y la gestion de tabs.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CashAuctionDashboardComponent } from './cash-auction-dashboard.component';
import { SharedStateService } from '@shared-state';
import { CashAuctionService, CashOffer } from '../../services/cash-auction.service';

const mockOffer: CashOffer = {
  offer_id: 'OFF-001',
  posting_org_id: 'org-other',
  point_id: 'PP-001',
  available_amount: 5000,
  max_amount: 2000,
  min_amount: 100,
  commission_rate: 0.5,
  status: 'OPEN',
  expires_at: '2026-02-18T00:00:00Z',
  created_at: '2026-02-17T00:00:00Z',
};

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  currentUser: () => ({ name: 'Biz' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAuctionService = {
  listAvailableOffers: jasmine.createSpy('listAvailableOffers'),
  listMyOffers: jasmine.createSpy('listMyOffers'),
  cancelOffer: jasmine.createSpy('cancelOffer'),
};

describe('CashAuctionDashboardComponent', () => {
  let fixture: ComponentFixture<CashAuctionDashboardComponent>;
  let component: CashAuctionDashboardComponent;

  beforeEach(async () => {
    mockAuctionService.listAvailableOffers.calls.reset();
    mockAuctionService.listMyOffers.calls.reset();
    mockAuctionService.cancelOffer.calls.reset();

    mockAuctionService.listAvailableOffers.and.returnValue(
      of({ success: true, data: [mockOffer], total: 1 })
    );
    mockAuctionService.listMyOffers.and.returnValue(
      of({ success: true, data: [], total: 0 })
    );

    await TestBed.configureTestingModule({
      imports: [CashAuctionDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: CashAuctionService, useValue: mockAuctionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashAuctionDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar las ofertas del mercado al inicializar', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockAuctionService.listAvailableOffers).toHaveBeenCalled();
    expect(component.marketOffers().length).toBe(1);
    expect(component.marketOffers()[0].offer_id).toBe('OFF-001');
  });

  it('debe cargar mis ofertas tras cargar el mercado', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockAuctionService.listMyOffers).toHaveBeenCalledWith('org-biz-001');
  });

  it('debe iniciar con el tab "market" activo', () => {
    expect(component.activeTab()).toBe('market');
  });

  it('debe cambiar el tab al llamar setTab()', () => {
    component.setTab('my-offers');
    expect(component.activeTab()).toBe('my-offers');

    component.setTab('market');
    expect(component.activeTab()).toBe('market');
  });

  it('debe mostrar error cuando falla la carga del mercado', async () => {
    mockAuctionService.listAvailableOffers.and.returnValue(
      throwError(() => ({ error: { message: 'Error de conexion' } }))
    );

    const fixture2 = TestBed.createComponent(CashAuctionDashboardComponent);
    fixture2.detectChanges();
    await fixture2.whenStable();
    fixture2.detectChanges();

    expect(fixture2.componentInstance.error()).toBe('Error de conexion');
    expect(fixture2.componentInstance.isLoading()).toBeFalse();
  });

  it('debe cancelar oferta y actualizar el estado localmente', async () => {
    const ofertaAbierta: CashOffer = { ...mockOffer, offer_id: 'OFF-MINE' };
    component.myOffers.set([ofertaAbierta]);
    mockAuctionService.cancelOffer.and.returnValue(of({ success: true }));

    component.cancelOffer(ofertaAbierta);

    expect(mockAuctionService.cancelOffer).toHaveBeenCalledWith('org-biz-001', 'OFF-MINE');
  });

  it('debe desactivar el loading despues de cargar', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });
});
