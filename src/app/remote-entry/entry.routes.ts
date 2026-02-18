/**
 * Remote Entry Routes - MF SP
 *
 * Define las rutas del portal SuperPago cargadas por el Shell.
 *
 * Estructura multi-tier:
 * - /sp/admin    -> Portal Admin SuperPago (Tier 1)
 * - /sp/business -> Portal Empresarial B2B (Tier 2)
 * - /sp/personal -> Portal Personal B2C (Tier 3)
 * - /sp          -> Redireccion automatica segun tier detectado
 */

import { Routes } from '@angular/router';
import { authGuard, tierGuard } from '../core/guards/tier.guard';

export const REMOTE_ROUTES: Routes = [
  {
    path: 'sp',
    children: [
      // Tier 1: Admin SuperPago
      {
        path: 'admin',
        canActivate: [authGuard, tierGuard('admin')],
        loadChildren: () =>
          import('../portals/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },

      // Tier 2: Portal Empresarial B2B
      {
        path: 'business',
        canActivate: [authGuard, tierGuard('business')],
        loadChildren: () =>
          import('../portals/business/business.routes').then((m) => m.BUSINESS_ROUTES),
      },

      // Tier 3: Portal Personal B2C
      {
        path: 'personal',
        canActivate: [authGuard, tierGuard('personal')],
        loadChildren: () =>
          import('../portals/personal/personal.routes').then((m) => m.PERSONAL_ROUTES),
      },

      // Redireccion automatica segun tier
      {
        path: '',
        loadComponent: () =>
          import('../portals/redirect/tier-redirect.component').then(
            (m) => m.TierRedirectComponent
          ),
      },
    ],
  },
];

export default REMOTE_ROUTES;
