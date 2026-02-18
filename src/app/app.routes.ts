/**
 * App Routes
 *
 * Rutas para desarrollo standalone.
 * En produccion, el Shell usa las rutas de remote-entry/entry.routes.ts
 */

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.REMOTE_ROUTES),
  },
];
