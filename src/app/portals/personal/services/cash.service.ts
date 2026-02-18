/**
 * CashService - Servicio para operaciones de efectivo (Cash-In / Cash-Out)
 *
 * Maneja depositos y retiros en puntos de pago para el portal Personal.
 * Endpoint base: /api/v1/organizations/{orgId}/cash
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

export interface CashDepositRequest {
  point_id: string;
  amount: number;
  description?: string;
}

export interface CashDepositResponse {
  success: boolean;
  data: {
    transaction_id: string;
    status: string;
    amount: number;
    point_id: string;
    created_at: string;
  };
}

export interface CashWithdrawalRequest {
  amount: number;
  point_id: string;
}

export interface CashWithdrawalRequestResponse {
  success: boolean;
  data: {
    withdrawal_id: string;
    authorization_code: string;
    amount: number;
    status: string;
    expires_at: string;
  };
}

export interface CashWithdrawalConfirmRequest {
  authorization_code: string;
  point_id: string;
}

export interface CashWithdrawalConfirmResponse {
  success: boolean;
  data: {
    transaction_id: string;
    status: string;
    amount: number;
    completed_at: string;
  };
}

export interface CashHistoryResponse {
  success: boolean;
  data: CashTransaction[];
  total: number;
}

export interface CashTransaction {
  transaction_id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: string;
  point_id: string;
  created_at: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CashService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Realiza un deposito de efectivo en un punto de pago.
   */
  cashIn(orgId: string, body: CashDepositRequest): Observable<CashDepositResponse> {
    return this.http.post<CashDepositResponse>(
      `${this.apiUrl}/organizations/${orgId}/cash/deposit`,
      body
    );
  }

  /**
   * Solicita una autorizacion de retiro de efectivo.
   * Retorna un authorization_code valido por 30 minutos.
   */
  requestCashOut(orgId: string, body: CashWithdrawalRequest): Observable<CashWithdrawalRequestResponse> {
    return this.http.post<CashWithdrawalRequestResponse>(
      `${this.apiUrl}/organizations/${orgId}/cash/withdrawal/request`,
      body
    );
  }

  /**
   * Confirma el retiro de efectivo con el codigo de autorizacion.
   */
  confirmCashOut(orgId: string, body: CashWithdrawalConfirmRequest): Observable<CashWithdrawalConfirmResponse> {
    return this.http.post<CashWithdrawalConfirmResponse>(
      `${this.apiUrl}/organizations/${orgId}/cash/withdrawal/confirm`,
      body
    );
  }

  /**
   * Obtiene el historial de transacciones de efectivo de una cuenta.
   */
  getHistory(orgId: string, accountId: string): Observable<CashHistoryResponse> {
    return this.http.get<CashHistoryResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/cash/history`
    );
  }
}
