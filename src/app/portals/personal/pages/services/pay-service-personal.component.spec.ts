import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PayServicePersonalComponent } from './pay-service-personal.component';
import { ServicesBillpayService } from '../../services/services-billpay.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockActivatedRoute = {
  snapshot: {
    queryParams: { service_id: 'cfe-001', service_name: 'CFE' },
    queryParamMap: { get: (k: string) => ({ service_id: 'cfe-001', service_name: 'CFE' }[k]) },
  },
  queryParams: of({ service_id: 'cfe-001', service_name: 'CFE' }),
};

describe('PayServicePersonalComponent', () => {
  let component: PayServicePersonalComponent;
  let billpayServiceSpy: jasmine.SpyObj<ServicesBillpayService>;

  beforeEach(() => {
    billpayServiceSpy = jasmine.createSpyObj('ServicesBillpayService', [
      'queryBill', 'payBill', 'saveService',
    ]);
    billpayServiceSpy.queryBill.and.returnValue(of({
      success: true,
      data: { amount: 450, due_date: '2026-03-15', biller_name: 'CFE', reference: 'C12345' },
    }));
    billpayServiceSpy.payBill.and.returnValue(of({
      success: true,
      data: { transaction_id: 'txn-001', status: 'COMPLETED', amount: 450, created_at: '2026-02-18T10:00:00Z' },
    }));
    billpayServiceSpy.saveService.and.stub();

    TestBed.configureTestingModule({
      imports: [PayServicePersonalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServicesBillpayService, useValue: billpayServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(PayServicePersonalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1', () => {
    expect(component.currentStep()).toBe(1);
  });

  it('should query bill and show result on step 1', () => {
    component.reference.set('C12345');
    component.queryBill();
    expect(billpayServiceSpy.queryBill).toHaveBeenCalled();
    expect(component.queryResult()).toBeTruthy();
  });

  it('should advance to step 2 when bill queried', () => {
    component.reference.set('C12345');
    component.queryBill();
    expect(component.currentStep()).toBe(2);
  });

  it('should pay bill and go to step 3 on success', () => {
    component.reference.set('C12345');
    component.queryBill();
    component.confirmPayment();
    expect(billpayServiceSpy.payBill).toHaveBeenCalled();
    expect(component.currentStep()).toBe(3);
    expect(component.payResult()).toBeTruthy();
  });

  it('should handle payment failure and stay on step 3 with error', () => {
    billpayServiceSpy.payBill.and.returnValue(throwError(() => new Error('Payment failed')));
    component.reference.set('C12345');
    component.queryBill();
    component.confirmPayment();
    expect(component.currentStep()).toBe(3);
    expect(component.payError()).toBeTruthy();
  });

  it('should reset to step 1 when retry', () => {
    component.reference.set('C12345');
    component.queryBill();
    component.confirmPayment();
    component.retry();
    expect(component.currentStep()).toBe(1);
    expect(component.queryResult()).toBeNull();
  });
});
