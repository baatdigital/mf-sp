/**
 * Tests: PayServiceComponent
 *
 * Cubre el flujo de 3 pasos para pagar un servicio B2B:
 * consultar, confirmar pago y mostrar resultado.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PayServiceComponent } from './pay-service.component';
import { BillpayServiceApi } from '../../services/billpay.service';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { SharedStateService } from '@shared-state';

// Mocks de respuesta
const mockQueryResult = {
  service_id: 'CFE',
  service_name: 'CFE',
  reference: '12345',
  amount_due: 850.5,
  due_date: '2026-02-28',
  biller_name: 'Comision Federal de Electricidad',
};

const mockPayResult = {
  transaction_id: 'TXN-001',
  status: 'COMPLETED' as const,
  service_name: 'CFE',
  reference: '12345',
  amount: 850.5,
  completed_at: '2026-02-18T10:00:00Z',
};

const mockPayResultFailed = {
  transaction_id: 'TXN-002',
  status: 'FAILED' as const,
  service_name: 'CFE',
  reference: '12345',
  amount: 850.5,
  completed_at: '2026-02-18T10:00:00Z',
  error_message: 'Saldo insuficiente',
};

const mockAccounts = [
  {
    account_id: 'ACC-001',
    organization_id: 'org-001',
    account_type: 'CONCENTRADORA' as const,
    status: 'ACTIVE' as const,
    balance: 10000,
    available_balance: 9500,
    name: 'Cuenta Principal',
    created_at: '2025-01-01T00:00:00Z',
  },
];

// Spy objects
const mockBillpay = jasmine.createSpyObj('BillpayServiceApi', [
  'queryBill',
  'payBill',
  'saveService',
]);

const mockAccountsAdapter = jasmine.createSpyObj('AccountsAdapter', ['getAccounts']);

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago' }),
};

const mockActivatedRoute = {
  queryParams: of({ service_id: 'CFE', service_name: 'CFE' }),
};

describe('PayServiceComponent', () => {
  let fixture: ComponentFixture<PayServiceComponent>;
  let component: PayServiceComponent;

  beforeEach(async () => {
    // Resetear todos los spies
    mockBillpay.queryBill.calls.reset();
    mockBillpay.payBill.calls.reset();
    mockBillpay.saveService.calls.reset();
    mockAccountsAdapter.getAccounts.calls.reset();

    mockBillpay.queryBill.and.returnValue(of({ success: true, data: mockQueryResult }));
    mockBillpay.payBill.and.returnValue(of({ success: true, data: mockPayResult }));
    mockBillpay.saveService.and.returnValue(of({ success: true, data: {} }));
    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: mockAccounts, total: 1 })
    );

    await TestBed.configureTestingModule({
      imports: [PayServiceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayServiceApi, useValue: mockBillpay },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PayServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente en paso 1', () => {
    expect(component).toBeTruthy();
    expect(component.currentStep()).toBe(1);
  });

  it('paso 1: consultarBill llama al servicio y guarda el resultado', async () => {
    component.reference = '12345';
    component.consultarBill();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockBillpay.queryBill).toHaveBeenCalledWith('org-biz-001', 'CFE', '12345');
    expect(component.queryResult()).toEqual(mockQueryResult);
    expect(component.isLoading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('paso 1: muestra error cuando queryBill falla', async () => {
    mockBillpay.queryBill.and.returnValue(throwError(() => new Error('Network error')));
    component.reference = '99999';
    component.consultarBill();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.queryResult()).toBeNull();
    expect(component.isLoading()).toBeFalse();
  });

  it('paso 2: goToStep2 avanza al paso 2 y carga las cuentas', async () => {
    component.queryResult.set(mockQueryResult);
    component.goToStep2();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.currentStep()).toBe(2);
    expect(mockAccountsAdapter.getAccounts).toHaveBeenCalledWith('org-biz-001');
    expect(component.accounts().length).toBe(1);
  });

  it('paso 3 exito: confirmarPago ejecuta pago y pasa a paso 3 con resultado exitoso', async () => {
    component.queryResult.set(mockQueryResult);
    component.accounts.set(mockAccounts);
    component.selectedAccountId = 'ACC-001';
    component.currentStep.set(2);

    component.confirmarPago();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockBillpay.payBill).toHaveBeenCalled();
    expect(component.currentStep()).toBe(3);
    expect(component.payResult()?.status).toBe('COMPLETED');
    expect(component.payResult()?.transaction_id).toBe('TXN-001');
  });

  it('paso 3 fallo: muestra error cuando el pago retorna FAILED', async () => {
    mockBillpay.payBill.and.returnValue(of({ success: true, data: mockPayResultFailed }));
    component.queryResult.set(mockQueryResult);
    component.accounts.set(mockAccounts);
    component.selectedAccountId = 'ACC-001';
    component.currentStep.set(2);

    component.confirmarPago();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.currentStep()).toBe(3);
    expect(component.payResult()?.status).toBe('FAILED');
    expect(component.payResult()?.error_message).toBe('Saldo insuficiente');
  });

  it('guardarServicio llama saveService y muestra mensaje de exito', async () => {
    component.queryResult.set(mockQueryResult);
    component.serviceNickname = 'Oficina Norte';
    component.serviceId = 'CFE';
    component.serviceName = 'CFE';

    component.guardarServicio();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockBillpay.saveService).toHaveBeenCalledWith(
      'org-biz-001',
      jasmine.objectContaining({ nickname: 'Oficina Norte' })
    );
    expect(component.savedMessage()).toContain('guardado');
    expect(component.isSaving()).toBeFalse();
  });

  it('consultarBill no debe ejecutarse si reference esta vacia', () => {
    component.reference = '   ';
    component.consultarBill();
    expect(mockBillpay.queryBill).not.toHaveBeenCalled();
  });

  it('consultarBill no debe ejecutarse si no hay orgId', () => {
    const origOrgId = mockSharedState.currentOrganizationId;
    (mockSharedState as any).currentOrganizationId = () => null;
    component.reference = '12345';
    component.consultarBill();
    expect(mockBillpay.queryBill).not.toHaveBeenCalled();
    (mockSharedState as any).currentOrganizationId = origOrgId;
  });

  it('goToStep1 debe regresar al paso 1 y limpiar error', () => {
    component.currentStep.set(2);
    component.error.set('Algun error');
    component.goToStep1();
    expect(component.currentStep()).toBe(1);
    expect(component.error()).toBeNull();
  });

  it('confirmarPago no debe ejecutarse si no hay selectedAccountId', () => {
    component.selectedAccountId = '';
    component.queryResult.set(mockQueryResult);
    component.confirmarPago();
    expect(mockBillpay.payBill).not.toHaveBeenCalled();
  });

  it('confirmarPago no debe ejecutarse si no hay queryResult', () => {
    component.selectedAccountId = 'ACC-001';
    component.queryResult.set(null);
    component.confirmarPago();
    expect(mockBillpay.payBill).not.toHaveBeenCalled();
  });

  it('confirmarPago no debe ejecutarse si no hay orgId', () => {
    const origOrgId = mockSharedState.currentOrganizationId;
    (mockSharedState as any).currentOrganizationId = () => null;
    component.selectedAccountId = 'ACC-001';
    component.queryResult.set(mockQueryResult);
    component.confirmarPago();
    expect(mockBillpay.payBill).not.toHaveBeenCalled();
    (mockSharedState as any).currentOrganizationId = origOrgId;
  });

  it('confirmarPago muestra error cuando el pago falla con error HTTP', async () => {
    mockBillpay.payBill.and.returnValue(throwError(() => new Error('Payment error')));
    component.queryResult.set(mockQueryResult);
    component.accounts.set(mockAccounts);
    component.selectedAccountId = 'ACC-001';
    component.currentStep.set(2);

    component.confirmarPago();
    await fixture.whenStable();

    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('loadAccounts muestra error cuando falla la carga de cuentas', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(throwError(() => new Error('Error')));
    component.queryResult.set(mockQueryResult);
    component.goToStep2();
    await fixture.whenStable();

    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('guardarServicio no debe ejecutarse si nickname esta vacio', () => {
    component.serviceNickname = '';
    component.queryResult.set(mockQueryResult);
    component.guardarServicio();
    expect(mockBillpay.saveService).not.toHaveBeenCalled();
  });

  it('guardarServicio no debe ejecutarse si no hay queryResult', () => {
    component.serviceNickname = 'Test';
    component.queryResult.set(null);
    component.guardarServicio();
    expect(mockBillpay.saveService).not.toHaveBeenCalled();
  });

  it('guardarServicio no debe ejecutarse si no hay orgId', () => {
    const origOrgId = mockSharedState.currentOrganizationId;
    (mockSharedState as any).currentOrganizationId = () => null;
    component.serviceNickname = 'Test';
    component.queryResult.set(mockQueryResult);
    component.guardarServicio();
    expect(mockBillpay.saveService).not.toHaveBeenCalled();
    (mockSharedState as any).currentOrganizationId = origOrgId;
  });

  it('guardarServicio muestra error cuando falla', async () => {
    mockBillpay.saveService.and.returnValue(throwError(() => new Error('Save error')));
    component.queryResult.set(mockQueryResult);
    component.serviceNickname = 'Test';
    component.serviceId = 'CFE';
    component.serviceName = 'CFE';
    component.guardarServicio();
    await fixture.whenStable();

    expect(component.savedMessage()).toContain('No se pudo guardar');
    expect(component.isSaving()).toBeFalse();
  });

  it('selectedAccount debe retornar la cuenta seleccionada', () => {
    component.accounts.set(mockAccounts);
    component.selectedAccountId = 'ACC-001';
    expect(component.selectedAccount()?.account_id).toBe('ACC-001');
  });

  it('selectedAccount debe retornar undefined si no coincide', () => {
    component.accounts.set(mockAccounts);
    component.selectedAccountId = 'NONEXISTENT';
    expect(component.selectedAccount()).toBeUndefined();
  });

  it('ngOnInit debe cargar reference desde queryParams', () => {
    const routeWithRef = { queryParams: of({ service_id: 'CFE', service_name: 'CFE', reference: 'REF123' }) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PayServiceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayServiceApi, useValue: mockBillpay },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: ActivatedRoute, useValue: routeWithRef },
      ],
    });

    const fix2 = TestBed.createComponent(PayServiceComponent);
    fix2.detectChanges();
    expect(fix2.componentInstance.reference).toBe('REF123');
  });

  it('ngOnInit debe usar serviceId como fallback para serviceName', () => {
    const routeNoName = { queryParams: of({ service_id: 'TELMEX' }) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PayServiceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayServiceApi, useValue: mockBillpay },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: ActivatedRoute, useValue: routeNoName },
      ],
    });

    const fix3 = TestBed.createComponent(PayServiceComponent);
    fix3.detectChanges();
    expect(fix3.componentInstance.serviceName).toBe('TELMEX');
  });

  it('loadAccounts debe filtrar solo cuentas activas', async () => {
    const mixedAccounts = [
      { ...mockAccounts[0] },
      { ...mockAccounts[0], account_id: 'ACC-FROZEN', status: 'FROZEN' as const },
    ];
    mockAccountsAdapter.getAccounts.and.returnValue(of({ success: true, data: mixedAccounts }));
    component.goToStep2();
    await fixture.whenStable();
    expect(component.accounts().length).toBe(1);
    expect(component.accounts()[0].status).toBe('ACTIVE');
  });
});
