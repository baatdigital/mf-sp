/**
 * OnboardingCatalogService - EP-SP-025
 *
 * Servicio para gestionar onboardings de organizaciones y el catalogo de servicios BillPay.
 * Solo accesible por usuarios con tier 'admin'.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

// --- Tipos para Onboarding ---

export type OnboardingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type OnboardingStep =
  | 'EMPRESA_INFO'
  | 'PRODUCTOS'
  | 'DOCUMENTOS'
  | 'LEGAL'
  | 'CONFORMIDAD';

export interface OnboardingRecord {
  onboarding_id: string;
  org_id: string;
  tier: string;
  status: OnboardingStatus;
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  total_steps: number;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingFilters {
  status?: string;
}

export interface OnboardingsListResponse {
  success: boolean;
  data: OnboardingRecord[];
  total: number;
}

export interface OnboardingDetailResponse {
  success: boolean;
  data: OnboardingRecord;
}

export interface StartOnboardingPayload {
  org_id: string;
  tier: string;
}

// --- Tipos para Catalogo BillPay ---

export type BillPayCategory =
  | 'electricidad'
  | 'agua'
  | 'gas'
  | 'internet'
  | 'tv'
  | 'recarga'
  | 'gobierno'
  | 'otros';

export interface BillPayService {
  service_id: string;
  name: string;
  category: BillPayCategory;
  description: string;
  active: boolean;
}

export interface ProductCatalogResponse {
  success: boolean;
  data: BillPayService[];
}

@Injectable({ providedIn: 'root' })
export class OnboardingCatalogService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene la lista de onboardings con filtro opcional por estado.
   */
  getOnboardings(filters?: OnboardingFilters): Observable<OnboardingsListResponse> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;

    return this.http.get<OnboardingsListResponse>(
      `${this.apiUrl}/onboarding`,
      { params }
    );
  }

  /**
   * Obtiene el detalle de un onboarding especifico por ID.
   */
  getOnboarding(id: string): Observable<OnboardingDetailResponse> {
    return this.http.get<OnboardingDetailResponse>(
      `${this.apiUrl}/onboarding/${id}`
    );
  }

  /**
   * Inicia un nuevo proceso de onboarding para una organizacion.
   */
  startOnboarding(data: StartOnboardingPayload): Observable<OnboardingDetailResponse> {
    return this.http.post<OnboardingDetailResponse>(
      `${this.apiUrl}/onboarding`,
      data
    );
  }

  /**
   * Envia datos de un paso especifico del onboarding.
   */
  submitStep(id: string, step: string, data: Record<string, unknown>): Observable<OnboardingDetailResponse> {
    return this.http.post<OnboardingDetailResponse>(
      `${this.apiUrl}/onboarding/${id}/step`,
      { step, data }
    );
  }

  /**
   * Aprueba un onboarding que esta en estado UNDER_REVIEW.
   */
  approveOnboarding(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/onboarding/${id}/approve`,
      {}
    );
  }

  /**
   * Rechaza un onboarding con una razon justificada.
   */
  rejectOnboarding(id: string, reason: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/onboarding/${id}/reject`,
      { reason }
    );
  }

  /**
   * Obtiene el catalogo de servicios BillPay disponibles.
   */
  getProductCatalog(): Observable<ProductCatalogResponse> {
    return this.http.get<ProductCatalogResponse>(
      `${this.apiUrl}/billpay/services`
    );
  }
}
