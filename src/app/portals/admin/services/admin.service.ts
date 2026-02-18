/**
 * AdminService - Servicio del portal administrativo SuperPago
 *
 * Provee acceso a las APIs de administracion de la plataforma.
 * Solo accesible por usuarios con tier 'admin' (sp:admin o platform_admin).
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

export interface AdminOrganization {
  org_id: string;
  name: string;
  tier: 'ADMIN' | 'B2B' | 'B2C';
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  accounts_count: number;
  created_at: string;
}

export interface AdminOrganizationDetail extends AdminOrganization {
  contact_email?: string;
  tax_id?: string;
  updated_at?: string;
}

export interface OrganizationFilters {
  search?: string;
  tier?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface OrganizationsListResponse {
  success: boolean;
  data: AdminOrganization[];
  total: number;
  page: number;
  page_size: number;
}

export interface OrganizationDetailResponse {
  success: boolean;
  data: AdminOrganizationDetail;
}

export interface AdminTransfer {
  transfer_id: string;
  type: 'SPEI' | 'CASH' | 'INTER_ORG';
  from_org: string;
  to_org: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface TransferFilters {
  type?: string;
  status?: string;
  date_range?: 'today' | '7d' | '30d';
  page?: number;
  page_size?: number;
}

export interface AdminTransfersListResponse {
  success: boolean;
  data: AdminTransfer[];
  total: number;
  summary: {
    pending_amount: number;
    processing_amount: number;
    completed_amount: number;
    failed_amount: number;
  };
}

export interface SystemHealthStatus {
  monato_api: 'ONLINE' | 'OFFLINE';
  monato_last_check: string;
  error_rate_1h: number;
  queue_depths: Record<string, number>;
  alerts: SystemAlert[];
}

export interface SystemAlert {
  alert_id: string;
  type: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
}

export interface SystemHealthResponse {
  success: boolean;
  data: SystemHealthStatus;
}

export interface PlatformMetrics {
  total_organizations: number;
  total_active_accounts: number;
  transactions_today: {
    spei: number;
    cash: number;
    billpay: number;
    total: number;
  };
}

export interface PlatformMetricsResponse {
  success: boolean;
  data: PlatformMetrics;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene metricas globales de la plataforma para el dashboard.
   */
  getPlatformMetrics(): Observable<PlatformMetricsResponse> {
    return this.http.get<PlatformMetricsResponse>(
      `${this.apiUrl}/admin/metrics`
    );
  }

  /**
   * Obtiene la lista paginada de organizaciones con filtros opcionales.
   */
  getOrganizations(filters: OrganizationFilters = {}): Observable<OrganizationsListResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params['search'] = filters.search;
    if (filters.tier) params['tier'] = filters.tier;
    if (filters.status) params['status'] = filters.status;
    if (filters.page) params['page'] = String(filters.page);
    if (filters.page_size) params['page_size'] = String(filters.page_size);

    return this.http.get<OrganizationsListResponse>(
      `${this.apiUrl}/admin/organizations`,
      { params }
    );
  }

  /**
   * Obtiene el detalle de una organizacion especifica.
   */
  getOrganization(orgId: string): Observable<OrganizationDetailResponse> {
    return this.http.get<OrganizationDetailResponse>(
      `${this.apiUrl}/admin/organizations/${orgId}`
    );
  }

  /**
   * Congela una organizacion (deshabilita operaciones).
   */
  freezeOrganization(orgId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/admin/organizations/${orgId}/freeze`,
      {}
    );
  }

  /**
   * Descongela una organizacion previamente congelada.
   */
  unfreezeOrganization(orgId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/admin/organizations/${orgId}/unfreeze`,
      {}
    );
  }

  /**
   * Obtiene todas las transferencias de la plataforma con filtros.
   */
  getAllTransfers(filters: TransferFilters = {}): Observable<AdminTransfersListResponse> {
    const params: Record<string, string> = {};
    if (filters.type) params['type'] = filters.type;
    if (filters.status) params['status'] = filters.status;
    if (filters.date_range) params['date_range'] = filters.date_range;
    if (filters.page) params['page'] = String(filters.page);
    if (filters.page_size) params['page_size'] = String(filters.page_size);

    return this.http.get<AdminTransfersListResponse>(
      `${this.apiUrl}/admin/transfers`,
      { params }
    );
  }

  /**
   * Obtiene el estado de salud del sistema y sus servicios externos.
   */
  getSystemHealth(): Observable<SystemHealthResponse> {
    return this.http.get<SystemHealthResponse>(
      `${this.apiUrl}/admin/system/health`
    );
  }
}
