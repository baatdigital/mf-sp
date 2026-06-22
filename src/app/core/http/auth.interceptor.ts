/**
 * AuthInterceptor - Manejo centralizado de autenticación y errores HTTP
 *
 * Interceptor funcional (Angular 14+) que:
 * - Adjunta headers de auth (Authorization, X-SP-Organization-Id) si no están
 * - Maneja 401: limpiar sesión + redirect a auth
 * - Maneja 403: feedback de sin permisos
 * - Maneja timeout/0: feedback de sin conexión
 *
 * Se ejecuta para TODOS los requests, especialmente crítico para money-path (SPEI, billpay).
 */

import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, catchError } from 'rxjs';
import { SharedStateService } from '@shared-state';

/**
 * Interceptor funcional de autenticación y errores
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const sharedState = inject(SharedStateService);

  // Adjuntar headers si no están presentes
  let authReq = req;

  // Authorization Bearer token
  const token = sharedState.accessToken();
  if (token && token !== 'dev-token-for-testing' && !req.headers.has('Authorization')) {
    authReq = authReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  // X-SP-Organization-Id
  const orgId = sharedState.currentOrganizationId();
  if (orgId && !req.headers.has('X-SP-Organization-Id')) {
    authReq = authReq.clone({
      setHeaders: { 'X-SP-Organization-Id': orgId },
    });
  }

  // Manejo de errores centralizado
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized: limpiar sesión y redirigir a auth
        console.error('[AuthInterceptor] 401 Unauthorized - limpiando sesión y redirigiendo');
        sharedState.clearSession();
        window.location.href = '/auth';
      } else if (error.status === 403) {
        // Forbidden: feedback de sin permisos (no silenciar en money-path)
        console.error('[AuthInterceptor] 403 Forbidden - sin permisos');
        // El componente puede mostrar un toast/feedback si desea
      } else if (error.status === 0 || error.error?.name === 'TimeoutError') {
        // Timeout o sin conexión: feedback de conexión
        console.error('[AuthInterceptor] Timeout o sin conexión');
        // El componente puede mostrar un toast/feedback si desea
      }

      // Re-throw para que el componente también maneje si desea
      return throwError(() => error);
    })
  );
};
