import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { SpeiTransferComponent } from './spei-transfer.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { BusinessService } from '../../services/business.service';
import { FinancialAccount } from '../../../../domain/models/financial-account.model';
import { SpeiTransfer } from '../../../../domain/models/transfer.model';

const mockAccount: FinancialAccount = {
  account_id: 'acc-1',
  organization_id: 'org-1',
  account_type: 'CONCENTRADORA',
  status: 'ACTIVE',
  balance: 100000,
  available_balance: 95000,
  name: 'Cuenta Principal',
  created_at: '2025-01-01T00:00:00Z',
};

const mockTransfer: SpeiTransfer = {
  transfer_id: 'txn-1',
  organization_id: 'org-1',
  source_account_id: 'acc-1',
  destination_clabe: '646180110400000007',
  destination_name: 'Juan Perez',
  amount: 1000,
  concept: 'Pago de servicios',
  status: 'PENDING',
  created_at: '2025-01-15T10:00:00Z',
};

describe('SpeiTransferComponent', () => {
  let fixture: ComponentFixture<SpeiTransferComponent>;
  let component: SpeiTransferComponent;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;
  let businessServiceSpy: jasmine.SpyObj<BusinessService>;

  beforeEach(async () => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', ['getAccounts']);
    businessServiceSpy = jasmine.createSpyObj('BusinessService', ['sendSpei']);

    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );

    const sharedStateSpy = jasmine.createSpyObj('SharedStateService', [], {
      currentOrganizationId: signal('org-1'),
      tenant: signal({ name: 'Test', id: 't-1', apiKey: 'key' }),
    });

    await TestBed.configureTestingModule({
      imports: [SpeiTransferComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: BusinessService, useValue: businessServiceSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpeiTransferComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the SPEI form on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('.spei-form');
    expect(form).toBeTruthy();
  });

  it('should load source accounts on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-1');
    expect(component.sourceAccounts().length).toBe(1);
  });

  it('debe rechazar CLABE de 18 digitos con checksum incorrecto (DJ-FQ-03)', () => {
    fixture.detectChanges();
    const clabeCtrl = component.form.get('destinationClabe');
    // 646180110400000008 — mismo formato pero ultimo digito incorrecto
    clabeCtrl?.setValue('646180110400000008');
    clabeCtrl?.markAsTouched();
    expect(clabeCtrl?.invalid).toBeTrue();
    expect(clabeCtrl?.errors?.['clabeChecksum']).toBeTrue();
  });

  it('debe aceptar CLABE con checksum correcto (DJ-FQ-03)', () => {
    fixture.detectChanges();
    const clabeCtrl = component.form.get('destinationClabe');
    clabeCtrl?.setValue('646180110400000007'); // checksum correcto
    expect(clabeCtrl?.valid).toBeTrue();
  });

  it('should validate CLABE format (18 digits required)', () => {
    fixture.detectChanges();
    const clabeCtrl = component.form.get('destinationClabe');
    clabeCtrl?.setValue('12345'); // too short
    clabeCtrl?.markAsTouched();
    expect(clabeCtrl?.invalid).toBeTrue();
    expect(clabeCtrl?.errors?.['clabeInvalid']).toBeTrue();
  });

  it('should reject non-positive amount', () => {
    fixture.detectChanges();
    const amountCtrl = component.form.get('amount');
    amountCtrl?.setValue(-100);
    amountCtrl?.markAsTouched();
    expect(amountCtrl?.errors?.['notPositive']).toBeTrue();

    amountCtrl?.setValue(500);
    expect(amountCtrl?.valid).toBeTrue();
  });

  it('should submit and show tracker on success', async () => {
    businessServiceSpy.sendSpei.and.returnValue(
      of({ success: true, data: mockTransfer })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.setValue({
      sourceAccountId: 'acc-1',
      destinationClabe: '646180110400000007',
      destinationName: 'Juan Perez',
      amount: 1000,
      concept: 'Pago servicios',
      reference: '',
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(businessServiceSpy.sendSpei).toHaveBeenCalledWith(
      'org-1',
      jasmine.objectContaining({
        source_account_id: 'acc-1',
        destination_clabe: '646180110400000007',
        amount: 1000,
      }),
      jasmine.objectContaining({ 'X-Idempotency-Key': jasmine.any(String) })
    );
    expect(component.submittedTransfer()).toEqual(mockTransfer);
  });

  it('debe extraer mensaje de error del backend (DJ-FQ-06)', async () => {
    businessServiceSpy.sendSpei.and.returnValue(
      throwError(() => ({ error: { detail: 'Saldo insuficiente' } }))
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.setValue({
      sourceAccountId: 'acc-1',
      destinationClabe: '646180110400000007',
      destinationName: 'Juan Perez',
      amount: 1000,
      concept: 'Pago servicios',
      reference: '',
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(component.submitError()).toBe('Saldo insuficiente');
    expect(component.isSubmitting()).toBeFalse();
  });

  it('debe usar mensaje generico cuando el backend no envia detalle', async () => {
    businessServiceSpy.sendSpei.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.setValue({
      sourceAccountId: 'acc-1',
      destinationClabe: '646180110400000007',
      destinationName: 'Juan Perez',
      amount: 1000,
      concept: 'Pago servicios',
      reference: '',
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(component.submitError()).toBeTruthy();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('debe bloquear doble-submit con _submitLock (DJ-FQ-01)', async () => {
    businessServiceSpy.sendSpei.and.returnValue(
      of({ success: true, data: mockTransfer })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.setValue({
      sourceAccountId: 'acc-1',
      destinationClabe: '646180110400000007',
      destinationName: 'Juan Perez',
      amount: 1000,
      concept: 'Pago servicios',
      reference: '',
    });

    // Llamar onSubmit dos veces seguidas — solo debe ejecutar una llamada HTTP
    component.onSubmit();
    component.onSubmit();
    await fixture.whenStable();

    expect(businessServiceSpy.sendSpei).toHaveBeenCalledTimes(1);
  });

  it('debe generar idempotency key distinto despues de resetForm (DJ-FQ-01)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const key1 = (component as unknown as Record<string, unknown>)['_idempotencyKey'] as string;
    component.resetForm();
    const key2 = (component as unknown as Record<string, unknown>)['_idempotencyKey'] as string;
    expect(key1).not.toBe('');
    expect(key2).not.toBe('');
    expect(key1).not.toBe(key2);
  });

  it('should mark form as touched and not submit when form is invalid', () => {
    fixture.detectChanges();
    component.onSubmit();
    expect(businessServiceSpy.sendSpei).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should reset form when resetForm is called', async () => {
    fixture.detectChanges();
    component.submittedTransfer.set(mockTransfer);
    component.resetForm();
    expect(component.submittedTransfer()).toBeNull();
    expect(component.submitError()).toBeNull();
  });

  it('debe mostrar loadError y permitir reintentar cuando loadAccounts falla (DJ-FQ-11)', async () => {
    accountsAdapterSpy.getAccounts.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.loadError()).toBeTruthy();
    expect(component.loadingAccounts()).toBeFalse();
  });

  it('debe limpiar loadError y recargar cuentas al reintentar (DJ-FQ-11)', async () => {
    accountsAdapterSpy.getAccounts.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Ahora simular recuperacion de red
    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    component.loadAccounts();
    await fixture.whenStable();

    expect(component.loadError()).toBeNull();
    expect(component.sourceAccounts().length).toBe(1);
  });
});
