/**
 * Tests: SendMoneyComponent
 *
 * Verifica el flujo de 3 pasos para envio SPEI del portal B2C.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SendMoneyComponent } from './send-money.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { PersonalService } from '../../services/personal.service';

const mockAccount = {
  account_id: 'acc-001',
  organization_id: 'org-001',
  account_type: 'CLABE_PRIVADA' as const,
  status: 'ACTIVE' as const,
  balance: 10000,
  available_balance: 9000,
  clabe: '123456789012345678',
  created_at: '2024-01-01T00:00:00Z',
};

const mockTransfer = {
  transfer_id: 'txn-001',
  organization_id: 'org-001',
  source_account_id: 'acc-001',
  destination_clabe: '987654321098765432',
  destination_name: 'Juan Perez',
  amount: 500,
  concept: 'Pago renta',
  status: 'PENDING' as const,
  created_at: '2024-01-15T10:00:00Z',
};

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  currentUser: () => ({ name: 'Test User' }),
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAccountsAdapter = {
  getAccounts: jasmine.createSpy('getAccounts').and.returnValue(
    of({ success: true, data: [mockAccount] })
  ),
};

const mockPersonalService = {
  sendSpei: jasmine.createSpy('sendSpei').and.returnValue(
    of({ success: true, data: mockTransfer })
  ),
};

describe('SendMoneyComponent', () => {
  let fixture: ComponentFixture<SendMoneyComponent>;
  let component: SendMoneyComponent;

  beforeEach(async () => {
    mockAccountsAdapter.getAccounts.calls.reset();
    mockPersonalService.sendSpei.calls.reset();

    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    mockPersonalService.sendSpei.and.returnValue(
      of({ success: true, data: mockTransfer })
    );

    await TestBed.configureTestingModule({
      imports: [SendMoneyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: PersonalService, useValue: mockPersonalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SendMoneyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe iniciar en paso 1', () => {
    expect(component.currentStep()).toBe(1);
  });

  it('debe cargar la cuenta de origen en ngOnInit', async () => {
    await fixture.whenStable();
    expect(mockAccountsAdapter.getAccounts).toHaveBeenCalledWith('org-001');
  });

  it('no debe avanzar al paso 2 si la CLABE es invalida', () => {
    component.clabeForm.setValue({ clabe: '123', destinationName: 'Juan' });
    component.goToStep2();
    expect(component.currentStep()).toBe(1);
  });

  it('no debe avanzar si el nombre del beneficiario esta vacio', () => {
    component.clabeForm.setValue({ clabe: '123456789012345678', destinationName: '' });
    component.goToStep2();
    expect(component.currentStep()).toBe(1);
  });

  it('debe avanzar al paso 2 con CLABE valida y nombre', () => {
    component.clabeForm.setValue({
      clabe: '123456789012345678',
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    expect(component.currentStep()).toBe(2);
  });

  it('debe regresar al paso 1 desde paso 2', () => {
    component.clabeForm.setValue({
      clabe: '123456789012345678',
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    component.goToStep(1);
    expect(component.currentStep()).toBe(1);
  });

  it('debe enviar transferencia y avanzar al paso 3', async () => {
    component.clabeForm.setValue({
      clabe: '987654321098765432',
      destinationName: 'Juan Perez',
    });
    component.goToStep2();

    component.amountForm.setValue({ amount: 500, concept: 'Pago renta' });
    component.submitTransfer();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockPersonalService.sendSpei).toHaveBeenCalled();
    expect(component.currentStep()).toBe(3);
    expect(component.completedTransfer()).toEqual(mockTransfer);
  });

  it('debe mostrar error cuando falla el envio', async () => {
    mockPersonalService.sendSpei.and.returnValue(
      throwError(() => new Error('Transfer failed'))
    );

    component.clabeForm.setValue({
      clabe: '987654321098765432',
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    component.amountForm.setValue({ amount: 500, concept: 'Pago renta' });
    component.submitTransfer();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.currentStep()).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe limpiar formularios al iniciar nueva transferencia', () => {
    component.clabeForm.setValue({
      clabe: '987654321098765432',
      destinationName: 'Juan',
    });
    component.startNewTransfer();
    expect(component.currentStep()).toBe(1);
    expect(component.clabeForm.value.clabe).toBeFalsy();
    expect(component.completedTransfer()).toBeNull();
  });

  it('no debe enviar si el monto es menor a 1', () => {
    component.clabeForm.setValue({
      clabe: '987654321098765432',
      destinationName: 'Juan',
    });
    component.goToStep2();
    component.amountForm.setValue({ amount: 0, concept: 'test' });
    component.submitTransfer();
    expect(component.currentStep()).toBe(2);
    expect(mockPersonalService.sendSpei).not.toHaveBeenCalled();
  });
});
