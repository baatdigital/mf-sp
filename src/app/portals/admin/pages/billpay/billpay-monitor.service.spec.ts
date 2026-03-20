/**
 * Tests: BillpayMonitorService
 *
 * Verifica las operaciones de monitoreo de conciliaciones y pagos BillPay
 * para el portal administrativo.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BillpayMonitorService } from './billpay-monitor.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('BillpayMonitorService', () => {
  let service: BillpayMonitorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BillpayMonitorService,
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(BillpayMonitorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getReconciliations', () => {
    it('debe llamar GET con org_id especifico', () => {
      service.getReconciliations('org-001').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/reconcile')
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });

    it('debe usar "all" cuando no se proporciona org_id', () => {
      service.getReconciliations().subscribe();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/all/billpay/reconcile')
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });
  });

  describe('getReconciliationReport', () => {
    it('debe llamar GET a /organizations/:org/billpay/reconcile/:reportId', () => {
      service.getReconciliationReport('org-001', 'rpt-001').subscribe((res) => {
        expect(res.data.report_id).toBe('rpt-001');
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/reconcile/rpt-001')
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: {
          report_id: 'rpt-001',
          org_id: 'org-001',
          period_from: '2026-01-01',
          period_to: '2026-01-31',
          status: 'COMPLETED',
          total_transactions: 100,
          discrepancies_count: 2,
          created_at: '2026-02-01',
        },
      });
    });
  });

  describe('getBillpayHistory', () => {
    it('debe llamar GET a /organizations/:org/billpay/history/:accountId', () => {
      service.getBillpayHistory('org-001', 'acc-001').subscribe((res) => {
        expect(res.total).toBe(0);
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/history/acc-001')
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });
  });

  describe('runReconciliation', () => {
    it('debe llamar POST a /organizations/:org/billpay/reconcile', () => {
      const period = { from: '2026-01-01', to: '2026-01-31' };

      service.runReconciliation('org-001', period).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/organizations/org-001/billpay/reconcile')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ period_from: '2026-01-01', period_to: '2026-01-31' });
      req.flush({ success: true, data: { report_id: 'rpt-new' } });
    });
  });

  describe('resolveDiscrepancy', () => {
    it('debe llamar PUT a /billpay/discrepancies/:id/resolve', () => {
      service.resolveDiscrepancy('disc-001', 'Monto correcto confirmado').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes('/billpay/discrepancies/disc-001/resolve')
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ justification: 'Monto correcto confirmado' });
      req.flush({ success: true });
    });
  });
});
