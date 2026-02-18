/**
 * Pruebas unitarias para TransfersAdapter
 *
 * Valida la comunicacion HTTP con el API de transferencias SPEI.
 */

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TransfersAdapter } from './transfers.adapter';
import { HttpService } from '../../core/http/http.service';
import { SpeiTransfer, CreateTransferRequest } from '../../domain/models/transfer.model';

describe('TransfersAdapter', () => {
  let adapter: TransfersAdapter;
  let httpServiceSpy: jasmine.SpyObj<HttpService>;

  const orgId = 'org-test-123';
  const transferId = 'txn-test-456';
  const apiUrl = 'http://127.0.0.1:5001/api/v1';

  const mockTransfer: SpeiTransfer = {
    transfer_id: transferId,
    organization_id: orgId,
    source_account_id: 'acc-001',
    destination_clabe: '646180123456789012',
    destination_name: 'Juan Perez',
    amount: 5000,
    concept: 'Pago de servicios',
    status: 'COMPLETED',
    created_at: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('HttpService', ['get', 'post', 'put', 'patch', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        TransfersAdapter,
        { provide: HttpService, useValue: spy },
      ],
    });

    adapter = TestBed.inject(TransfersAdapter);
    httpServiceSpy = TestBed.inject(HttpService) as jasmine.SpyObj<HttpService>;
  });

  describe('getTransfers', () => {
    it('debe llamar al endpoint correcto con paginacion por defecto', () => {
      const mockResponse = { success: true, data: [mockTransfer] };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getTransfers(orgId).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data.length).toBe(1);
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/transfers`,
        jasmine.objectContaining({
          params: { page: '1', page_size: '20' },
        })
      );
    });

    it('debe usar la paginacion proporcionada', () => {
      const mockResponse = { success: true, data: [] };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getTransfers(orgId, 2, 10).subscribe();

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/transfers`,
        jasmine.objectContaining({
          params: { page: '2', page_size: '10' },
        })
      );
    });
  });

  describe('getTransfer', () => {
    it('debe llamar al endpoint con el transferId correcto', () => {
      const mockResponse = { success: true, data: mockTransfer };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getTransfer(orgId, transferId).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data.transfer_id).toBe(transferId);
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/transfers/${transferId}`
      );
    });
  });

  describe('createTransfer', () => {
    it('debe enviar la solicitud de transferencia al endpoint correcto', () => {
      const request: CreateTransferRequest = {
        source_account_id: 'acc-001',
        destination_clabe: '646180123456789012',
        destination_name: 'Juan Perez',
        amount: 5000,
        concept: 'Pago de servicios',
      };
      const mockResponse = { success: true, data: mockTransfer };
      httpServiceSpy.post.and.returnValue(of(mockResponse));

      adapter.createTransfer(orgId, request).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data.destination_name).toBe('Juan Perez');
      });

      expect(httpServiceSpy.post).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/transfers`,
        request
      );
    });
  });

  describe('cancelTransfer', () => {
    it('debe llamar al endpoint de cancelacion', () => {
      const cancelledTransfer = { ...mockTransfer, status: 'FAILED' as const };
      const mockResponse = { success: true, data: cancelledTransfer };
      httpServiceSpy.post.and.returnValue(of(mockResponse));

      adapter.cancelTransfer(orgId, transferId).subscribe((result) => {
        expect(result.success).toBeTrue();
      });

      expect(httpServiceSpy.post).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/transfers/${transferId}/cancel`,
        {}
      );
    });
  });

  describe('getAccountTransfers', () => {
    it('debe llamar al endpoint de transferencias de cuenta', () => {
      const accountId = 'acc-test-789';
      const mockResponse = { success: true, data: [mockTransfer] };
      httpServiceSpy.get.and.returnValue(of(mockResponse));

      adapter.getAccountTransfers(orgId, accountId).subscribe((result) => {
        expect(result.success).toBeTrue();
      });

      expect(httpServiceSpy.get).toHaveBeenCalledWith(
        `${apiUrl}/organizations/${orgId}/accounts/${accountId}/transfers`,
        jasmine.objectContaining({ params: { page: '1' } })
      );
    });
  });
});
