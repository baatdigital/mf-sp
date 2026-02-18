/**
 * Tests: ServiceCatalogViewComponent
 *
 * Verifica el catalogo de servicios disponibles para pagar.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ServiceCatalogViewComponent } from './service-catalog-view.component';
import { SharedStateService } from '@shared-state';
import { BillpayServiceApi } from '../../services/billpay.service';

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  currentUser: () => ({ name: 'Biz User' }),
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockServices = [
  { service_id: 'CFE', name: 'CFE', category: 'electricidad' as const, icon: '⚡', description: 'Comision Federal de Electricidad' },
  { service_id: 'TELMEX', name: 'Telmex', category: 'internet' as const, icon: '📡', description: 'Internet y telefonia fija' },
  { service_id: 'SAT', name: 'SAT', category: 'gobierno' as const, icon: '🏛️', description: 'SAT' },
];

const mockBillpayService = {
  getServices: jasmine.createSpy('getServices'),
};

describe('ServiceCatalogViewComponent', () => {
  let fixture: ComponentFixture<ServiceCatalogViewComponent>;
  let component: ServiceCatalogViewComponent;

  beforeEach(async () => {
    mockBillpayService.getServices.calls.reset();
    mockBillpayService.getServices.and.returnValue(
      of({ success: true, data: mockServices })
    );

    await TestBed.configureTestingModule({
      imports: [ServiceCatalogViewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: BillpayServiceApi, useValue: mockBillpayService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCatalogViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar el catalogo de servicios en ngOnInit', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockBillpayService.getServices).toHaveBeenCalledTimes(1);
    expect(component.services().length).toBe(3);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe filtrar servicios por categoria al seleccionar un filtro', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.setCategory('electricidad');
    fixture.detectChanges();

    expect(component.filteredServices().length).toBe(1);
    expect(component.filteredServices()[0].service_id).toBe('CFE');
  });

  it('debe mostrar todos los servicios cuando la categoria activa es null', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.setCategory('internet');
    fixture.detectChanges();
    expect(component.filteredServices().length).toBe(1);

    component.setCategory(null);
    fixture.detectChanges();
    expect(component.filteredServices().length).toBe(3);
  });

  it('debe filtrar por termino de busqueda (case insensitive)', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.searchQuery = 'telm';
    fixture.detectChanges();

    expect(component.filteredServices().length).toBe(1);
    expect(component.filteredServices()[0].service_id).toBe('TELMEX');
  });

  it('debe mostrar estado vacio cuando la busqueda no tiene resultados', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.searchQuery = 'servicio_inexistente_xyz';
    fixture.detectChanges();

    expect(component.filteredServices().length).toBe(0);
  });

  it('debe limpiar la busqueda al llamar clearSearch()', async () => {
    await fixture.whenStable();

    component.searchQuery = 'algo';
    component.clearSearch();

    expect(component.searchQuery).toBe('');
  });

  it('debe usar catalogo estatico de fallback cuando el API falla', async () => {
    mockBillpayService.getServices.and.returnValue(
      throwError(() => new Error('Network error'))
    );

    component.loadCatalog();
    await fixture.whenStable();
    fixture.detectChanges();

    // El fallback estatico tiene 17 servicios
    expect(component.services().length).toBeGreaterThan(0);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe agrupar los servicios visibles por categoria correctamente', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const grouped = component.servicesByCategory();
    expect(grouped['electricidad']?.length).toBe(1);
    expect(grouped['internet']?.length).toBe(1);
    expect(grouped['gobierno']?.length).toBe(1);
  });
});
