/**
 * TransfersAdapter - Adaptador HTTP para transferencias SPEI
 *
 * Provee acceso al API de transferencias del backend SuperPago.
 * Endpoint base: /api/v1/organizations/{orgId}/transfers
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';
import {
  SpeiTransfer,
  CreateTransferRequest,
  TransferResponse,
  TransfersListResponse,
} from '@domain/models/transfer.model';

@Injectable({ providedIn: 'root' })
export class TransfersAdapter {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Lista las transferencias de una organizacion.
   */
  getTransfers(orgId: string, page = 1, pageSize = 20): Observable<TransfersListResponse> {
    return this.http.get<TransfersListResponse>(
      `${this.apiUrl}/organizations/${orgId}/transfers`,
      {
        params: {
          page: String(page),
          page_size: String(pageSize),
        },
      }
    );
  }

  /**
   * Obtiene el detalle de una transferencia.
   */
  getTransfer(orgId: string, transferId: string): Observable<TransferResponse> {
    return this.http.get<TransferResponse>(
      `${this.apiUrl}/organizations/${orgId}/transfers/${transferId}`
    );
  }

  /**
   * Crea una nueva transferencia SPEI.
   */
  createTransfer(orgId: string, request: CreateTransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(
      `${this.apiUrl}/organizations/${orgId}/transfers`,
      request
    );
  }

  /**
   * Cancela una transferencia en estado PENDING.
   */
  cancelTransfer(orgId: string, transferId: string): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(
      `${this.apiUrl}/organizations/${orgId}/transfers/${transferId}/cancel`,
      {}
    );
  }

  /**
   * Obtiene el historial de transferencias de una cuenta especifica.
   */
  getAccountTransfers(
    orgId: string,
    accountId: string,
    page = 1
  ): Observable<TransfersListResponse> {
    return this.http.get<TransfersListResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/transfers`,
      { params: { page: String(page) } }
    );
  }
}
