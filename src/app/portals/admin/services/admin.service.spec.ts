/**
 * AdminService - Tests unitarios
 *
 * Verifica que el servicio construye las URLs correctas y delega
 * las peticiones HTTP al HttpService.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminService,
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPlatformMetrics should call /admin/metrics', () => {
    const mockResponse = {
      success: true,
      data: {
        total_organizations: 10,
        total_active_accounts: 50,
        transactions_today: { spei: 5, cash: 3, billpay: 2, total: 10 },
      },
    };

    service.getPlatformMetrics().subscribe((res) => {
      expect(res.data.total_organizations).toBe(10);
      expect(res.data.transactions_today.total).toBe(10);
    });

    const req = httpMock.expectOne((r) => r.url.includes('/admin/metrics'));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getOrganizations should call /admin/organizations with filters', () => {
    const mockResponse = {
      success: true,
      data: [],
      total: 0,
      page: 1,
      page_size: 20,
    };

    service.getOrganizations({ tier: 'B2B', page: 1, page_size: 20 }).subscribe((res) => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations') && r.params.get('tier') === 'B2B'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getOrganization should call /admin/organizations/:orgId', () => {
    const orgId = 'org-abc';
    const mockResponse = {
      success: true,
      data: { org_id: orgId, name: 'Test Org', tier: 'B2B', status: 'ACTIVE', accounts_count: 2, created_at: '2024-01-01' },
    };

    service.getOrganization(orgId).subscribe((res) => {
      expect(res.data.org_id).toBe(orgId);
    });

    const req = httpMock.expectOne((r) => r.url.includes(`/admin/organizations/${orgId}`));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('freezeOrganization should POST to /admin/organizations/:orgId/freeze', () => {
    const orgId = 'org-xyz';

    service.freezeOrganization(orgId).subscribe((res) => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne((r) => r.url.includes(`/admin/organizations/${orgId}/freeze`));
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
  });

  it('getAllTransfers should call /admin/transfers with filters', () => {
    const mockResponse = {
      success: true,
      data: [],
      total: 0,
      summary: { pending_amount: 0, processing_amount: 0, completed_amount: 0, failed_amount: 0 },
    };

    service.getAllTransfers({ type: 'SPEI', date_range: 'today' }).subscribe((res) => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/transfers') && r.params.get('type') === 'SPEI'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getSystemHealth should call /admin/system/health', () => {
    const mockResponse = {
      success: true,
      data: {
        monato_api: 'ONLINE',
        monato_last_check: new Date().toISOString(),
        error_rate_1h: 0.5,
        queue_depths: { 'spei-queue': 12 },
        alerts: [],
      },
    };

    service.getSystemHealth().subscribe((res) => {
      expect(res.data.monato_api).toBe('ONLINE');
    });

    const req = httpMock.expectOne((r) => r.url.includes('/admin/system/health'));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getOrganizations should work without any filters', () => {
    service.getOrganizations().subscribe((res) => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/admin/organizations'));
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ success: true, data: [], total: 0, page: 1, page_size: 20 });
  });

  it('getOrganizations should include search param', () => {
    service.getOrganizations({ search: 'test' }).subscribe();
    const req = httpMock.expectOne((r) => r.params.get('search') === 'test');
    req.flush({ success: true, data: [], total: 0, page: 1, page_size: 20 });
  });

  it('getOrganizations should include status param', () => {
    service.getOrganizations({ status: 'ACTIVE' }).subscribe();
    const req = httpMock.expectOne((r) => r.params.get('status') === 'ACTIVE');
    req.flush({ success: true, data: [], total: 0, page: 1, page_size: 20 });
  });

  it('getOrganizations should include page_size param', () => {
    service.getOrganizations({ page_size: 50 }).subscribe();
    const req = httpMock.expectOne((r) => r.params.get('page_size') === '50');
    req.flush({ success: true, data: [], total: 0, page: 1, page_size: 50 });
  });

  it('getAllTransfers should work without filters', () => {
    service.getAllTransfers().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/admin/transfers'));
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ success: true, data: [], total: 0, summary: { pending_amount: 0, processing_amount: 0, completed_amount: 0, failed_amount: 0 } });
  });

  it('getAllTransfers should include status param', () => {
    service.getAllTransfers({ status: 'PENDING' }).subscribe();
    const req = httpMock.expectOne((r) => r.params.get('status') === 'PENDING');
    req.flush({ success: true, data: [], total: 0, summary: { pending_amount: 0, processing_amount: 0, completed_amount: 0, failed_amount: 0 } });
  });

  it('getAllTransfers should include page and page_size params', () => {
    service.getAllTransfers({ page: 2, page_size: 10 }).subscribe();
    const req = httpMock.expectOne((r) => r.params.get('page') === '2' && r.params.get('page_size') === '10');
    req.flush({ success: true, data: [], total: 0, summary: { pending_amount: 0, processing_amount: 0, completed_amount: 0, failed_amount: 0 } });
  });

  it('unfreezeOrganization should POST to /admin/organizations/:orgId/unfreeze', () => {
    const orgId = 'org-frozen';

    service.unfreezeOrganization(orgId).subscribe((res) => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne((r) => r.url.includes(`/admin/organizations/${orgId}/unfreeze`));
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
  });
});
