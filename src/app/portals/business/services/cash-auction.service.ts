/**
 * CashAuctionService - Servicio para el marketplace de liquidez (Cash Auction)
 *
 * Gestiona ofertas de disponibilidad de efectivo entre organizaciones B2B.
 * Endpoint base: /api/v1/organizations/{orgId}/cash/offers y /api/v1/cash/offers
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

export interface CashOffer {
  offer_id: string;
  posting_org_id: string;
  point_id: string;
  available_amount: number;
  max_amount: number;
  min_amount: number;
  commission_rate: number;
  status: 'OPEN' | 'RESERVED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
  location?: string;
}

export interface PostOfferRequest {
  point_id: string;
  available_amount: number;
  max_amount: number;
  min_amount: number;
  commission_rate: number;
  expires_in_hours: number;
}

export interface PostOfferResponse {
  success: boolean;
  data: {
    offer_id: string;
    status: 'OPEN';
    point_id: string;
    available_amount: number;
    commission_rate: number;
    expires_at: string;
    created_at: string;
  };
}

export interface ReserveOfferRequest {
  amount: number;
  requesting_org_id?: string;
}

export interface ReserveOfferResponse {
  success: boolean;
  data: {
    reservation_id: string;
    authorization_code: string;
    amount: number;
    offer_id: string;
    status: 'RESERVED';
    expires_at: string;
  };
}

export interface ConfirmReservationRequest {
  authorization_code: string;
}

export interface ConfirmReservationResponse {
  success: boolean;
  data: {
    transaction_id: string;
    status: 'COMPLETED';
    amount: number;
    completed_at: string;
  };
}

export interface OffersListResponse {
  success: boolean;
  data: CashOffer[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CashAuctionService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Lista todas las ofertas de efectivo disponibles (status OPEN) en el marketplace.
   */
  listAvailableOffers(): Observable<OffersListResponse> {
    return this.http.get<OffersListResponse>(
      `${this.apiUrl}/cash/offers?status=OPEN`
    );
  }

  /**
   * Lista las ofertas publicadas por una organizacion especifica.
   */
  listMyOffers(orgId: string): Observable<OffersListResponse> {
    return this.http.get<OffersListResponse>(
      `${this.apiUrl}/organizations/${orgId}/cash/offers`
    );
  }

  /**
   * Publica una nueva oferta de disponibilidad de efectivo.
   */
  postOffer(orgId: string, body: PostOfferRequest): Observable<PostOfferResponse> {
    return this.http.post<PostOfferResponse>(
      `${this.apiUrl}/organizations/${orgId}/cash/offers`,
      body
    );
  }

  /**
   * Reserva una oferta de efectivo disponible.
   * Retorna authorization_code valido por 15 minutos.
   */
  reserveOffer(offerId: string, body: ReserveOfferRequest): Observable<ReserveOfferResponse> {
    return this.http.post<ReserveOfferResponse>(
      `${this.apiUrl}/cash/offers/${offerId}/reserve`,
      body
    );
  }

  /**
   * Confirma la reserva con el codigo de autorizacion.
   */
  confirmReservation(offerId: string, body: ConfirmReservationRequest): Observable<ConfirmReservationResponse> {
    return this.http.post<ConfirmReservationResponse>(
      `${this.apiUrl}/cash/offers/${offerId}/confirm`,
      body
    );
  }

  /**
   * Cancela una oferta propia (solo puede hacerlo el org que la publico).
   */
  cancelOffer(orgId: string, offerId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/organizations/${orgId}/cash/offers/${offerId}/cancel`,
      {}
    );
  }
}
