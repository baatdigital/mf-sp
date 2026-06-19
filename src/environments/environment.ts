/**
 * Environment - Development
 *
 * Configuracion para modo desarrollo standalone.
 */

export const environment = {
  production: false,

  // APIs de Backend (localhost para desarrollo)
  api: {
    // Covacha Core - Servicios principales (puerto 5001)
    core: 'http://127.0.0.1:5001/api/v1',
  },

  // Valores por defecto para desarrollo
  defaults: {
    spOrganizationId: '39c56b2b-cbec-4645-b4b3-7b618e5a8888',
  },

  // API Key para autenticacion con backend (se inyecta en runtime via covacha:tenant)
  apiKey: '',
};
