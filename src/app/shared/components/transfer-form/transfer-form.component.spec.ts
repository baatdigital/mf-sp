import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransferFormComponent, TransferRequest } from './transfer-form.component';
import { FinancialAccount } from '../../../domain/models/financial-account.model';
import { ReactiveFormsModule } from '@angular/forms';

const makeAccount = (overrides: Partial<FinancialAccount> = {}): FinancialAccount => ({
  account_id: 'acc-001',
  organization_id: 'org-001',
  account_type: 'OPERATIVA',
  status: 'ACTIVE',
  balance: 1000,
  available_balance: 900,
  name: 'Cuenta Operativa',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('TransferFormComponent', () => {
  let component: TransferFormComponent;
  let fixture: ComponentFixture<TransferFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferFormComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferFormComponent);
    component = fixture.componentInstance;
    component.sourceAccounts = [
      makeAccount({ account_id: 'acc-001', name: 'Cuenta A' }),
      makeAccount({ account_id: 'acc-002', name: 'Cuenta B' }),
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.form.get('sourceAccountId')?.value).toBe('');
    expect(component.form.get('destinationAccountId')?.value).toBe('');
    expect(component.form.get('amount')?.value).toBe('');
    expect(component.form.get('description')?.value).toBe('');
  });

  it('should be invalid when form is empty', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.form.setValue({
      sourceAccountId: 'acc-001',
      destinationAccountId: 'acc-002',
      amount: '100.00',
      description: 'Pago de servicios',
    });
    expect(component.form.valid).toBeTrue();
  });

  it('should emit transferSubmitted with correct payload on valid submit', () => {
    const emitted: TransferRequest[] = [];
    component.transferSubmitted.subscribe((r: TransferRequest) => emitted.push(r));

    component.form.setValue({
      sourceAccountId: 'acc-001',
      destinationAccountId: 'acc-002',
      amount: '250.50',
      description: 'Transferencia de prueba',
    });
    component.onSubmit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].amount).toBe(250.50);
    expect(emitted[0].sourceAccountId).toBe('acc-001');
    expect(emitted[0].transferType).toBe('INTERNAL');
  });

  it('should not emit when form is invalid on submit', () => {
    const emitted: TransferRequest[] = [];
    component.transferSubmitted.subscribe((r: TransferRequest) => emitted.push(r));
    component.onSubmit();
    expect(emitted.length).toBe(0);
  });

  it('should emit formCancelled on cancel', () => {
    let cancelled = false;
    component.formCancelled.subscribe(() => (cancelled = true));
    component.onCancel();
    expect(cancelled).toBeTrue();
  });

  it('should reset form on cancel', () => {
    component.form.setValue({
      sourceAccountId: 'acc-001',
      destinationAccountId: 'acc-002',
      amount: '100',
      description: 'Test',
    });
    component.onCancel();
    expect(component.form.get('sourceAccountId')?.value).toBeNull();
  });

  it('isInvalid should return true for touched + invalid control', () => {
    const ctrl = component.form.get('sourceAccountId');
    ctrl?.markAsTouched();
    expect(component.isInvalid('sourceAccountId')).toBeTrue();
  });

  it('isInvalid should return false for untouched control even if invalid', () => {
    expect(component.isInvalid('sourceAccountId')).toBeFalse();
  });

  it('destinationOptions should exclude the selected source account', () => {
    component.form.get('sourceAccountId')?.setValue('acc-001');
    const options = component.destinationOptions;
    expect(options.find(a => a.account_id === 'acc-001')).toBeUndefined();
    expect(options.find(a => a.account_id === 'acc-002')).toBeTruthy();
  });

  it('amount field should fail validation for negative value', () => {
    const ctrl = component.form.get('amount');
    ctrl?.setValue('-10');
    ctrl?.markAsTouched();
    expect(ctrl?.errors?.['notPositive']).toBeTrue();
  });

  it('description field should fail when exceeds 200 chars', () => {
    const longText = 'a'.repeat(201);
    const ctrl = component.form.get('description');
    ctrl?.setValue(longText);
    ctrl?.markAsTouched();
    expect(ctrl?.errors?.['maxlength']).toBeTruthy();
  });

  it('trackById should return account_id', () => {
    const acc = makeAccount({ account_id: 'acc-xyz' });
    expect(component.trackById(0, acc)).toBe('acc-xyz');
  });
});
