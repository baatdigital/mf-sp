/**
 * AccountsAdapter - Adaptador HTTP para cuentas financieras
 *
 * Provee acceso al API de cuentas financieras del backend SuperPago.
 * Endpoint base: /api/v1/organizations/{orgId}/accounts
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';
import {
  FinancialAccount,
  AccountBalance,
  AccountsListResponse,
  AccountResponse,
} from '@domain/models/financial-account.model';
import { LedgerEntriesResponse } from '@domain/models/ledger-entry.model';

@Injectable({ providedIn: 'root' })
export class AccountsAdapter {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene todas las cuentas de una organizacion.
   */
  getAccounts(orgId: string): Observable<AccountsListResponse> {
    return this.http.get<AccountsListResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts`
    );
  }

  /**
   * Obtiene una cuenta especifica por ID.
   */
  getAccount(orgId: string, accountId: string): Observable<AccountResponse> {
    return this.http.get<AccountResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}`
    );
  }

  /**
   * Obtiene el saldo actual de una cuenta.
   */
  getBalance(orgId: string, accountId: string): Observable<{ success: boolean; data: AccountBalance }> {
    return this.http.get<{ success: boolean; data: AccountBalance }>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/balance`
    );
  }

  /**
   * Obtiene los movimientos (asientos) de una cuenta.
   */
  getLedgerEntries(
    orgId: string,
    accountId: string,
    page = 1,
    pageSize = 20
  ): Observable<LedgerEntriesResponse> {
    return this.http.get<LedgerEntriesResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/ledger`,
      {
        params: {
          page: String(page),
          page_size: String(pageSize),
        },
      }
    );
  }

  /**
   * Congela una cuenta (solo admin).
   */
  freezeAccount(orgId: string, accountId: string, reason: string): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/freeze`,
      { reason }
    );
  }

  /**
   * Descongela una cuenta (solo admin).
   */
  unfreezeAccount(orgId: string, accountId: string): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(
      `${this.apiUrl}/organizations/${orgId}/accounts/${accountId}/unfreeze`,
      {}
    );
  }
}
