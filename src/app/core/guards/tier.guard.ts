/**
 * Tier Guard - MF SP
 *
 * Guards funcionales para proteger portales por nivel de acceso.
 * Usa el patron CanActivateFn de Angular 21.
 *
 * Cada portal requiere un tier especifico:
 * - /sp/admin    -> requiere tier 'admin'
 * - /sp/business -> requiere tier 'business'
 * - /sp/personal -> requiere tier 'personal'
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TierDetectionService, Tier } from '../services/tier-detection.service';
import { SharedStateService } from '@shared-state';

/**
 * Guard de autenticacion base.
 * Redirige a /auth si no hay sesion activa.
 */
export const authGuard: CanActivateFn = () => {
  const sharedState = inject(SharedStateService);

  if (!sharedState.isAuthenticated()) {
    window.location.href = '/auth';
    return false;
  }

  return true;
};

/**
 * Factory que crea un guard para el tier requerido.
 * Si el tier del usuario no coincide, redirige a /sp para re-deteccion.
 */
export function tierGuard(requiredTier: Tier): CanActivateFn {
  return () => {
    const tierService = inject(TierDetectionService);
    const router = inject(Router);
    const sharedState = inject(SharedStateService);

    // Verificar autenticacion primero
    if (!sharedState.isAuthenticated()) {
      window.location.href = '/auth';
      return false;
    }

    const userTier = tierService.detectTier();

    if (userTier === requiredTier) {
      return true;
    }

    // Si el tier no coincide, redirigir al selector de tier
    return router.parseUrl('/sp');
  };
}
