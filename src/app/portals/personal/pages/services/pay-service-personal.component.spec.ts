import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
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
    queryParams: { service_id: 'cfe-001', name: 'CFE' },
    queryParamMap: { get: (k: string) => ({ service_id: 'cfe-001', name: 'CFE' }[k as 'service_id' | 'name']) },
  },
  queryParams: of({ service_id: 'cfe-001', name: 'CFE' }),
};

describe('PayServicePersonalComponent', () => {
  let component: PayServicePersonalComponent;
  let billpayServiceSpy: jasmine.SpyObj<ServicesBillpayService>;

  beforeEach(() => {
    billpayServiceSpy = jasmine.createSpyObj('ServicesBillpayService', [
      'queryBill', 'payBill', 'saveService', 'getActiveAccountId',
    ]);
    billpayServiceSpy.queryBill.and.returnValue(of({
      success: true,
      data: { service_id: 'cfe-001', reference: 'C12345', amount: 450, description: 'CFE Recibo', due_date: '2026-03-15', holder_name: 'Juan Perez' },
    }));
    billpayServiceSpy.payBill.and.returnValue(of({
      success: true,
      data: { transaction_id: 'txn-001', folio: 'F001', status: 'COMPLETED', service_id: 'cfe-001', reference: 'C12345', amount: 450, completed_at: '2026-02-18T10:00:00Z' },
    }));
    billpayServiceSpy.saveService.and.stub();
    billpayServiceSpy.getActiveAccountId.and.returnValue('acct-001');

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

  it('should consult bill and show billInfo', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    expect(billpayServiceSpy.queryBill).toHaveBeenCalled();
    expect(component.billInfo()).toBeTruthy();
    expect(component.billInfo()!.amount).toBe(450);
  });

  it('should stay on step 1 after consulting bill', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    expect(component.currentStep()).toBe(1);
  });

  it('should pay bill and go to step 2 on success', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    component.executePay();
    expect(billpayServiceSpy.payBill).toHaveBeenCalled();
    expect(component.currentStep()).toBe(2);
    expect(component.payResult()).toBeTruthy();
    expect(component.payResult()!.success).toBeTrue();
  });

  it('should handle payment failure and go to step 2 with error', () => {
    billpayServiceSpy.payBill.and.returnValue(throwError(() => ({ error: { error: 'Payment failed' } })));
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    component.executePay();
    expect(component.currentStep()).toBe(2);
    expect(component.payResult()).toBeTruthy();
    expect(component.payResult()!.success).toBeFalse();
  });

  it('should reset to step 1 when retryPay', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    component.executePay();
    component.retryPay();
    expect(component.currentStep()).toBe(1);
    expect(component.billInfo()).toBeNull();
    expect(component.payResult()).toBeNull();
  });

  it('should not consult bill when form is invalid', () => {
    component.referenceForm.patchValue({ reference: '' });
    component.consultBill();
    expect(billpayServiceSpy.queryBill).not.toHaveBeenCalled();
  });

  it('should handle query error', () => {
    billpayServiceSpy.queryBill.and.returnValue(throwError(() => new Error('Network error')));
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    expect(component.queryError()).toBeTruthy();
    expect(component.billInfo()).toBeNull();
  });

  it('should clear bill info when clearBillInfo called', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    expect(component.billInfo()).toBeTruthy();
    component.clearBillInfo();
    expect(component.billInfo()).toBeNull();
  });

  it('should toggle save preference', () => {
    expect(component.wantToSave()).toBeFalse();
    component.toggleSave();
    expect(component.wantToSave()).toBeTrue();
    component.toggleSave();
    expect(component.wantToSave()).toBeFalse();
  });

  it('should save current service', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    component.executePay();
    component.saveCurrentService();
    expect(billpayServiceSpy.saveService).toHaveBeenCalled();
    expect(component.wantToSave()).toBeFalse();
  });

  it('should not execute pay when billInfo is null', () => {
    component.executePay();
    expect(billpayServiceSpy.payBill).not.toHaveBeenCalled();
  });

  // DJ-FQ-04: lock atomico contra doble-pago
  it('debe bloquear doble-tap con _payLock — solo ejecuta un payBill (DJ-FQ-04)', () => {
    // Usar Subject para que el lock NO se libere sincronicamente antes del segundo tap
    const pending$ = new Subject<ReturnType<typeof billpayServiceSpy.payBill> extends import('rxjs').Observable<infer T> ? T : never>();
    billpayServiceSpy.payBill.and.returnValue(pending$ as unknown as ReturnType<typeof billpayServiceSpy.payBill>);

    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();

    // Primer tap: lock = true, Observable no completa todavia
    component.executePay();
    // Segundo tap inmediato: bloqueado por _payLock
    component.executePay();

    expect(billpayServiceSpy.payBill).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('debe generar idempotency key al recibir el recibo, no en el click (DJ-FQ-04)', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });

    const keyBefore = (component as unknown as Record<string, unknown>)['_idempotencyKey'] as string;
    expect(keyBefore).toBe(''); // No generado aun

    component.consultBill();

    const keyAfter = (component as unknown as Record<string, unknown>)['_idempotencyKey'] as string;
    expect(keyAfter).not.toBe(''); // Generado tras recibir el recibo
    expect(keyAfter.length).toBeGreaterThan(10);
  });

  it('debe limpiar idempotency key y lock al clearBillInfo (DJ-FQ-04)', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    expect((component as unknown as Record<string, unknown>)['_idempotencyKey']).not.toBe('');

    component.clearBillInfo();

    expect((component as unknown as Record<string, unknown>)['_idempotencyKey']).toBe('');
    expect((component as unknown as Record<string, unknown>)['_payLock']).toBeFalse();
  });

  it('debe limpiar idempotency key y lock al retryPay (DJ-FQ-04)', () => {
    component.referenceForm.patchValue({ reference: 'C12345' });
    component.consultBill();
    component.executePay();
    component.retryPay();

    expect((component as unknown as Record<string, unknown>)['_idempotencyKey']).toBe('');
    expect((component as unknown as Record<string, unknown>)['_payLock']).toBeFalse();
  });

  it('should set nickname via setNickname', () => {
    const event = { target: { value: 'Casa' } } as unknown as Event;
    component.setNickname(event);
    expect(component.nickname()).toBe('Casa');
  });
});
