/**
 * Tests: CashAuctionService
 *
 * Cubre operaciones del marketplace de liquidez (Cash Auction).
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CashAuctionService } from './cash-auction.service';
import { SharedStateService } from '@shared-state';
import { environment } from '@environment';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-biz-001',
  tenant: () => ({ id: 'superpago', apiKey: 'test-api-key' }),
  currentUser: () => ({ name: 'Biz User' }),
};

describe('CashAuctionService', () => {
  let service: CashAuctionService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.api.core;
  const orgId = 'org-biz-001';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CashAuctionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    service = TestBed.inject(CashAuctionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('listAvailableOffers()', () => {
    it('debe hacer GET al endpoint con filtro status=OPEN', () => {
      const mockOffers = {
        success: true,
        data: [
          {
            offer_id: 'OFF-001',
            posting_org_id: 'org-other',
            point_id: 'PP-001',
            available_amount: 5000,
            max_amount: 2000,
            min_amount: 100,
            commission_rate: 0.5,
            status: 'OPEN' as const,
            expires_at: '2026-02-18T00:00:00Z',
            created_at: '2026-02-17T00:00:00Z',
          },
        ],
        total: 1,
      };

      service.listAvailableOffers().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.length).toBe(1);
        expect(res.data[0].offer_id).toBe('OFF-001');
        expect(res.data[0].status).toBe('OPEN');
      });

      const req = httpMock.expectOne(`${baseUrl}/cash/offers?status=OPEN`);
      expect(req.request.method).toBe('GET');
      req.flush(mockOffers);
    });
  });

  describe('listMyOffers()', () => {
    it('debe hacer GET al endpoint de mis ofertas por org', () => {
      service.listMyOffers(orgId).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/cash/offers`
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], total: 0 });
    });
  });

  describe('postOffer()', () => {
    it('debe hacer POST con los datos de la oferta', () => {
      const body = {
        point_id: 'PP-001',
        available_amount: 10000,
        max_amount: 5000,
        min_amount: 100,
        commission_rate: 0.5,
        expires_in_hours: 24,
      };

      const mockResponse = {
        success: true,
        data: {
          offer_id: 'OFF-NEW-001',
          status: 'OPEN' as const,
          point_id: 'PP-001',
          available_amount: 10000,
          commission_rate: 0.5,
          expires_at: '2026-02-18T00:00:00Z',
          created_at: '2026-02-17T00:00:00Z',
        },
      };

      service.postOffer(orgId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.offer_id).toBe('OFF-NEW-001');
        expect(res.data.status).toBe('OPEN');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/cash/offers`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('reserveOffer()', () => {
    it('debe hacer POST al endpoint de reserva con amount', () => {
      const offerId = 'OFF-001';
      const body = { amount: 500 };

      const mockResponse = {
        success: true,
        data: {
          reservation_id: 'RES-001',
          authorization_code: 'CD5678',
          amount: 500,
          offer_id: offerId,
          status: 'RESERVED' as const,
          expires_at: '2026-02-17T00:15:00Z',
        },
      };

      service.reserveOffer(offerId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.authorization_code).toBe('CD5678');
        expect(res.data.reservation_id).toBe('RES-001');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/cash/offers/${offerId}/reserve`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.amount).toBe(500);
      req.flush(mockResponse);
    });
  });

  describe('confirmReservation()', () => {
    it('debe hacer POST con el authorization_code al endpoint de confirmacion', () => {
      const offerId = 'OFF-001';
      const body = { authorization_code: 'CD5678' };

      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'TXN-AUCTION-001',
          status: 'COMPLETED' as const,
          amount: 500,
          completed_at: '2026-02-17T00:10:00Z',
        },
      };

      service.confirmReservation(offerId, body).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data.transaction_id).toBe('TXN-AUCTION-001');
        expect(res.data.status).toBe('COMPLETED');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/cash/offers/${offerId}/confirm`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.authorization_code).toBe('CD5678');
      req.flush(mockResponse);
    });
  });

  describe('cancelOffer()', () => {
    it('debe hacer POST al endpoint de cancelacion', () => {
      const offerId = 'OFF-001';

      service.cancelOffer(orgId, offerId).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(
        `${baseUrl}/organizations/${orgId}/cash/offers/${offerId}/cancel`
      );
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });
  });
});
