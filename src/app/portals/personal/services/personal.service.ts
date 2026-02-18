/**
 * PersonalService - Servicio para el portal personal B2C
 *
 * Centraliza las operaciones del usuario final: cuenta, movimientos, transferencias y perfil.
 * Actua como facade sobre los adapters de infraestructura.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { TransfersAdapter } from '@infrastructure/adapters/transfers.adapter';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';
import {
  AccountsListResponse,
  AccountResponse,
} from '@domain/models/financial-account.model';
import { LedgerEntriesResponse } from '@domain/models/ledger-entry.model';
import {
  CreateTransferRequest,
  TransferResponse,
} from '@domain/models/transfer.model';

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  clabe?: string;
  bank_name?: string;
  created_at: string;
}

export interface ProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

export interface LedgerFilters {
  entry_type?: 'CREDIT' | 'DEBIT';
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class PersonalService {
  private readonly accountsAdapter = inject(AccountsAdapter);
  private readonly transfersAdapter = inject(TransfersAdapter);
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene las cuentas de una organizacion.
   */
  getAccountInfo(orgId: string): Observable<AccountsListResponse> {
    return this.accountsAdapter.getAccounts(orgId);
  }

  /**
   * Obtiene detalle de una cuenta especifica.
   */
  getAccount(orgId: string, accountId: string): Observable<AccountResponse> {
    return this.accountsAdapter.getAccount(orgId, accountId);
  }

  /**
   * Obtiene movimientos del libro mayor con filtros opcionales.
   */
  getMovements(
    orgId: string,
    accountId: string,
    filters: LedgerFilters = {}
  ): Observable<LedgerEntriesResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.page_size ?? 20;
    return this.accountsAdapter.getLedgerEntries(orgId, accountId, page, pageSize);
  }

  /**
   * Envia una transferencia SPEI saliente.
   */
  sendSpei(orgId: string, body: CreateTransferRequest): Observable<TransferResponse> {
    return this.transfersAdapter.createTransfer(orgId, body);
  }

  /**
   * Obtiene el perfil del usuario autenticado.
   */
  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/users/me`);
  }

  /**
   * Actualiza datos del perfil del usuario autenticado.
   */
  updateProfile(body: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(`${this.apiUrl}/users/me`, body);
  }
}
