/**
 * Pruebas unitarias para TierDetectionService
 *
 * Valida la deteccion del tier basado en permisos y roles del usuario.
 */

import { TestBed } from '@angular/core/testing';
import { TierDetectionService, Tier } from './tier-detection.service';
import { SharedStateService } from '../../shared-state/shared-state.service';

describe('TierDetectionService', () => {
  let service: TierDetectionService;
  let sharedStateSpy: jasmine.SpyObj<SharedStateService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SharedStateService', ['rehydrate'], {
      permissions: jasmine.createSpy('permissions').and.returnValue([]),
      roles: jasmine.createSpy('roles').and.returnValue([]),
      isSuperAdmin: jasmine.createSpy('isSuperAdmin').and.returnValue(false),
    });

    TestBed.configureTestingModule({
      providers: [
        TierDetectionService,
        { provide: SharedStateService, useValue: spy },
      ],
    });

    service = TestBed.inject(TierDetectionService);
    sharedStateSpy = TestBed.inject(SharedStateService) as jasmine.SpyObj<SharedStateService>;
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('resolveTier', () => {
    it('debe retornar admin si tiene permiso sp:admin', () => {
      const tier = service.resolveTier(['sp:admin'], [], false);
      expect(tier).toBe('admin');
    });

    it('debe retornar admin si tiene rol platform_admin', () => {
      const tier = service.resolveTier([], ['platform_admin'], false);
      expect(tier).toBe('admin');
    });

    it('debe retornar admin si isSuperAdmin es true', () => {
      const tier = service.resolveTier([], [], true);
      expect(tier).toBe('admin');
    });

    it('debe retornar business si tiene permiso sp:business', () => {
      const tier = service.resolveTier(['sp:business'], [], false);
      expect(tier).toBe('business');
    });

    it('debe retornar business si tiene rol org_admin', () => {
      const tier = service.resolveTier([], ['org_admin'], false);
      expect(tier).toBe('business');
    });

    it('debe retornar personal si tiene permiso sp:personal', () => {
      const tier = service.resolveTier(['sp:personal'], [], false);
      expect(tier).toBe('personal');
    });

    it('debe retornar personal si tiene rol end_user', () => {
      const tier = service.resolveTier([], ['end_user'], false);
      expect(tier).toBe('personal');
    });

    it('debe retornar unknown si no tiene permisos ni roles SP', () => {
      const tier = service.resolveTier(['other:perm'], ['other_role'], false);
      expect(tier).toBe('unknown');
    });

    it('admin tiene prioridad sobre business cuando tiene ambos', () => {
      const tier = service.resolveTier(['sp:admin', 'sp:business'], [], false);
      expect(tier).toBe('admin');
    });

    it('business tiene prioridad sobre personal cuando tiene ambos', () => {
      const tier = service.resolveTier(['sp:business', 'sp:personal'], [], false);
      expect(tier).toBe('business');
    });
  });

  describe('detectTier', () => {
    it('debe actualizar el signal currentTier al detectar', () => {
      (sharedStateSpy.permissions as jasmine.Spy).and.returnValue(['sp:admin']);
      (sharedStateSpy.roles as jasmine.Spy).and.returnValue([]);
      (sharedStateSpy.isSuperAdmin as jasmine.Spy).and.returnValue(false);

      const result = service.detectTier();

      expect(result).toBe('admin');
      expect(service.currentTier()).toBe('admin');
    });

    it('debe retornar unknown si no hay permisos SP', () => {
      (sharedStateSpy.permissions as jasmine.Spy).and.returnValue([]);
      (sharedStateSpy.roles as jasmine.Spy).and.returnValue([]);
      (sharedStateSpy.isSuperAdmin as jasmine.Spy).and.returnValue(false);

      const result = service.detectTier();

      expect(result).toBe('unknown');
      expect(service.currentTier()).toBe('unknown');
    });

    it('computed isAdmin debe reflejar el tier detectado', () => {
      (sharedStateSpy.permissions as jasmine.Spy).and.returnValue(['sp:admin']);
      (sharedStateSpy.roles as jasmine.Spy).and.returnValue([]);
      (sharedStateSpy.isSuperAdmin as jasmine.Spy).and.returnValue(false);

      service.detectTier();

      expect(service.isAdmin()).toBeTrue();
      expect(service.isBusiness()).toBeFalse();
      expect(service.isPersonal()).toBeFalse();
    });

    it('computed isBusiness debe reflejar el tier detectado', () => {
      (sharedStateSpy.permissions as jasmine.Spy).and.returnValue(['sp:business']);
      (sharedStateSpy.roles as jasmine.Spy).and.returnValue([]);
      (sharedStateSpy.isSuperAdmin as jasmine.Spy).and.returnValue(false);

      service.detectTier();

      expect(service.isAdmin()).toBeFalse();
      expect(service.isBusiness()).toBeTrue();
      expect(service.isPersonal()).toBeFalse();
    });
  });
});
