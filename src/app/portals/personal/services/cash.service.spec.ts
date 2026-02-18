/**
 * Tests: CashService
 *
 * Cubre depositos, retiros y consulta de historial de efectivo.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CashService } from './cash.service';
import { SharedStateService } from '@shared-state';
import { environment } from '@environment';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-api-key' }),
  currentUser: () => ({ name: 'Test User' }),
};

describe('CashService', () => {
  let service: CashService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.api.core;
  const orgId = 'org-123';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CashService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(CashService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('cashIn()', () => {
    it('debe hacer POST al endpoint de deposito correcto', () => {
      const body = { point_id: 'PP-001', amount: 500, description: 'Pago prueba' };
      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'TXN-001',
          status: 'COMPLETED',
          amount: 500,
          point_id: 'PP-001',
          created_at: '2026-01-01T12:00:00Z',
        },
      };

      service.cashIn(orgId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.transaction_id).toBe('TXN-001');
        expect(res.data.status).toBe('COMPLETED');
      });

      const req = httpMock.expectOne(`${baseUrl}/organizations/${orgId}/cash/deposit`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('debe enviar el monto y point_id correctamente en el body', () => {
      const body = { point_id: 'OXXO-234', amount: 1000 };

      service.cashIn(orgId, body).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/organizations/${orgId}/cash/deposit`);
      expect(req.request.body.point_id).toBe('OXXO-234');
      expect(req.request.body.amount).toBe(1000);
      req.flush({ success: true, data: {} });
    });
  });

  describe('requestCashOut()', () => {
    it('debe hacer POST al endpoint de solicitud de retiro correcto', () => {
      const body = { amount: 200, point_id: 'PP-002' };
      const mockResponse = {
        success: true,
        data: {
          withdrawal_id: 'WD-001',
          authorization_code: 'ABC123',
          amount: 200,
          status: 'PENDING',
          expires_at: '2026-01-01T12:30:00Z',
        },
      };

      service.requestCashOut(orgId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.authorization_code).toBe('ABC123');
        expect(res.data.withdrawal_id).toBe('WD-001');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/cash/withdrawal/request`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('debe incluir expires_at en la respuesta', () => {
      const body = { amount: 300, point_id: 'PP-003' };

      service.requestCashOut(orgId, body).subscribe((res) => {
        expect(res.data.expires_at).toBeDefined();
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/cash/withdrawal/request`
      );
      req.flush({
        success: true,
        data: { authorization_code: 'XYZ789', expires_at: '2026-01-01T13:00:00Z', amount: 300, status: 'PENDING', withdrawal_id: 'WD-002' },
      });
    });
  });

  describe('confirmCashOut()', () => {
    it('debe hacer POST al endpoint de confirmacion correcto', () => {
      const body = { authorization_code: 'ABC123', point_id: 'PP-001' };
      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'TXN-CONFIRM-001',
          status: 'COMPLETED',
          amount: 200,
          completed_at: '2026-01-01T12:15:00Z',
        },
      };

      service.confirmCashOut(orgId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.status).toBe('COMPLETED');
        expect(res.data.transaction_id).toBe('TXN-CONFIRM-001');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/cash/withdrawal/confirm`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.authorization_code).toBe('ABC123');
      req.flush(mockResponse);
    });
  });

  describe('getHistory()', () => {
    it('debe hacer GET al endpoint de historial correcto', () => {
      const accountId = 'ACC-001';
      const mockResponse = {
        success: true,
        data: [
          {
            transaction_id: 'TXN-H-001',
            type: 'DEPOSIT' as const,
            amount: 500,
            status: 'COMPLETED',
            point_id: 'PP-001',
            created_at: '2026-01-01T10:00:00Z',
          },
        ],
        total: 1,
      };

      service.getHistory(orgId, accountId).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.length).toBe(1);
        expect(res.data[0].type).toBe('DEPOSIT');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/accounts/${accountId}/cash/history`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('debe retornar arreglo vacio cuando no hay historial', () => {
      const accountId = 'ACC-EMPTY';

      service.getHistory(orgId, accountId).subscribe((res) => {
        expect(res.data.length).toBe(0);
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/accounts/${accountId}/cash/history`
      );
      req.flush({ success: true, data: [], total: 0 });
    });
  });
});
