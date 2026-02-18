/**
 * HttpService - MF SP
 *
 * Servicio base para peticiones HTTP al backend.
 * Incluye headers de autenticacion requeridos por el ecosistema SuperPago.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment';
import { SharedStateService } from '@shared-state';

export interface HttpOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | string[]>;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly http = inject(HttpClient);
  private readonly sharedState = inject(SharedStateService);

  /**
   * Construye los headers con autenticacion y tenant info
   */
  private getHeaders(customHeaders?: HttpOptions['headers']): HttpHeaders {
    const token = this.sharedState.accessToken();
    const orgId = this.sharedState.currentOrganizationId();
    const tenantId = this.sharedState.tenant().id;
    const apiKey = this.sharedState.tenant().apiKey ?? environment.apiKey;

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    });

    if (token && token !== 'dev-token-for-testing') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (tenantId) {
      headers = headers.set('X-Tenant-Id', tenantId);
    }

    if (orgId) {
      headers = headers.set('X-SP-Organization-Id', orgId);
    }

    if (customHeaders) {
      if (customHeaders instanceof HttpHeaders) {
        customHeaders.keys().forEach((key) => {
          const value = customHeaders.get(key);
          if (value) headers = headers.set(key, value);
        });
      } else {
        Object.entries(customHeaders).forEach(([key, value]) => {
          headers = headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        });
      }
    }

    return headers;
  }

  get<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(url, {
      headers: this.getHeaders(options?.headers),
      params: options?.params,
    });
  }

  post<T>(url: string, body: unknown, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: this.getHeaders(options?.headers),
      params: options?.params,
    });
  }

  put<T>(url: string, body: unknown, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.getHeaders(options?.headers),
      params: options?.params,
    });
  }

  patch<T>(url: string, body: unknown, options?: HttpOptions): Observable<T> {
    return this.http.patch<T>(url, body, {
      headers: this.getHeaders(options?.headers),
      params: options?.params,
    });
  }

  delete<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(url, {
      headers: this.getHeaders(options?.headers),
      params: options?.params,
    });
  }
}
