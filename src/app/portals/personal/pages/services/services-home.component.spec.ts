import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ServicesHomeComponent } from './services-home.component';
import { ServicesBillpayService } from '../../services/services-billpay.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('ServicesHomeComponent', () => {
  let component: ServicesHomeComponent;
  let billpayServiceSpy: jasmine.SpyObj<ServicesBillpayService>;

  beforeEach(() => {
    billpayServiceSpy = jasmine.createSpyObj('ServicesBillpayService', [
      'getSavedServices', 'getHistory', 'saveService',
    ]);
    billpayServiceSpy.getSavedServices.and.returnValue([]);
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: [] }));

    TestBed.configureTestingModule({
      imports: [ServicesHomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServicesBillpayService, useValue: billpayServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    const fixture = TestBed.createComponent(ServicesHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load saved services on init', () => {
    expect(billpayServiceSpy.getSavedServices).toHaveBeenCalled();
  });

  it('should show empty saved services initially', () => {
    expect(component.savedServices().length).toBe(0);
  });

  it('should load recent history on init', () => {
    expect(billpayServiceSpy.getHistory).toHaveBeenCalled();
  });

  it('should have empty recent payments when no history', () => {
    expect(component.recentPayments().length).toBe(0);
  });

  it('should limit recent payments to 3', () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      transaction_id: `txn-${i}`,
      biller_name: 'CFE',
      reference: '12345',
      amount: 100,
      status: 'COMPLETED',
      category: 'electricidad',
      created_at: '2026-02-01T10:00:00Z',
    }));
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: manyItems }));
    component.ngOnInit();
    expect(component.recentPayments().length).toBeLessThanOrEqual(3);
  });
});
