/**
 * Pruebas unitarias para tier.guard.ts
 *
 * Valida que los guards protejan las rutas de cada tier correctamente.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { tierGuard, authGuard } from './tier.guard';
import { TierDetectionService } from '../services/tier-detection.service';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { CanActivateFn } from '@angular/router';

describe('authGuard', () => {
  let sharedStateSpy: jasmine.SpyObj<SharedStateService>;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    sharedStateSpy = jasmine.createSpyObj('SharedStateService', ['rehydrate'], {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    });
  });

  it('debe permitir acceso si el usuario esta autenticado', () => {
    (sharedStateSpy.isAuthenticated as jasmine.Spy).and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
  });

  it('debe bloquear acceso si el usuario no esta autenticado', () => {
    (sharedStateSpy.isAuthenticated as jasmine.Spy).and.returnValue(false);
    spyOn(window, 'location' as never);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
  });
});

describe('tierGuard', () => {
  let tierServiceSpy: jasmine.SpyObj<TierDetectionService>;
  let sharedStateSpy: jasmine.SpyObj<SharedStateService>;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    tierServiceSpy = jasmine.createSpyObj('TierDetectionService', ['detectTier']);
    sharedStateSpy = jasmine.createSpyObj('SharedStateService', ['rehydrate'], {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sp', component: {} as never }]),
        { provide: TierDetectionService, useValue: tierServiceSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('debe permitir acceso si el tier coincide (admin)', () => {
    tierServiceSpy.detectTier.and.returnValue('admin');
    const guard: CanActivateFn = tierGuard('admin');

    const result = TestBed.runInInjectionContext(() =>
      guard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
  });

  it('debe permitir acceso si el tier coincide (business)', () => {
    tierServiceSpy.detectTier.and.returnValue('business');
    const guard: CanActivateFn = tierGuard('business');

    const result = TestBed.runInInjectionContext(() =>
      guard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
  });

  it('debe permitir acceso si el tier coincide (personal)', () => {
    tierServiceSpy.detectTier.and.returnValue('personal');
    const guard: CanActivateFn = tierGuard('personal');

    const result = TestBed.runInInjectionContext(() =>
      guard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
  });

  it('debe redirigir a /sp si el tier no coincide', () => {
    tierServiceSpy.detectTier.and.returnValue('business');
    const guard: CanActivateFn = tierGuard('admin');

    const result = TestBed.runInInjectionContext(() =>
      guard(mockRoute, mockState)
    );

    // Debe retornar un UrlTree (no true ni false)
    expect(result).not.toBeTrue();
    expect(result).not.toBeFalse();
  });

  it('debe bloquear si el usuario no esta autenticado aunque el tier sea correcto', () => {
    (sharedStateSpy.isAuthenticated as jasmine.Spy).and.returnValue(false);
    tierServiceSpy.detectTier.and.returnValue('admin');
    const guard: CanActivateFn = tierGuard('admin');

    const result = TestBed.runInInjectionContext(() =>
      guard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
  });

  it('debe redirigir si el tier es unknown', () => {
    tierServiceSpy.detectTier.and.returnValue('unknown');
    const guard: CanActivateFn = tierGuard('admin');

    const result = TestBed.runInInjectionContext(() =>
      guard(mockRoute, mockState)
    );

    expect(result).not.toBeTrue();
  });
});
