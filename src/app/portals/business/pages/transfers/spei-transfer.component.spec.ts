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
  destination_clabe: '646180123456789012',
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

  it('should validate CLABE as 18 digits', () => {
    fixture.detectChanges();
    const clabeCtrl = component.form.get('destinationClabe');
    clabeCtrl?.setValue('12345'); // too short
    clabeCtrl?.markAsTouched();
    expect(clabeCtrl?.invalid).toBeTrue();
    expect(clabeCtrl?.errors?.['invalidClabe']).toBeTrue();

    clabeCtrl?.setValue('646180123456789012'); // valid 18-digit CLABE
    expect(clabeCtrl?.valid).toBeTrue();
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
      destinationClabe: '646180123456789012',
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
        destination_clabe: '646180123456789012',
        amount: 1000,
      })
    );
    expect(component.submittedTransfer()).toEqual(mockTransfer);
  });

  it('should set submitError when sendSpei fails', async () => {
    businessServiceSpy.sendSpei.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.setValue({
      sourceAccountId: 'acc-1',
      destinationClabe: '646180123456789012',
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

  it('should mark form as touched and not submit when form is invalid', () => {
    fixture.detectChanges();
    // Form is empty and invalid
    component.onSubmit();
    expect(businessServiceSpy.sendSpei).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should reset form when resetForm is called', async () => {
    businessServiceSpy.sendSpei.and.returnValue(
      of({ success: true, data: mockTransfer })
    );
    fixture.detectChanges();
    component.submittedTransfer.set(mockTransfer);
    component.resetForm();
    expect(component.submittedTransfer()).toBeNull();
    expect(component.submitError()).toBeNull();
  });
});
