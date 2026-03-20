import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ServicesCatalogComponent } from './services-catalog.component';
import { ServicesBillpayService } from '../../services/services-billpay.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockServices = [
  { service_id: 'cfe-001', name: 'CFE', category: 'electricity', emoji: '⚡', description: 'Comision Federal de Electricidad' },
  { service_id: 'telmex-001', name: 'Telmex', category: 'internet', emoji: '📡', description: 'Telmex internet' },
];

describe('ServicesCatalogComponent', () => {
  let component: ServicesCatalogComponent;
  let billpayServiceSpy: jasmine.SpyObj<ServicesBillpayService>;

  beforeEach(() => {
    billpayServiceSpy = jasmine.createSpyObj('ServicesBillpayService', ['getServices']);
    billpayServiceSpy.getServices.and.returnValue(of({ success: true, data: mockServices }));

    TestBed.configureTestingModule({
      imports: [ServicesCatalogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ServicesBillpayService, useValue: billpayServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    const fixture = TestBed.createComponent(ServicesCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load services catalog on init', () => {
    expect(billpayServiceSpy.getServices).toHaveBeenCalled();
  });

  it('should have all services loaded in allServices', () => {
    expect(component.allServices().length).toBe(2);
  });

  it('should filter by category when category selected', () => {
    const electricityCat = component.categories.find(c => c.id === 'electricity')!;
    component.selectCategory(electricityCat);
    expect(component.selectedCategory()).toBe(electricityCat);
    expect(component.filteredServices().length).toBe(1);
    expect(component.filteredServices()[0].category).toBe('electricity');
  });

  it('should show all services of selected category', () => {
    const internetCat = component.categories.find(c => c.id === 'internet')!;
    component.selectCategory(internetCat);
    expect(component.filteredServices().length).toBe(1);
    expect(component.filteredServices()[0].name).toBe('Telmex');
  });

  it('should clear category and show no filtered services', () => {
    const electricityCat = component.categories.find(c => c.id === 'electricity')!;
    component.selectCategory(electricityCat);
    component.clearCategory();
    expect(component.selectedCategory()).toBeNull();
    expect(component.filteredServices().length).toBe(0);
  });

  it('should start with no category selected (null)', () => {
    expect(component.selectedCategory()).toBeNull();
  });
});
