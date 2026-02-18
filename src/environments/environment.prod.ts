/**
 * Environment - Production
 *
 * Configuracion para modo produccion (AWS).
 */

export const environment = {
  production: true,

  // APIs de Backend (AWS)
  api: {
    core: 'https://api.superpago.com.mx/api/v1',
  },

  // Sin valores por defecto en produccion
  defaults: {
    spOrganizationId: null as string | null,
  },

  // API Key para autenticacion con backend
  apiKey: 'MASTER-SuperSecretKey123456789',
};
