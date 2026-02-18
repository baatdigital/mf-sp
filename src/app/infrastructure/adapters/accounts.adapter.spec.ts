/**
 * Pruebas unitarias para AccountsAdapter
 *
 * Valida la comunicacion HTTP con el API de cuentas financieras.
 */

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountsAdapter } from './accounts.adapter';
import { HttpService } from '../../core/http/http.service';
import { FinancialAccount } from '../../domain/models/financial-account.model';

describe('AccountsAdapter', () => {
  let adapter: AccountsAdapter;
  let httpServiceSpy: jasmine.SpyObj<HttpService>;

  const orgId = 'org-test-123';
  const accountId = 'acc-test-456';
  const apiUrl = 'http://127.0.0.1:5001/api/v1';

  const mockAccount: FinancialAccount = {
    account_id: accountId,
    organization_id: orgId,
    account_type: 'CONCENTRADORA',
    status: 'ACTIVE',
    balance: 100000,
    available_balance: 95000,
    clabe: '646180123456789012',
    name: 'Cuenta Principal',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('HttpService', ['get', 'post', 'put', 'patch', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        AccountsAdapter,
        { provide: HttpService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(AccountsAdapter);
    httpServiceSpy = TestBed.inject(HttpService) as jasmine.SpyObj<HttpService>;
  });

  describe('getAccounts', () => {
    it('debe llamar al endpoint correcto', () => {
      const mockResponse = { success: true, data: [mockAccount] };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getAccounts(orgId).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data.length).toBe(1);
        expect(result.data[0].account_id).toBe(accountId);
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts`
      );
    });

    it('debe retornar lista vacia si no hay cuentas', () => {
      const mockResponse = { success: true, data: [] };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getAccounts(orgId).subscribe((result) => {
        expect(result.data).toEqual([]);
      });
    });
  });

  describe('getAccount', () => {
    it('debe llamar al endpoint con el accountId correcto', () => {
      const mockResponse = { success: true, data: mockAccount };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getAccount(orgId, accountId).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data.account_id).toBe(accountId);
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}`
      );
    });
  });

  describe('getBalance', () => {
    it('debe llamar al endpoint de balance', () => {
      const mockBalance = {
        success: true,
        data: {
          account_id: accountId,
          balance: 100000,
          available_balance: 95000,
          frozen_balance: 5000,
          currency: 'MXN',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };
      httpServiceSpy.get.and.returnValue(of(mockBalance));

      adapter.getBalance(orgId, accountId).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data.balance).toBe(100000);
        expect(result.data.available_balance).toBe(95000);
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}/balance`
      );
    });
  });

  describe('getLedgerEntries', () => {
    it('debe llamar al endpoint de ledger con paginacion por defecto', () => {
      const mockResponse = { success: true, data: [], total: 0 };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getLedgerEntries(orgId, accountId).subscribe((result) => {
        expect(result.success).toBeTrue();
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}/ledger`,
        jasmine.objectContaining({
          params: { page: '1', page_size: '20' },
        })
      );
    });

    it('debe usar la paginacion proporcionada', () => {
      const mockResponse = { success: true, data: [] };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getLedgerEntries(orgId, accountId, 3, 50).subscribe();

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}/ledger`,
        jasmine.objectContaining({
          params: { page: '3', page_size: '50' },
        })
      );
    });
  });

  describe('freezeAccount', () => {
    it('debe llamar al endpoint freeze con el motivo', () => {
      const mockResponse = { success: true, data: { ...mockAccount, status: 'FROZEN' as const } };
      httpServiceSpy.post.and.returnValue(of(mockResponse));

      const reason = 'Actividad sospechosa';
      adapter.freezeAccount(orgId, accountId, reason).subscribe((result) => {
        expect(result.success).toBeTrue();
      });

      expect(httpServiceSpy.post).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}/freeze`,
        { reason }
      );
    });
  });

  describe('unfreezeAccount', () => {
    it('debe llamar al endpoint unfreeze', () => {
      const mockResponse = { success: true, data: mockAccount };
      httpServiceSpy.post.and.returnValue(of(mockResponse));

      adapter.unfreezeAccount(orgId, accountId).subscribe((result) => {
        expect(result.success).toBeTrue();
      });

      expect(httpServiceSpy.post).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}/unfreeze`,
        {}
      );
    });
  });
});
