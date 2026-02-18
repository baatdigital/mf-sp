import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

/**
 * Inicializa valores por defecto en localStorage para desarrollo standalone.
 * En produccion, el Shell provee estos valores via covacha:auth, covacha:user, etc.
 */
function initDevDefaults(): void {
  if (environment.production) return;

  const { spOrganizationId } = environment.defaults;

  if (spOrganizationId) {
    const devUser = {
      id: '91e9c8a7-be5f-4be8-bd74-5a8e7c9d1234',
      user_id: '91e9c8a7-be5f-4be8-bd74-5a8e7c9d1234',
      email: 'support@superpago.com.mx',
      name: 'Cesar Sulbaran',
      avatar: null,
      permissions: ['sp:admin'],
      roles: ['platform_admin'],
      super_admin: true,
      organization_ids: [spOrganizationId],
      current_organization_id: spOrganizationId,
      project_ids: [],
      current_project_id: null,
    };

    localStorage.setItem('covacha:user', JSON.stringify(devUser));
    console.log('[MF-SP] Dev: covacha:user set to:', devUser.email);
  }

  const existingAuth = localStorage.getItem('covacha:auth');
  if (!existingAuth) {
    const devAuth = {
      access_token: 'dev-token-for-testing',
      refresh_token: null,
      expires_at: null,
    };
    localStorage.setItem('covacha:auth', JSON.stringify(devAuth));
    console.log('[MF-SP] Dev: covacha:auth initialized');
  }

  const devTenant = {
    id: 'superpago',
    name: 'SuperPago',
    domain: 'localhost',
    logo: '/assets/logos/logo.svg',
    primaryColor: '#2563eb',
    theme: 'light',
    apiBaseUrl: environment.api.core,
    apiKey: environment.apiKey,
  };
  localStorage.setItem('covacha:tenant', JSON.stringify(devTenant));
  console.log('[MF-SP] Dev: covacha:tenant initialized');

  const currentUser = JSON.parse(localStorage.getItem('covacha:user') || '{}');
  console.log('[MF-SP] Current config:', {
    current_organization_id: currentUser.current_organization_id || '(not set)',
    api_core: environment.api.core,
  });
}

initDevDefaults();

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
