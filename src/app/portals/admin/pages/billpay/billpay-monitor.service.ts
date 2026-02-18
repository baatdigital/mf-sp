/**
 * BillpayMonitorService - EP-SP-026
 *
 * Servicio para monitorear conciliaciones y pagos BillPay en la plataforma.
 * Solo accesible por usuarios con tier 'admin'.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

// --- Tipos para Conciliacion ---

export type ReconciliationStatus = 'COMPLETED' | 'PROCESSING' | 'FAILED';

export type DiscrepancyType = 'STATUS_MISMATCH' | 'AMOUNT_MISMATCH';

export interface ReconciliationReport {
  report_id: string;
  org_id: string;
  period_from: string;
  period_to: string;
  status: ReconciliationStatus;
  total_transactions: number;
  discrepancies_count: number;
  created_at: string;
}

export interface ReconciliationPeriod {
  from: string;
  to: string;
}

export interface ReconciliationsListResponse {
  success: boolean;
  data: ReconciliationReport[];
  total: number;
}

export interface ReconciliationDetailResponse {
  success: boolean;
  data: ReconciliationReport;
}

export interface Discrepancy {
  discrepancy_id: string;
  org_id: string;
  transaction_id: string;
  biller_name: string;
  amount: number;
  discrepancy_type: DiscrepancyType;
  local_status: string;
  provider_status: string;
  detected_at: string;
  resolved: boolean;
}

export interface BillpayPayment {
  payment_id: string;
  org_id: string;
  account_id: string;
  biller_name: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface BillpayHistoryResponse {
  success: boolean;
  data: BillpayPayment[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class BillpayMonitorService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene los reportes de conciliacion de una organizacion.
   * Si org_id es omitido, devuelve todas las organizaciones (vista global admin).
   */
  getReconciliations(org_id?: string): Observable<ReconciliationsListResponse> {
    const orgPath = org_id ?? 'all';
    return this.http.get<ReconciliationsListResponse>(
      `${this.apiUrl}/organizations/${orgPath}/billpay/reconcile`
    );
  }

  /**
   * Obtiene el detalle de un reporte de conciliacion especifico.
   */
  getReconciliationReport(
    org_id: string,
    report_id: string
  ): Observable<ReconciliationDetailResponse> {
    return this.http.get<ReconciliationDetailResponse>(
      `${this.apiUrl}/organizations/${org_id}/billpay/reconcile/${report_id}`
    );
  }

  /**
   * Obtiene el historial de pagos BillPay de una cuenta de una organizacion.
   */
  getBillpayHistory(org_id: string, account_id: string): Observable<BillpayHistoryResponse> {
    return this.http.get<BillpayHistoryResponse>(
      `${this.apiUrl}/organizations/${org_id}/billpay/history/${account_id}`
    );
  }

  /**
   * Ejecuta una nueva conciliacion para un periodo especifico.
   */
  runReconciliation(
    org_id: string,
    period: ReconciliationPeriod
  ): Observable<ReconciliationDetailResponse> {
    return this.http.post<ReconciliationDetailResponse>(
      `${this.apiUrl}/organizations/${org_id}/billpay/reconcile`,
      { period_from: period.from, period_to: period.to }
    );
  }

  /**
   * Resuelve una discrepancia con justificacion.
   * Endpoint PUT mock para gestion de discrepancias.
   */
  resolveDiscrepancy(
    discrepancy_id: string,
    justification: string
  ): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      `${this.apiUrl}/billpay/discrepancies/${discrepancy_id}/resolve`,
      { justification }
    );
  }
}
