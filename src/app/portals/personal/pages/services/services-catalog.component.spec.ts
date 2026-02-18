import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
  { service_id: 'cfe-001', name: 'CFE', category: 'electricidad', emoji: '⚡', description: 'Comisión Federal de Electricidad' },
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

  it('should show all services initially', () => {
    expect(component.services().length).toBe(2);
  });

  it('should filter by category when category selected', () => {
    component.selectCategory('electricidad');
    expect(component.selectedCategory()).toBe('electricidad');
    expect(component.filteredServices().length).toBe(1);
    expect(component.filteredServices()[0].category).toBe('electricidad');
  });

  it('should show all services when "Todos" category selected', () => {
    component.selectCategory('electricidad');
    component.selectCategory('all');
    expect(component.filteredServices().length).toBe(2);
  });

  it('should start with no category selected (all)', () => {
    expect(component.selectedCategory()).toBe('all');
  });
});
