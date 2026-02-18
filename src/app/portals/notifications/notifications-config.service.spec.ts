/**
 * NotificationsConfigService - Tests unitarios
 *
 * Verifica que el servicio construye las URLs correctas y delega
 * las peticiones HTTP al HttpService.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NotificationsConfigService } from './notifications-config.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-001',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

const ORG_ID = 'org-001';

describe('NotificationsConfigService', () => {
  let service: NotificationsConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationsConfigService,
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(NotificationsConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getNotificationConfig should GET /notifications/config/:orgId', () => {
    const mockResponse = {
      success: true,
      data: {
        org_id: ORG_ID,
        email_enabled: true,
        push_enabled: false,
        in_app_enabled: true,
        preferences: {},
      },
    };

    service.getNotificationConfig(ORG_ID).subscribe((res) => {
      expect(res.data.org_id).toBe(ORG_ID);
      expect(res.data.email_enabled).toBeTrue();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes(`/notifications/config/${ORG_ID}`)
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('updateNotificationConfig should PUT /notifications/config/:orgId', () => {
    const mockResponse = {
      success: true,
      data: {
        org_id: ORG_ID,
        email_enabled: false,
        push_enabled: true,
        in_app_enabled: true,
        preferences: {},
      },
    };

    service
      .updateNotificationConfig(ORG_ID, { email_enabled: false })
      .subscribe((res) => {
        expect(res.success).toBeTrue();
      });

    const req = httpMock.expectOne((r) =>
      r.url.includes(`/notifications/config/${ORG_ID}`)
    );
    expect(req.request.method).toBe('PUT');
    req.flush(mockResponse);
  });

  it('getWebhookConfig should GET /notifications/webhooks/:orgId', () => {
    const mockResponse = {
      success: true,
      data: {
        org_id: ORG_ID,
        webhook_url: 'https://example.com/hook',
        secret_token: 'secret',
        event_types: ['SPEI_RECEIVED'],
        is_active: true,
      },
    };

    service.getWebhookConfig(ORG_ID).subscribe((res) => {
      expect(res.data.webhook_url).toBe('https://example.com/hook');
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes(`/notifications/webhooks/${ORG_ID}`)
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('saveWebhookConfig should POST /notifications/webhooks/:orgId', () => {
    const mockResponse = {
      success: true,
      data: {
        org_id: ORG_ID,
        webhook_url: 'https://example.com/hook',
        secret_token: 'secret',
        event_types: ['SPEI_RECEIVED', 'CASH_IN'],
        is_active: true,
      },
    };

    service
      .saveWebhookConfig(ORG_ID, {
        webhook_url: 'https://example.com/hook',
        secret_token: 'secret',
        event_types: ['SPEI_RECEIVED', 'CASH_IN'],
      })
      .subscribe((res) => {
        expect(res.data.event_types).toContain('SPEI_RECEIVED');
      });

    const req = httpMock.expectOne((r) =>
      r.url.includes(`/notifications/webhooks/${ORG_ID}`)
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('getNotificationHistory should GET /notifications/history/:orgId with limit param', () => {
    const mockResponse = {
      success: true,
      data: [],
      total: 0,
    };

    service.getNotificationHistory(ORG_ID, 25).subscribe((res) => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes(`/notifications/history/${ORG_ID}`) &&
      r.params.get('limit') === '25'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getNotificationHistory should use default limit of 50', () => {
    const mockResponse = { success: true, data: [], total: 0 };

    service.getNotificationHistory(ORG_ID).subscribe();

    const req = httpMock.expectOne((r) =>
      r.url.includes(`/notifications/history/${ORG_ID}`) &&
      r.params.get('limit') === '50'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
