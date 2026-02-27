/**
 * Tier Guard
 *
 * Protege rutas por tipo de portal (admin, business, personal).
 * Lee permisos del localStorage 'covacha:user'.
 * EP-SP-007: US-SP-027
 */
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export type TierType = 'admin' | 'business' | 'personal';

export function tierGuard(tier: TierType): CanActivateFn {
  return () => {
    const router = inject(Router);

    let permissions: string[] = [];
    try {
      const raw = localStorage.getItem('covacha:user');
      if (raw) {
        permissions = (JSON.parse(raw) as { permissions?: string[] }).permissions ?? [];
      }
    } catch {
      // localStorage no disponible o JSON invalido
    }

    const requiredPermission = `sp:${tier}`;

    if (permissions.includes(requiredPermission)) {
      return true;
    }

    // Redirigir al tier correspondiente o a la raiz
    if (permissions.includes('sp:admin')) {
      return router.createUrlTree(['/sp/admin/dashboard']);
    }
    if (permissions.includes('sp:business')) {
      return router.createUrlTree(['/sp/business/dashboard']);
    }
    if (permissions.includes('sp:personal')) {
      return router.createUrlTree(['/sp/personal/dashboard']);
    }

    return router.createUrlTree(['/']);
  };
}
