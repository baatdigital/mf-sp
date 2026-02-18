/**
 * BillpayService - Servicio para pago de servicios (CFE, Telmex, SAT, etc.)
 *
 * Encapsula las llamadas HTTP para consultar, pagar y administrar
 * servicios recurrentes del portal empresarial B2B.
 * Endpoint base: /api/v1/organizations/{orgId}/billpay y /api/v1/billpay
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

export interface BillpayService {
  service_id: string;
  name: string;
  category: BillpayCategory;
  icon: string;
  description: string;
}

export type BillpayCategory =
  | 'electricidad'
  | 'agua'
  | 'gas'
  | 'internet'
  | 'tv'
  | 'recargas'
  | 'gobierno';

export interface BillQueryResult {
  service_id: string;
  service_name: string;
  reference: string;
  amount_due: number;
  due_date: string;
  biller_name: string;
  period?: string;
}

export interface BillPayBody {
  service_id: string;
  reference: string;
  amount: number;
  account_id: string;
  idempotency_key: string;
}

export interface BillPayResult {
  transaction_id: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  service_name: string;
  reference: string;
  amount: number;
  completed_at: string;
  error_message?: string;
}

export interface BillpayHistoryItem {
  transaction_id: string;
  service_id: string;
  service_name: string;
  reference: string;
  amount: number;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  created_at: string;
  account_id: string;
}

export interface SavedBillpayService {
  saved_id: string;
  service_id: string;
  service_name: string;
  reference: string;
  nickname: string;
  last_amount?: number;
  last_paid_at?: string;
}

@Injectable({ providedIn: 'root' })
export class BillpayServiceApi {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene el catalogo completo de servicios disponibles para pagar.
   */
  getServices(): Observable<{ success: boolean; data: BillpayService[] }> {
    return this.http.get<{ success: boolean; data: BillpayService[] }>(
      `${this.apiUrl}/billpay/services`
    );
  }

  /**
   * Consulta el monto adeudado de un servicio dado un numero de referencia.
   */
  queryBill(
    orgId: string,
    serviceId: string,
    reference: string
  ): Observable<{ success: boolean; data: BillQueryResult }> {
    return this.http.post<{ success: boolean; data: BillQueryResult }>(
      `${this.apiUrl}/organizations/${orgId}/billpay/query`,
      { service_id: serviceId, reference }
    );
  }

  /**
   * Ejecuta el pago de un servicio con los datos confirmados.
   */
  payBill(
    orgId: string,
    data: BillPayBody
  ): Observable<{ success: boolean; data: BillPayResult }> {
    return this.http.post<{ success: boolean; data: BillPayResult }>(
      `${this.apiUrl}/organizations/${orgId}/billpay/execute`,
      data
    );
  }

  /**
   * Obtiene el historial de pagos de servicios de una cuenta.
   */
  getBillpayHistory(
    orgId: string,
    accountId: string
  ): Observable<{ success: boolean; data: BillpayHistoryItem[]; total: number }> {
    return this.http.get<{ success: boolean; data: BillpayHistoryItem[]; total: number }>(
      `${this.apiUrl}/organizations/${orgId}/billpay/history/${accountId}`
    );
  }

  /**
   * Obtiene los servicios guardados para pagos rapidos de una organizacion.
   */
  getSavedServices(
    orgId: string
  ): Observable<{ success: boolean; data: SavedBillpayService[] }> {
    return this.http.get<{ success: boolean; data: SavedBillpayService[] }>(
      `${this.apiUrl}/organizations/${orgId}/billpay/saved`
    );
  }

  /**
   * Guarda un servicio para pagos rapidos futuros.
   */
  saveService(
    orgId: string,
    data: Omit<SavedBillpayService, 'saved_id' | 'last_amount' | 'last_paid_at'>
  ): Observable<{ success: boolean; data: SavedBillpayService }> {
    return this.http.post<{ success: boolean; data: SavedBillpayService }>(
      `${this.apiUrl}/organizations/${orgId}/billpay/saved`,
      data
    );
  }

  /**
   * Elimina un servicio guardado.
   */
  deleteSavedService(
    orgId: string,
    savedId: string
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/organizations/${orgId}/billpay/saved/${savedId}`
    );
  }
}
