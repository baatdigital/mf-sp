/**
 * Tests: ServicesBillpayService
 *
 * Verifica las operaciones de pago de servicios (BillPay) B2C,
 * incluyendo consulta de catalogo, consulta de recibo, ejecucion de pago,
 * historial y gestion de servicios guardados en localStorage.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ServicesBillpayService, SavedService } from './services-billpay.service';
import { SharedStateService } from '@shared-state';
import { environment } from '@environment';

const mockSharedState = {
  currentOrganizationId: jasmine.createSpy('currentOrganizationId').and.returnValue('org-001'),
  currentUser: jasmine.createSpy('currentUser').and.returnValue({ account_id: 'acc-001', name: 'Test' }),
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('ServicesBillpayService', () => {
  let service: ServicesBillpayService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    mockSharedState.currentOrganizationId.and.returnValue('org-001');
    mockSharedState.currentUser.and.returnValue({ account_id: 'acc-001', name: 'Test' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ServicesBillpayService,
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(ServicesBillpayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // --- getServices ---

  describe('getServices', () => {
    it('debe llamar GET a /billpay/services', () => {
      const mockResponse = { success: true, data: [{ service_id: 's1', name: 'CFE', category: 'electricidad', emoji: '⚡' }] };
      service.getServices().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.length).toBe(1);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/billpay/services'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // --- queryBill ---

  describe('queryBill', () => {
    it('debe llamar POST a /organizations/{orgId}/billpay/query', () => {
      const mockResponse = {
        success: true,
        data: { service_id: 's1', reference: '123', amount: 500, description: 'Recibo CFE' },
      };

      service.queryBill('s1', '123').subscribe((res) => {
        expect(res.data.amount).toBe(500);
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/query')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ service_id: 's1', reference: '123' });
      req.flush(mockResponse);
    });
  });

  // --- payBill ---

  describe('payBill', () => {
    it('debe llamar POST a /organizations/{orgId}/billpay/execute', () => {
      const payload = {
        service_id: 's1',
        reference: '123',
        amount: 500,
        account_id: 'acc-001',
        idempotency_key: 'idem-001',
      };
      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'txn-001',
          folio: 'F-001',
          status: 'COMPLETED',
          service_id: 's1',
          reference: '123',
          amount: 500,
          completed_at: '2026-01-01T00:00:00Z',
        },
      };

      service.payBill(payload).subscribe((res) => {
        expect(res.data.transaction_id).toBe('txn-001');
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/execute')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  // --- getHistory ---

  describe('getHistory', () => {
    it('debe llamar GET a /organizations/{orgId}/billpay/history/{accountId}', () => {
      const mockResponse = { success: true, data: [], total: 0 };

      service.getHistory().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/history/acc-001')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // --- getSavedServices ---

  describe('getSavedServices', () => {
    it('debe retornar array vacio cuando no hay servicios guardados', () => {
      const result = service.getSavedServices();
      expect(result).toEqual([]);
    });

    it('debe retornar servicios guardados desde localStorage', () => {
      const saved: SavedService[] = [
        { service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Mi CFE', saved_at: '2026-01-01' },
      ];
      localStorage.setItem('sp:saved_services', JSON.stringify(saved));

      const result = service.getSavedServices();
      expect(result.length).toBe(1);
      expect(result[0].service_id).toBe('s1');
    });

    it('debe retornar array vacio si localStorage tiene JSON invalido', () => {
      localStorage.setItem('sp:saved_services', 'invalid-json');
      const result = service.getSavedServices();
      expect(result).toEqual([]);
    });
  });

  // --- saveService ---

  describe('saveService', () => {
    it('debe agregar un servicio nuevo a localStorage', () => {
      const svc: SavedService = {
        service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Mi CFE', saved_at: '2026-01-01',
      };

      service.saveService(svc);

      const stored = JSON.parse(localStorage.getItem('sp:saved_services')!);
      expect(stored.length).toBe(1);
      expect(stored[0].service_id).toBe('s1');
    });

    it('debe actualizar un servicio existente con mismo service_id y reference', () => {
      const svc1: SavedService = {
        service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Original', saved_at: '2026-01-01',
      };
      const svc2: SavedService = {
        service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Updated', saved_at: '2026-01-02',
      };

      service.saveService(svc1);
      service.saveService(svc2);

      const stored = JSON.parse(localStorage.getItem('sp:saved_services')!);
      expect(stored.length).toBe(1);
      expect(stored[0].nickname).toBe('Updated');
    });

    it('debe agregar servicio con diferente reference como nuevo', () => {
      const svc1: SavedService = {
        service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'CFE 1', saved_at: '2026-01-01',
      };
      const svc2: SavedService = {
        service_id: 's1', name: 'CFE', emoji: '⚡', reference: '456', nickname: 'CFE 2', saved_at: '2026-01-02',
      };

      service.saveService(svc1);
      service.saveService(svc2);

      const stored = JSON.parse(localStorage.getItem('sp:saved_services')!);
      expect(stored.length).toBe(2);
    });
  });

  // --- removeSavedService ---

  describe('removeSavedService', () => {
    it('debe eliminar un servicio guardado por service_id y reference', () => {
      const saved: SavedService[] = [
        { service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Mi CFE', saved_at: '2026-01-01' },
        { service_id: 's2', name: 'Telmex', emoji: '📞', reference: '456', nickname: 'Mi Tel', saved_at: '2026-01-01' },
      ];
      localStorage.setItem('sp:saved_services', JSON.stringify(saved));

      service.removeSavedService('s1', '123');

      const stored = JSON.parse(localStorage.getItem('sp:saved_services')!);
      expect(stored.length).toBe(1);
      expect(stored[0].service_id).toBe('s2');
    });

    it('no debe eliminar nada si no coincide service_id y reference', () => {
      const saved: SavedService[] = [
        { service_id: 's1', name: 'CFE', emoji: '⚡', reference: '123', nickname: 'Mi CFE', saved_at: '2026-01-01' },
      ];
      localStorage.setItem('sp:saved_services', JSON.stringify(saved));

      service.removeSavedService('s1', '999');

      const stored = JSON.parse(localStorage.getItem('sp:saved_services')!);
      expect(stored.length).toBe(1);
    });
  });

  // --- getActiveAccountId ---

  describe('getActiveAccountId', () => {
    it('debe retornar el account_id del usuario actual', () => {
      const result = service.getActiveAccountId();
      expect(result).toBe('acc-001');
    });

    it('debe retornar string vacio si no hay account_id', () => {
      mockSharedState.currentUser.and.returnValue({ name: 'Test' });
      const result = service.getActiveAccountId();
      expect(result).toBe('');
    });

    it('debe retornar string vacio si currentUser retorna null', () => {
      mockSharedState.currentUser.and.returnValue(null);
      const result = service.getActiveAccountId();
      expect(result).toBe('');
    });
  });
});
