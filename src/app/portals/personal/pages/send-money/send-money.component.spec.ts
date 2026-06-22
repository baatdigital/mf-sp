/**
 * Tests: SendMoneyComponent
 *
 * Verifica el flujo de 3 pasos para envio SPEI del portal B2C.
 * Usa CLABEs con checksum correcto (DJ-FQ-03).
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { SendMoneyComponent } from './send-money.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { PersonalService } from '../../services/personal.service';

// CLABEs con checksum correcto (verificado con algoritmo Banxico mod-10)
const VALID_CLABE_STP  = '646180110400000007'; // STP (ultimo digito: 7)
const VALID_CLABE_STP2 = '646180110400000010'; // STP alternativa (ultimo digito: 0)

const mockAccount = {
  account_id: 'acc-001',
  organization_id: 'org-001',
  account_type: 'CLABE_PRIVADA' as const,
  status: 'ACTIVE' as const,
  balance: 10000,
  available_balance: 9000,
  clabe: VALID_CLABE_STP,
  created_at: '2024-01-01T00:00:00Z',
};

const mockTransfer = {
  transfer_id: 'txn-001',
  organization_id: 'org-001',
  source_account_id: 'acc-001',
  destination_clabe: VALID_CLABE_STP2,
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

describe('SendMoneyComponent', () => {
  let fixture: ComponentFixture<SendMoneyComponent>;
  let component: SendMoneyComponent;
  let personalServiceSpy: jasmine.SpyObj<PersonalService>;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  beforeEach(async () => {
    personalServiceSpy = jasmine.createSpyObj('PersonalService', ['sendSpei']);
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', ['getAccounts']);

    accountsAdapterSpy.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    personalServiceSpy.sendSpei.and.returnValue(
      of({ success: true, data: mockTransfer })
    );

    await TestBed.configureTestingModule({
      imports: [SendMoneyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: PersonalService, useValue: personalServiceSpy },
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
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-001');
  });

  it('no debe avanzar al paso 2 si la CLABE es invalida (formato)', () => {
    component.clabeForm.setValue({ clabe: '123', destinationName: 'Juan' });
    component.goToStep2();
    expect(component.currentStep()).toBe(1);
  });

  it('no debe avanzar si CLABE tiene 18 digitos pero checksum incorrecto (DJ-FQ-03)', () => {
    // 646180110400000008 — checksum debe ser 7, no 8
    component.clabeForm.setValue({ clabe: '646180110400000008', destinationName: 'Juan' });
    component.goToStep2();
    expect(component.currentStep()).toBe(1);
    expect(component.clabeForm.get('clabe')?.errors?.['clabeChecksum']).toBeTrue();
  });

  it('no debe avanzar si el nombre del beneficiario esta vacio', () => {
    component.clabeForm.setValue({ clabe: VALID_CLABE_STP, destinationName: '' });
    component.goToStep2();
    expect(component.currentStep()).toBe(1);
  });

  it('debe avanzar al paso 2 con CLABE valida (checksum correcto) y nombre (DJ-FQ-03)', () => {
    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    expect(component.currentStep()).toBe(2);
  });

  it('debe regresar al paso 1 desde paso 2', () => {
    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    component.goToStep(1);
    expect(component.currentStep()).toBe(1);
  });

  it('debe enviar transferencia y avanzar al paso 3', async () => {
    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();

    component.amountForm.setValue({ amount: 500, concept: 'Pago renta' });
    component.submitTransfer();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(personalServiceSpy.sendSpei).toHaveBeenCalled();
    expect(component.currentStep()).toBe(3);
    expect(component.completedTransfer()).toEqual(mockTransfer);
  });

  it('debe enviar idempotency_key en el request (DJ-FQ-01)', async () => {
    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    component.amountForm.setValue({ amount: 500, concept: 'Pago renta' });
    component.submitTransfer();

    await fixture.whenStable();

    expect(personalServiceSpy.sendSpei).toHaveBeenCalledWith(
      'org-001',
      jasmine.objectContaining({ idempotency_key: jasmine.any(String) })
    );
  });

  it('debe bloquear doble-submit con _submitLock (DJ-FQ-01)', async () => {
    // Usar Subject para que el lock NO se libere sincronicamente antes del segundo click
    const pending$ = new Subject<{ success: boolean; data: typeof mockTransfer }>();
    personalServiceSpy.sendSpei.and.returnValue(pending$.asObservable());

    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    component.amountForm.setValue({ amount: 500, concept: 'Pago renta' });

    // Primer submit: lock se setea a true, Observable no completa
    component.submitTransfer();
    // Segundo submit inmediato: debe ser bloqueado por _submitLock
    component.submitTransfer();

    expect(personalServiceSpy.sendSpei).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('debe extraer mensaje de error real del backend (DJ-FQ-07)', async () => {
    personalServiceSpy.sendSpei.and.returnValue(
      throwError(() => ({ error: { detail: 'Saldo insuficiente' } }))
    );

    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    fixture.detectChanges();

    component.amountForm.setValue({ amount: 500, concept: 'Pago renta' });
    component.submitTransfer();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe('Saldo insuficiente');
    expect(component.currentStep()).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando falla el envio (mensaje generico)', async () => {
    personalServiceSpy.sendSpei.and.returnValue(
      throwError(() => new Error('Transfer failed'))
    );

    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan Perez',
    });
    component.goToStep2();
    fixture.detectChanges();

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
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan',
    });
    component.startNewTransfer();
    expect(component.currentStep()).toBe(1);
    expect(component.clabeForm.value.clabe).toBeFalsy();
    expect(component.completedTransfer()).toBeNull();
  });

  it('debe regenerar idempotency key al iniciar nueva transferencia (DJ-FQ-01)', () => {
    const key1 = (component as unknown as Record<string, unknown>)['_idempotencyKey'] as string;
    component.startNewTransfer();
    const key2 = (component as unknown as Record<string, unknown>)['_idempotencyKey'] as string;
    expect(key1).not.toBe(key2);
  });

  it('no debe enviar si el monto es menor a 1', () => {
    component.clabeForm.setValue({
      clabe: VALID_CLABE_STP2,
      destinationName: 'Juan',
    });
    component.goToStep2();
    fixture.detectChanges();

    component.amountForm.setValue({ amount: 0, concept: 'test' });
    component.submitTransfer();

    expect(component.currentStep()).toBe(2);
    expect(personalServiceSpy.sendSpei).not.toHaveBeenCalled();
  });
});
