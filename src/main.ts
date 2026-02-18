/**
 * Main Entry Point - MF SP (SuperPago SPEI)
 *
 * Inicializa Native Federation y arranca la aplicacion Angular.
 */

import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));
