/**
 * Shared State Service (Cliente - Solo Lectura)
 *
 * Lee el estado compartido desde LocalStorage.
 * El Shell es el unico que escribe, los MFs solo leen.
 *
 * Claves: covacha:auth, covacha:user, covacha:tenant, covacha:current_organization
 */

// Polyfill para ngDevMode en Module Federation
if (typeof (globalThis as Record<string, unknown>)['ngDevMode'] === 'undefined') {
  (globalThis as Record<string, unknown>)['ngDevMode'] = false;
}

import { Injectable, signal, computed } from '@angular/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface UserState {
  id: string | null;
  user_id: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  permissions: string[];
  roles: string[];
  super_admin: boolean;
  organization_ids: string[];
  current_organization_id: string | null;
  project_ids: string[];
  current_project_id: string | null;
}

export interface TenantState {
  id: string | null;
  name: string | null;
  domain: string | null;
  logo: string | null;
  primaryColor: string | null;
  theme: 'light' | 'dark';
  apiBaseUrl: string | null;
  apiKey: string | null;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_AUTH: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

const DEFAULT_USER: UserState = {
  id: null,
  user_id: null,
  email: null,
  name: null,
  avatar: null,
  permissions: [],
  roles: [],
  super_admin: false,
  organization_ids: [],
  current_organization_id: null,
  project_ids: [],
  current_project_id: null,
};

const DEFAULT_TENANT: TenantState = {
  id: null,
  name: null,
  domain: null,
  logo: null,
  primaryColor: null,
  theme: 'light',
  apiBaseUrl: null,
  apiKey: null,
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({ providedIn: 'root' })
export class SharedStateService {
  // Signals internos
  private readonly _auth = signal<AuthState>(DEFAULT_AUTH);
  private readonly _user = signal<UserState>(DEFAULT_USER);
  private readonly _tenant = signal<TenantState>(DEFAULT_TENANT);

  // Signals publicos (solo lectura)
  readonly auth = this._auth.asReadonly();
  readonly user = this._user.asReadonly();
  readonly tenant = this._tenant.asReadonly();

  // Computed signals de conveniencia
  readonly isAuthenticated = computed(() => this._auth().isAuthenticated);
  readonly accessToken = computed(() => this._auth().accessToken);
  readonly currentUser = computed(() => this._user());
  readonly currentOrganizationId = computed(() => this._user().current_organization_id);
  readonly spOrganizationId = computed(() => this._user().current_organization_id);
  readonly permissions = computed(() => this._user().permissions);
  readonly roles = computed(() => this._user().roles);
  readonly isSuperAdmin = computed(() => this._user().super_admin);

  constructor() {
    this.rehydrate();
  }

  /**
   * Lee y sincroniza estado desde localStorage.
   * Llamar cuando se necesita refrescar despues de login.
   */
  rehydrate(): void {
    this._auth.set(this.readAuth());
    this._user.set(this.readUser());
    this._tenant.set(this.readTenant());
  }

  /**
   * Verifica si el usuario tiene un permiso especifico.
   */
  hasPermission(permission: string): boolean {
    const { permissions, super_admin } = this._user();
    if (super_admin) return true;
    return permissions.includes(permission);
  }

  /**
   * Emite un evento de error toast (compatible con Shell).
   * El Shell escucha el evento 'covacha:toast' en window.
   */
  emitToastError(message: string): void {
    window.dispatchEvent(
      new CustomEvent('covacha:toast', {
        detail: { type: 'error', message },
      })
    );
  }

  // ============================================================================
  // LECTURA PRIVADA DE LOCALSTORAGE
  // ============================================================================

  private readAuth(): AuthState {
    try {
      const raw = localStorage.getItem('covacha:auth');
      if (!raw) return DEFAULT_AUTH;
      const data = JSON.parse(raw) as Record<string, unknown>;
      const token = (data['access_token'] ?? data['accessToken'] ?? null) as string | null;
      const expiresAt = (data['expires_at'] ?? data['expiresAt'] ?? null) as number | null;

      // DJ-FS-07: verificar expiracion del token — un token vencido no es autenticado
      const now = Date.now();
      const isExpired = expiresAt !== null && expiresAt < now;

      return {
        isAuthenticated: !!token && !isExpired,
        accessToken: token,
        refreshToken: (data['refresh_token'] ?? data['refreshToken'] ?? null) as string | null,
        expiresAt,
      };
    } catch {
      return DEFAULT_AUTH;
    }
  }

  private readUser(): UserState {
    try {
      const raw = localStorage.getItem('covacha:user');
      if (!raw) return DEFAULT_USER;
      const data = JSON.parse(raw) as Record<string, unknown>;
      return {
        id: (data['id'] ?? null) as string | null,
        user_id: (data['user_id'] ?? null) as string | null,
        email: (data['email'] ?? null) as string | null,
        name: (data['name'] ?? null) as string | null,
        avatar: (data['avatar'] ?? null) as string | null,
        permissions: (data['permissions'] as string[]) ?? [],
        roles: (data['roles'] as string[]) ?? [],
        super_admin: (data['super_admin'] as boolean) ?? false,
        organization_ids: (data['organization_ids'] as string[]) ?? [],
        current_organization_id: (data['current_organization_id'] ?? null) as string | null,
        project_ids: (data['project_ids'] as string[]) ?? [],
        current_project_id: (data['current_project_id'] ?? null) as string | null,
      };
    } catch {
      return DEFAULT_USER;
    }
  }

  private readTenant(): TenantState {
    try {
      const raw = localStorage.getItem('covacha:tenant');
      if (!raw) return DEFAULT_TENANT;
      const data = JSON.parse(raw) as Record<string, unknown>;
      return {
        id: (data['id'] ?? null) as string | null,
        name: (data['name'] ?? null) as string | null,
        domain: (data['domain'] ?? null) as string | null,
        logo: (data['logo'] ?? null) as string | null,
        primaryColor: (data['primaryColor'] ?? null) as string | null,
        theme: ((data['theme'] as 'light' | 'dark') ?? 'light'),
        apiBaseUrl: (data['apiBaseUrl'] ?? null) as string | null,
        apiKey: (data['apiKey'] ?? null) as string | null,
      };
    } catch {
      return DEFAULT_TENANT;
    }
  }
}
