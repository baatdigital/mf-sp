/**
 * Tests: CashDashboardComponent
 *
 * Verifica que el dashboard de efectivo carga correctamente.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CashDashboardComponent } from './cash-dashboard.component';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { CashService } from '../../services/cash.service';

const mockAccount = {
  account_id: 'ACC-001',
  status: 'ACTIVE',
  balance: 1500,
  available_balance: 1200,
  currency: 'MXN',
  account_type: 'PERSONAL',
  org_id: 'org-123',
  created_at: '2026-01-01T00:00:00Z',
};

const mockSharedState = {
  currentOrganizationId: () => 'org-123',
  currentUser: () => ({ name: 'Juan Test' }),
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockAccountsAdapter = {
  getAccounts: jasmine.createSpy('getAccounts').and.returnValue(
    of({ success: true, data: [mockAccount] })
  ),
};

const mockCashService = {
  getHistory: jasmine.createSpy('getHistory').and.returnValue(
    of({
      success: true,
      data: [
        { transaction_id: 'TXN-1', type: 'DEPOSIT', amount: 500, status: 'COMPLETED', point_id: 'PP-001', created_at: '2026-01-01T10:00:00Z' },
      ],
      total: 1,
    })
  ),
};

describe('CashDashboardComponent', () => {
  let fixture: ComponentFixture<CashDashboardComponent>;
  let component: CashDashboardComponent;

  beforeEach(async () => {
    mockAccountsAdapter.getAccounts.calls.reset();
    mockAccountsAdapter.getAccounts.and.returnValue(
      of({ success: true, data: [mockAccount] })
    );
    mockCashService.getHistory.calls.reset();
    mockCashService.getHistory.and.returnValue(
      of({
        success: true,
        data: [
          { transaction_id: 'TXN-1', type: 'DEPOSIT', amount: 500, status: 'COMPLETED', point_id: 'PP-001', created_at: '2026-01-01T10:00:00Z' },
        ],
        total: 1,
      })
    );

    await TestBed.configureTestingModule({
      imports: [CashDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: mockAccountsAdapter },
        { provide: CashService, useValue: mockCashService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar la cuenta y el historial en ngOnInit', () => {
    expect(mockAccountsAdapter.getAccounts).toHaveBeenCalledWith('org-123');
    expect(mockCashService.getHistory).toHaveBeenCalledWith('org-123', 'ACC-001');
  });

  it('debe mostrar el saldo disponible de la cuenta activa', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1,200.00');
  });

  it('debe ocultar loading despues de cargar los datos', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar transacciones recientes cuando existen', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.recentTransactions().length).toBe(1);
    expect(component.recentTransactions()[0].transaction_id).toBe('TXN-1');
  });

  it('debe manejar error de cuentas y desactivar loading', async () => {
    mockAccountsAdapter.getAccounts.and.returnValue(throwError(() => new Error('Network error')));

    const fixture2 = TestBed.createComponent(CashDashboardComponent);
    fixture2.detectChanges();

    await fixture2.whenStable();
    fixture2.detectChanges();

    expect(fixture2.componentInstance.isLoading()).toBeFalse();
    expect(fixture2.componentInstance.error()).toBeTruthy();
  });

  it('debe mostrar historial vacio cuando el servicio falla silenciosamente', async () => {
    mockCashService.getHistory.and.returnValue(throwError(() => new Error('History error')));

    const fixture3 = TestBed.createComponent(CashDashboardComponent);
    fixture3.detectChanges();
    await fixture3.whenStable();
    fixture3.detectChanges();

    expect(fixture3.componentInstance.recentTransactions()).toEqual([]);
    expect(fixture3.componentInstance.isLoading()).toBeFalse();
  });
});
