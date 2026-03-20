import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
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
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: [], total: 0 }));

    TestBed.configureTestingModule({
      imports: [ServicesHomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
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
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: manyItems as any, total: manyItems.length }));
    component.ngOnInit();
    expect(component.recentPayments().length).toBeLessThanOrEqual(3);
  });

  it('should show saved services when they exist', () => {
    const savedServices = [
      { service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Mi CFE', saved_at: '2026-01-01' },
      { service_id: 's2', name: 'Telmex', emoji: '📞', reference: '456', nickname: '', saved_at: '2026-01-01' },
    ];
    billpayServiceSpy.getSavedServices.and.returnValue(savedServices);
    component.ngOnInit();
    expect(component.savedServices().length).toBe(2);
  });

  it('should handle history API error gracefully', () => {
    billpayServiceSpy.getHistory.and.returnValue(throwError(() => new Error('Network error')));
    component.ngOnInit();
    expect(component.recentPayments().length).toBe(0);
    expect(component.isLoadingHistory()).toBeFalse();
  });

  it('should handle null data in history response', () => {
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: null, total: 0 } as any));
    component.ngOnInit();
    expect(component.recentPayments().length).toBe(0);
  });

  it('statusLabel should return correct labels', () => {
    expect(component.statusLabel('COMPLETED')).toBe('Exitoso');
    expect(component.statusLabel('FAILED')).toBe('Fallido');
    expect(component.statusLabel('PENDING')).toBe('Pendiente');
  });

  it('statusLabel should return raw status for unknown values', () => {
    expect(component.statusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
  });

  it('should set isLoadingHistory to true initially', () => {
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: [], total: 0 }));
    // Before ngOnInit is called in a fresh component
    const fixture2 = TestBed.createComponent(ServicesHomeComponent);
    // isLoadingHistory is true by default
    expect(fixture2.componentInstance.isLoadingHistory()).toBeTrue();
    fixture2.detectChanges(); // triggers ngOnInit
    expect(fixture2.componentInstance.isLoadingHistory()).toBeFalse();
  });
});
