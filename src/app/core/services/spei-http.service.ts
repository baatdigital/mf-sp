/**
 * SpeiHttpService
 *
 * Servicio HTTP centralizado para todas las llamadas al backend SP.
 * Agrega headers de autenticación automáticamente.
 * EP-SP-007: US-SP-028
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import type {
  SpAccount,
  SpAccountSummary,
} from '../../domain/models/sp-account.model';
import type {
  SpTransaction,
  SpTransactionFilter,
  SpTransactionPage,
} from '../../domain/models/sp-transaction.model';
import type { SpOrganization, SpBeneficiary, SpOrgUser } from '../../domain/models/sp-organization.model';

@Injectable({ providedIn: 'root' })
export class SpeiHttpService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // ─── Accounts ──────────────────────────────────────────────────────────────

  getAccounts(orgId: string): Observable<SpAccount[]> {
    return this.http.get<SpAccount[]>(`${this.baseUrl}/organizations/${orgId}/accounts`);
  }

  getAccountTree(orgId: string): Observable<SpAccount[]> {
    return this.http.get<SpAccount[]>(`${this.baseUrl}/organizations/${orgId}/accounts/tree`);
  }

  getAccount(orgId: string, accountId: string): Observable<SpAccount> {
    return this.http.get<SpAccount>(`${this.baseUrl}/organizations/${orgId}/accounts/${accountId}`);
  }

  createAccount(orgId: string, data: Partial<SpAccount>): Observable<SpAccount> {
    return this.http.post<SpAccount>(`${this.baseUrl}/organizations/${orgId}/accounts`, data);
  }

  getAccountSummary(orgId: string): Observable<SpAccountSummary> {
    return this.http.get<SpAccountSummary>(
      `${this.baseUrl}/organizations/${orgId}/accounts/summary`,
    );
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  getTransactions(orgId: string, filter?: SpTransactionFilter): Observable<SpTransactionPage> {
    let params = new HttpParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<SpTransactionPage>(`${this.baseUrl}/organizations/${orgId}/transactions`, {
      params,
    });
  }

  getTransaction(orgId: string, transactionId: string): Observable<SpTransaction> {
    return this.http.get<SpTransaction>(
      `${this.baseUrl}/organizations/${orgId}/transactions/${transactionId}`,
    );
  }

  createSpeiTransfer(
    orgId: string,
    data: {
      source_account_id: string;
      destination_clabe: string;
      destination_name?: string;
      amount: number;
      concept: string;
      reference?: string;
    },
  ): Observable<SpTransaction> {
    return this.http.post<SpTransaction>(
      `${this.baseUrl}/organizations/${orgId}/transfers/spei`,
      data,
    );
  }

  createInternalTransfer(
    orgId: string,
    data: {
      source_account_id: string;
      destination_account_id: string;
      amount: number;
      concept: string;
    },
  ): Observable<SpTransaction> {
    return this.http.post<SpTransaction>(
      `${this.baseUrl}/organizations/${orgId}/transfers/internal`,
      data,
    );
  }

  getCommissionPreview(
    orgId: string,
    params: { source_account_id: string; destination_clabe: string; amount: number },
  ): Observable<{ commission: number; iva: number; total: number; currency: string }> {
    return this.http.post<{ commission: number; iva: number; total: number; currency: string }>(
      `${this.baseUrl}/organizations/${orgId}/transfers/commission-preview`,
      params,
    );
  }

  // ─── Organizations (admin only) ───────────────────────────────────────────

  getOrganizations(): Observable<SpOrganization[]> {
    return this.http.get<SpOrganization[]>(`${this.baseUrl}/organizations`);
  }

  getOrganization(orgId: string): Observable<SpOrganization> {
    return this.http.get<SpOrganization>(`${this.baseUrl}/organizations/${orgId}`);
  }

  // ─── Beneficiaries ─────────────────────────────────────────────────────────

  getBeneficiaries(orgId: string): Observable<SpBeneficiary[]> {
    return this.http.get<SpBeneficiary[]>(`${this.baseUrl}/organizations/${orgId}/beneficiaries`);
  }

  createBeneficiary(orgId: string, data: Partial<SpBeneficiary>): Observable<SpBeneficiary> {
    return this.http.post<SpBeneficiary>(
      `${this.baseUrl}/organizations/${orgId}/beneficiaries`,
      data,
    );
  }

  deleteBeneficiary(orgId: string, beneficiaryId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/organizations/${orgId}/beneficiaries/${beneficiaryId}`,
    );
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  getOrgUsers(orgId: string): Observable<SpOrgUser[]> {
    return this.http.get<SpOrgUser[]>(`${this.baseUrl}/organizations/${orgId}/users`);
  }

  // ─── Approvals ─────────────────────────────────────────────────────────────

  getPendingApprovals(orgId: string): Observable<SpTransaction[]> {
    return this.http.get<SpTransaction[]>(
      `${this.baseUrl}/organizations/${orgId}/transfers/pending-approval`,
    );
  }

  approveTransfer(orgId: string, transferId: string): Observable<SpTransaction> {
    return this.http.post<SpTransaction>(
      `${this.baseUrl}/organizations/${orgId}/transfers/${transferId}/approve`,
      {},
    );
  }

  rejectTransfer(orgId: string, transferId: string, reason: string): Observable<SpTransaction> {
    return this.http.post<SpTransaction>(
      `${this.baseUrl}/organizations/${orgId}/transfers/${transferId}/reject`,
      { reason },
    );
  }
}
