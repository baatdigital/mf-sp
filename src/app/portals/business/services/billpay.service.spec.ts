/**
 * Tests: BillpayServiceApi
 *
 * Cubre las operaciones del servicio de pago de recibos y servicios.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BillpayServiceApi } from './billpay.service';
import { SharedStateService } from '@shared-state';
import { environment } from '@environment';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-biz-001',
  tenant: () => ({ id: 'superpago', apiKey: 'test-api-key' }),
  currentUser: () => ({ name: 'Biz User' }),
};

describe('BillpayServiceApi', () => {
  let service: BillpayServiceApi;
  let httpMock: HttpTestingController;
  const baseUrl = environment.api.core;
  const orgId = 'org-biz-001';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BillpayServiceApi,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(BillpayServiceApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getServices()', () => {
    it('debe hacer GET al catalogo de servicios disponibles', () => {
      const mockResponse = {
        success: true,
        data: [
          {
            service_id: 'CFE',
            name: 'CFE',
            category: 'electricidad' as const,
            icon: '⚡',
            description: 'Comision Federal de Electricidad',
          },
        ],
      };

      service.getServices().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.length).toBe(1);
        expect(res.data[0].service_id).toBe('CFE');
      });

      const req = httpMock.expectOne(`${baseUrl}/billpay/services`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('queryBill()', () => {
    it('debe hacer POST con service_id y reference para consultar deuda', () => {
      const mockResult = {
        success: true,
        data: {
          service_id: 'CFE',
          service_name: 'CFE',
          reference: '123456789',
          amount_due: 850.5,
          due_date: '2026-02-28',
          biller_name: 'Comision Federal de Electricidad',
        },
      };

      service.queryBill(orgId, 'CFE', '123456789').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.amount_due).toBe(850.5);
        expect(res.data.reference).toBe('123456789');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/billpay/query`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ service_id: 'CFE', reference: '123456789' });
      req.flush(mockResult);
    });
  });

  describe('payBill()', () => {
    it('debe hacer POST con los datos del pago al endpoint de ejecucion', () => {
      const body = {
        service_id: 'CFE',
        reference: '123456789',
        amount: 850.5,
        account_id: 'ACC-001',
        idempotency_key: 'uuid-1234',
      };

      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'TXN-BILL-001',
          status: 'COMPLETED' as const,
          service_name: 'CFE',
          reference: '123456789',
          amount: 850.5,
          completed_at: '2026-02-17T10:00:00Z',
        },
      };

      service.payBill(orgId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.transaction_id).toBe('TXN-BILL-001');
        expect(res.data.status).toBe('COMPLETED');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/billpay/execute`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('getBillpayHistory()', () => {
    it('debe hacer GET al historial de pagos de una cuenta', () => {
      const accountId = 'ACC-001';

      service.getBillpayHistory(orgId, accountId).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.total).toBe(0);
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/billpay/history/${accountId}`
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });
  });

  describe('getSavedServices()', () => {
    it('debe hacer GET a los servicios guardados de la organizacion', () => {
      service.getSavedServices(orgId).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data).toEqual([]);
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/billpay/saved`
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [] });
    });
  });

  describe('saveService()', () => {
    it('debe hacer POST para guardar un servicio para pagos rapidos', () => {
      const body = {
        service_id: 'CFE',
        service_name: 'CFE',
        reference: '123456789',
        nickname: 'Oficina Norte',
      };

      const mockResponse = {
        success: true,
        data: {
          saved_id: 'SAV-001',
          service_id: 'CFE',
          service_name: 'CFE',
          reference: '123456789',
          nickname: 'Oficina Norte',
        },
      };

      service.saveService(orgId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.saved_id).toBe('SAV-001');
        expect(res.data.nickname).toBe('Oficina Norte');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/billpay/saved`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('deleteSavedService()', () => {
    it('debe hacer DELETE para eliminar un servicio guardado', () => {
      const savedId = 'SAV-001';

      service.deleteSavedService(orgId, savedId).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/billpay/saved/${savedId}`
      );
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });
});
