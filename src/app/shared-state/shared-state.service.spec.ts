/**
 * Tests: SharedStateService
 *
 * Verifica la lectura de estado compartido desde localStorage,
 * computed signals, permisos y emision de toasts.
 */

import { TestBed } from '@angular/core/testing';
import { SharedStateService } from './shared-state.service';

describe('SharedStateService', () => {
  let service: SharedStateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [SharedStateService],
    });
    service = TestBed.inject(SharedStateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // --- Defaults (sin datos en localStorage) ---

  describe('defaults sin localStorage', () => {
    it('debe tener isAuthenticated en false', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('debe tener accessToken en null', () => {
      expect(service.accessToken()).toBeNull();
    });

    it('debe tener currentUser con valores por defecto', () => {
      const user = service.currentUser();
      expect(user.id).toBeNull();
      expect(user.email).toBeNull();
      expect(user.permissions).toEqual([]);
      expect(user.roles).toEqual([]);
      expect(user.super_admin).toBeFalse();
    });

    it('debe tener currentOrganizationId en null', () => {
      expect(service.currentOrganizationId()).toBeNull();
    });

    it('debe tener spOrganizationId en null', () => {
      expect(service.spOrganizationId()).toBeNull();
    });

    it('debe tener permissions como array vacio', () => {
      expect(service.permissions()).toEqual([]);
    });

    it('debe tener roles como array vacio', () => {
      expect(service.roles()).toEqual([]);
    });

    it('debe tener isSuperAdmin en false', () => {
      expect(service.isSuperAdmin()).toBeFalse();
    });

    it('debe tener tenant con valores por defecto', () => {
      const tenant = service.tenant();
      expect(tenant.id).toBeNull();
      expect(tenant.theme).toBe('light');
    });
  });

  // --- rehydrate con datos validos ---

  describe('rehydrate con auth data', () => {
    it('debe leer access_token como accessToken', () => {
      localStorage.setItem('covacha:auth', JSON.stringify({
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
        expires_at: 9999999,
      }));

      service.rehydrate();

      expect(service.isAuthenticated()).toBeTrue();
      expect(service.accessToken()).toBe('token-abc');
      expect(service.auth().refreshToken).toBe('refresh-xyz');
      expect(service.auth().expiresAt).toBe(9999999);
    });

    it('debe leer accessToken (camelCase) como fallback', () => {
      localStorage.setItem('covacha:auth', JSON.stringify({
        accessToken: 'token-camel',
        refreshToken: 'refresh-camel',
        expiresAt: 1234567,
      }));

      service.rehydrate();

      expect(service.isAuthenticated()).toBeTrue();
      expect(service.accessToken()).toBe('token-camel');
    });

    it('no debe estar autenticado si no hay token', () => {
      localStorage.setItem('covacha:auth', JSON.stringify({}));
      service.rehydrate();
      expect(service.isAuthenticated()).toBeFalse();
    });

    // DJ-FS-07: verificacion de expiracion del token
    it('debe reportar isAuthenticated=false si el token ha expirado (DJ-FS-07)', () => {
      const pastTimestamp = Date.now() - 60_000; // hace 1 minuto
      localStorage.setItem('covacha:auth', JSON.stringify({
        access_token: 'expired-token',
        expires_at: pastTimestamp,
      }));
      service.rehydrate();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('debe reportar isAuthenticated=true si el token no ha expirado (DJ-FS-07)', () => {
      const futureTimestamp = Date.now() + 3_600_000; // en 1 hora
      localStorage.setItem('covacha:auth', JSON.stringify({
        access_token: 'valid-token',
        expires_at: futureTimestamp,
      }));
      service.rehydrate();
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('debe reportar isAuthenticated=true si expiresAt es null (sin fecha de expiracion) (DJ-FS-07)', () => {
      localStorage.setItem('covacha:auth', JSON.stringify({
        access_token: 'token-sin-expiry',
        expires_at: null,
      }));
      service.rehydrate();
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('debe preservar el accessToken aunque el token este expirado (para refresh) (DJ-FS-07)', () => {
      const pastTimestamp = Date.now() - 60_000;
      localStorage.setItem('covacha:auth', JSON.stringify({
        access_token: 'expired-token',
        expires_at: pastTimestamp,
      }));
      service.rehydrate();
      // isAuthenticated=false pero el token sigue disponible para que el refresh lo use
      expect(service.auth().accessToken).toBe('expired-token');
      expect(service.auth().expiresAt).toBe(pastTimestamp);
    });
  });

  describe('rehydrate con user data', () => {
    it('debe leer todos los campos del usuario', () => {
      localStorage.setItem('covacha:user', JSON.stringify({
        id: 'u-001',
        user_id: 'uid-001',
        email: 'test@test.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.png',
        permissions: ['read', 'write'],
        roles: ['admin'],
        super_admin: true,
        organization_ids: ['org-001', 'org-002'],
        current_organization_id: 'org-001',
        project_ids: ['prj-001'],
        current_project_id: 'prj-001',
      }));

      service.rehydrate();

      const user = service.currentUser();
      expect(user.id).toBe('u-001');
      expect(user.user_id).toBe('uid-001');
      expect(user.email).toBe('test@test.com');
      expect(user.name).toBe('Test User');
      expect(user.avatar).toBe('https://example.com/avatar.png');
      expect(service.permissions()).toEqual(['read', 'write']);
      expect(service.roles()).toEqual(['admin']);
      expect(service.isSuperAdmin()).toBeTrue();
      expect(service.currentOrganizationId()).toBe('org-001');
      expect(service.spOrganizationId()).toBe('org-001');
    });

    it('debe usar defaults para campos faltantes', () => {
      localStorage.setItem('covacha:user', JSON.stringify({ email: 'only@email.com' }));
      service.rehydrate();

      const user = service.currentUser();
      expect(user.email).toBe('only@email.com');
      expect(user.id).toBeNull();
      expect(user.permissions).toEqual([]);
      expect(user.super_admin).toBeFalse();
    });
  });

  describe('rehydrate con tenant data', () => {
    it('debe leer todos los campos del tenant', () => {
      localStorage.setItem('covacha:tenant', JSON.stringify({
        id: 'superpago',
        name: 'SuperPago',
        domain: 'superpago.com.mx',
        logo: 'https://example.com/logo.png',
        primaryColor: '#2563eb',
        theme: 'dark',
        apiBaseUrl: 'https://api.superpago.com.mx',
        apiKey: 'MASTER-key',
      }));

      service.rehydrate();

      const tenant = service.tenant();
      expect(tenant.id).toBe('superpago');
      expect(tenant.name).toBe('SuperPago');
      expect(tenant.domain).toBe('superpago.com.mx');
      expect(tenant.theme).toBe('dark');
      expect(tenant.apiKey).toBe('MASTER-key');
    });
  });

  // --- Error handling (JSON invalido) ---

  describe('error handling', () => {
    it('debe usar defaults para auth con JSON invalido', () => {
      localStorage.setItem('covacha:auth', 'not-json');
      service.rehydrate();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('debe usar defaults para user con JSON invalido', () => {
      localStorage.setItem('covacha:user', '{broken');
      service.rehydrate();
      expect(service.currentUser().id).toBeNull();
    });

    it('debe usar defaults para tenant con JSON invalido', () => {
      localStorage.setItem('covacha:tenant', '[invalid]');
      service.rehydrate();
      expect(service.tenant().id).toBeNull();
    });
  });

  // --- hasPermission ---

  describe('hasPermission', () => {
    it('debe retornar true si el usuario tiene el permiso', () => {
      localStorage.setItem('covacha:user', JSON.stringify({
        permissions: ['read', 'write', 'admin:manage'],
        super_admin: false,
      }));
      service.rehydrate();

      expect(service.hasPermission('read')).toBeTrue();
      expect(service.hasPermission('write')).toBeTrue();
      expect(service.hasPermission('admin:manage')).toBeTrue();
    });

    it('debe retornar false si el usuario no tiene el permiso', () => {
      localStorage.setItem('covacha:user', JSON.stringify({
        permissions: ['read'],
        super_admin: false,
      }));
      service.rehydrate();

      expect(service.hasPermission('write')).toBeFalse();
    });

    it('debe retornar true para cualquier permiso si es super_admin', () => {
      localStorage.setItem('covacha:user', JSON.stringify({
        permissions: [],
        super_admin: true,
      }));
      service.rehydrate();

      expect(service.hasPermission('anything')).toBeTrue();
      expect(service.hasPermission('super:secret')).toBeTrue();
    });
  });

  // --- emitToastError ---

  describe('emitToastError', () => {
    it('debe emitir evento covacha:toast con type error', (done) => {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        expect(detail.type).toBe('error');
        expect(detail.message).toBe('Algo salio mal');
        window.removeEventListener('covacha:toast', listener);
        done();
      };

      window.addEventListener('covacha:toast', listener);
      service.emitToastError('Algo salio mal');
    });
  });

  // --- auth, user, tenant signals ---

  describe('signals publicos', () => {
    it('auth debe ser readonly', () => {
      expect(service.auth()).toBeDefined();
      expect(service.auth().isAuthenticated).toBeFalse();
    });

    it('user debe ser readonly', () => {
      expect(service.user()).toBeDefined();
    });

    it('tenant debe ser readonly', () => {
      expect(service.tenant()).toBeDefined();
    });
  });
});
