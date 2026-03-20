/**
 * Tests: OnboardingCatalogService
 *
 * Verifica las operaciones de gestion de onboardings y catalogo BillPay
 * para el portal administrativo.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OnboardingCatalogService } from './onboarding-catalog.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('OnboardingCatalogService', () => {
  let service: OnboardingCatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingCatalogService,
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(OnboardingCatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getOnboardings', () => {
    it('debe llamar GET a /onboarding sin filtros', () => {
      service.getOnboardings().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/onboarding') && !r.url.includes('/onboarding/'));
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });

    it('debe incluir filtro de status como parametro', () => {
      service.getOnboardings({ status: 'SUBMITTED' }).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/onboarding') && r.params.get('status') === 'SUBMITTED'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });

    it('debe funcionar con filtros vacios (sin status)', () => {
      service.getOnboardings({}).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/onboarding'));
      expect(req.request.params.keys().length).toBe(0);
      req.flush({ success: true, data: [], total: 0 });
    });
  });

  describe('getOnboarding', () => {
    it('debe llamar GET a /onboarding/:id', () => {
      const mockResponse = {
        success: true,
        data: {
          onboarding_id: 'ob-001',
          org_id: 'org-001',
          tier: 'B2B',
          status: 'SUBMITTED',
          current_step: 'EMPRESA_INFO',
          completed_steps: [],
          total_steps: 5,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      };

      service.getOnboarding('ob-001').subscribe((res) => {
        expect(res.data.onboarding_id).toBe('ob-001');
      });

      const req = httpMock.expectOne((r) => r.url.includes('/onboarding/ob-001'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('startOnboarding', () => {
    it('debe llamar POST a /onboarding', () => {
      const payload = { org_id: 'org-001', tier: 'B2B' };

      service.startOnboarding(payload).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) => r.url.endsWith('/onboarding'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true, data: { onboarding_id: 'ob-new' } });
    });
  });

  describe('submitStep', () => {
    it('debe llamar POST a /onboarding/:id/step', () => {
      const stepData = { company_name: 'Acme' };

      service.submitStep('ob-001', 'EMPRESA_INFO', stepData).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/onboarding/ob-001/step'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ step: 'EMPRESA_INFO', data: stepData });
      req.flush({ success: true, data: {} });
    });
  });

  describe('approveOnboarding', () => {
    it('debe llamar POST a /onboarding/:id/approve', () => {
      service.approveOnboarding('ob-001').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/onboarding/ob-001/approve'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });
    });
  });

  describe('rejectOnboarding', () => {
    it('debe llamar POST a /onboarding/:id/reject con razon', () => {
      service.rejectOnboarding('ob-001', 'Documentos incompletos').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/onboarding/ob-001/reject'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Documentos incompletos' });
      req.flush({ success: true });
    });
  });

  describe('getProductCatalog', () => {
    it('debe llamar GET a /billpay/services', () => {
      const mockResponse = {
        success: true,
        data: [
          { service_id: 's1', name: 'CFE', category: 'electricidad', description: 'Comision Federal', active: true },
        ],
      };

      service.getProductCatalog().subscribe((res) => {
        expect(res.data.length).toBe(1);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/billpay/services'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
