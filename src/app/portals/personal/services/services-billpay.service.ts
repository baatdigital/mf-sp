/**
 * ServicesBillpayService - Facade para pagos de servicios (BillPay) B2C
 *
 * Centraliza las operaciones de pago de servicios publicos para el portal personal.
 * Los servicios guardados se persisten en localStorage sin necesidad de API.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';
import { SharedStateService } from '@shared-state';

export interface BillpayService {
  service_id: string;
  name: string;
  category: string;
  emoji: string;
  description?: string;
}

export interface BillpayServicesResponse {
  success: boolean;
  data: BillpayService[];
}

export interface BillQueryRequest {
  service_id: string;
  reference: string;
}

export interface BillQueryResponse {
  success: boolean;
  data: {
    service_id: string;
    reference: string;
    amount: number;
    description: string;
    due_date?: string;
    holder_name?: string;
  };
}

export interface BillPayRequest {
  service_id: string;
  reference: string;
  amount: number;
  account_id: string;
  idempotency_key: string;
}

export interface BillPayResponse {
  success: boolean;
  data: {
    transaction_id: string;
    folio: string;
    status: string;
    service_id: string;
    reference: string;
    amount: number;
    completed_at: string;
  };
  error?: string;
}

export interface BillPayHistoryResponse {
  success: boolean;
  data: BillPayHistoryItem[];
  total: number;
}

export interface BillPayHistoryItem {
  transaction_id: string;
  service_id: string;
  service_name: string;
  service_emoji: string;
  reference: string;
  amount: number;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  folio?: string;
  created_at: string;
}

export interface SavedService {
  service_id: string;
  name: string;
  emoji: string;
  reference: string;
  nickname: string;
  saved_at: string;
}

const SAVED_SERVICES_KEY = 'sp:saved_services';

@Injectable({ providedIn: 'root' })
export class ServicesBillpayService {
  private readonly http = inject(HttpService);
  private readonly sharedState = inject(SharedStateService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene el catalogo de servicios disponibles.
   */
  getServices(): Observable<BillpayServicesResponse> {
    return this.http.get<BillpayServicesResponse>(`${this.apiUrl}/billpay/services`);
  }

  /**
   * Consulta el monto de un recibo/servicio por referencia.
   */
  queryBill(service_id: string, reference: string): Observable<BillQueryResponse> {
    const orgId = this.sharedState.currentOrganizationId();
    return this.http.post<BillQueryResponse>(
      `${this.apiUrl}/organizations/${orgId}/billpay/query`,
      { service_id, reference }
    );
  }

  /**
   * Ejecuta el pago de un servicio.
   */
  payBill(data: BillPayRequest): Observable<BillPayResponse> {
    const orgId = this.sharedState.currentOrganizationId();
    return this.http.post<BillPayResponse>(
      `${this.apiUrl}/organizations/${orgId}/billpay/execute`,
      data
    );
  }

  /**
   * Obtiene el historial de pagos de servicios de la cuenta activa.
   */
  getHistory(): Observable<BillPayHistoryResponse> {
    const orgId = this.sharedState.currentOrganizationId();
    const accountId = this.getActiveAccountId();
    return this.http.get<BillPayHistoryResponse>(
      `${this.apiUrl}/organizations/${orgId}/billpay/history/${accountId}`
    );
  }

  /**
   * Obtiene los servicios guardados desde localStorage.
   */
  getSavedServices(): SavedService[] {
    try {
      const raw = localStorage.getItem(SAVED_SERVICES_KEY);
      return raw ? (JSON.parse(raw) as SavedService[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Persiste un servicio en localStorage para acceso rapido.
   */
  saveService(service: SavedService): void {
    const current = this.getSavedServices();
    const exists = current.findIndex((s) => s.service_id === service.service_id && s.reference === service.reference);
    if (exists >= 0) {
      current[exists] = service;
    } else {
      current.push(service);
    }
    localStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(current));
  }

  /**
   * Elimina un servicio guardado de localStorage.
   */
  removeSavedService(serviceId: string, reference: string): void {
    const current = this.getSavedServices().filter(
      (s) => !(s.service_id === serviceId && s.reference === reference)
    );
    localStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(current));
  }

  /**
   * Obtiene el account_id activo del estado compartido.
   * Usa un fallback cuando no hay cuentas cargadas aun.
   */
  getActiveAccountId(): string {
    const user = this.sharedState.currentUser?.();
    return (user as { account_id?: string })?.account_id ?? '';
  }
}
