/**
 * NotificationsConfigService - Servicio compartido de configuracion de notificaciones
 *
 * Provee acceso a las APIs de configuracion de notificaciones, webhooks e historial.
 * Usado por los tres portales: Admin (Tier 1), Business (Tier 2) y Personal (Tier 3).
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '@core/http/http.service';
import { environment } from '@environment';

// --- Interfaces ---

export interface NotificationConfig {
  org_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  preferences: NotificationPreferenceMap;
  updated_at?: string;
}

export interface NotificationPreferenceMap {
  [category: string]: NotificationCategoryPrefs;
}

export interface NotificationCategoryPrefs {
  email: boolean;
  push: boolean;
  in_app: boolean;
}

export type WebhookEventType =
  | 'SPEI_RECEIVED'
  | 'SPEI_SENT'
  | 'BILLPAY_PAID'
  | 'CASH_IN'
  | 'CASH_OUT';

export interface WebhookConfig {
  org_id: string;
  webhook_url: string;
  secret_token: string;
  event_types: WebhookEventType[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type NotificationChannel = 'email' | 'push' | 'webhook' | 'in_app';
export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING';
export type NotificationEventType = 'SPEI' | 'BILLPAY' | 'CASH' | 'WHATSAPP' | 'SYSTEM';

export interface NotificationHistoryItem {
  notification_id: string;
  org_id: string;
  type: NotificationEventType;
  channel: NotificationChannel;
  status: NotificationStatus;
  timestamp: string;
  message?: string;
  recipient?: string;
}

export interface NotificationHistoryResponse {
  success: boolean;
  data: NotificationHistoryItem[];
  total: number;
}

export interface NotificationConfigResponse {
  success: boolean;
  data: NotificationConfig;
}

export interface WebhookConfigResponse {
  success: boolean;
  data: WebhookConfig;
}

export interface UpdateNotificationConfigResponse {
  success: boolean;
  data: NotificationConfig;
}

export interface SaveWebhookConfigResponse {
  success: boolean;
  data: WebhookConfig;
}

@Injectable({ providedIn: 'root' })
export class NotificationsConfigService {
  private readonly http = inject(HttpService);
  private readonly apiUrl = environment.api.core;

  /**
   * Obtiene la configuracion de notificaciones para una organizacion.
   */
  getNotificationConfig(orgId: string): Observable<NotificationConfigResponse> {
    return this.http.get<NotificationConfigResponse>(
      `${this.apiUrl}/notifications/config/${orgId}`
    );
  }

  /**
   * Actualiza la configuracion de notificaciones de una organizacion.
   */
  updateNotificationConfig(
    orgId: string,
    data: Partial<NotificationConfig>
  ): Observable<UpdateNotificationConfigResponse> {
    return this.http.put<UpdateNotificationConfigResponse>(
      `${this.apiUrl}/notifications/config/${orgId}`,
      data
    );
  }

  /**
   * Obtiene la configuracion del webhook para una organizacion.
   */
  getWebhookConfig(orgId: string): Observable<WebhookConfigResponse> {
    return this.http.get<WebhookConfigResponse>(
      `${this.apiUrl}/notifications/webhooks/${orgId}`
    );
  }

  /**
   * Guarda (crea o actualiza) la configuracion del webhook de una organizacion.
   */
  saveWebhookConfig(
    orgId: string,
    config: Partial<WebhookConfig>
  ): Observable<SaveWebhookConfigResponse> {
    return this.http.post<SaveWebhookConfigResponse>(
      `${this.apiUrl}/notifications/webhooks/${orgId}`,
      config
    );
  }

  /**
   * Obtiene el historial de notificaciones enviadas para una organizacion.
   */
  getNotificationHistory(
    orgId: string,
    limit = 50
  ): Observable<NotificationHistoryResponse> {
    return this.http.get<NotificationHistoryResponse>(
      `${this.apiUrl}/notifications/history/${orgId}`,
      { params: { limit: String(limit) } }
    );
  }
}
