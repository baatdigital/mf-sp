/**
 * BusinessService - Servicio para el portal empresarial B2B
 *
 * Encapsula todas las llamadas HTTP necesarias para el Tier 2 (Business).
 * Delega en HttpService para autenticacion y headers estandar.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/http/http.service';
import { environment } from '@environment';

export interface MovementsFilters {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  entryType?: 'CREDIT' | 'DEBIT' | '';
  page?: number;
  pageSize?: number;
}

export interface SpeiTransferBody {
  source_account_id: string;
  destination_clabe: string;
  destination_name: string;
  destination_bank?: string;
  amount: number;
  concept: string;
  reference?: string;
}

export type ReportPeriod = 'this_month' | 'last_month' | 'last_3_months';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene todas las cuentas de una organizacion.
   */
  getAccounts(orgId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/organizations/${orgId}/accounts`
    );
  }

  /**
   * Obtiene el saldo de una cuenta especifica.
   */
  getBalance(orgId: string, accountId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/balance`
    );
  }

  /**
   * Obtiene los movimientos de una cuenta con filtros opcionales.
   */
  getMovements(orgId: string, accountId: string, filters: MovementsFilters = {}): Observable<any> {
    const params: Record<string, string> = {
      page: String(filters.page ?? 1),
      page_size: String(filters.pageSize ?? 20),
    };

    if (filters.dateFrom) {
      params['date_from'] = filters.dateFrom;
    }
    if (filters.dateTo) {
      params['date_to'] = filters.dateTo;
    }
    if (filters.entryType) {
      params['entry_type'] = filters.entryType;
    }

    return this.http.get<any>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/ledger`,
      { params }
    );
  }

  /**
   * Envia una transferencia SPEI.
   * @param extraHeaders Headers adicionales (ej. X-Idempotency-Key para prevencion de doble-pago)
   */
  sendSpei(
    orgId: string,
    body: SpeiTransferBody,
    extraHeaders?: Record<string, string>
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/organizations/${orgId}/spei/transfers`,
      body,
      extraHeaders ? { headers: extraHeaders } : undefined
    );
  }

  /**
   * Obtiene el resumen de reportes para un periodo dado.
   */
  getReports(orgId: string, period: ReportPeriod): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/organizations/${orgId}/reports/summary`,
      { params: { period } }
    );
  }
}
