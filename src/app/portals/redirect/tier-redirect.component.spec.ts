import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TierRedirectComponent } from './tier-redirect.component';
import { TierDetectionService } from '@core/services/tier-detection.service';
import { SharedStateService } from '@shared-state';

describe('TierRedirectComponent', () => {
  let tierServiceSpy: jasmine.SpyObj<TierDetectionService>;
  let sharedStateSpy: jasmine.SpyObj<SharedStateService>;
  let router: Router;

  beforeEach(() => {
    tierServiceSpy = jasmine.createSpyObj('TierDetectionService', ['detectTier']);
    sharedStateSpy = jasmine.createSpyObj('SharedStateService', ['rehydrate'], {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      currentOrganizationId: jasmine.createSpy().and.returnValue('org-1'),
      tenant: jasmine.createSpy().and.returnValue({ name: 'Test' }),
      currentUser: jasmine.createSpy().and.returnValue({ name: 'User' }),
    });

    TestBed.configureTestingModule({
      imports: [TierRedirectComponent],
      providers: [
        provideRouter([
          { path: 'sp/admin', component: TierRedirectComponent },
          { path: 'sp/business', component: TierRedirectComponent },
          { path: 'sp/personal', component: TierRedirectComponent },
        ]),
        { provide: TierDetectionService, useValue: tierServiceSpy },
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TierRedirectComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should redirect to admin portal for admin tier', () => {
    tierServiceSpy.detectTier.and.returnValue('admin');
    const fixture = TestBed.createComponent(TierRedirectComponent);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/sp/admin']);
  });

  it('should redirect to business portal for business tier', () => {
    tierServiceSpy.detectTier.and.returnValue('business');
    const fixture = TestBed.createComponent(TierRedirectComponent);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/sp/business']);
  });

  it('should redirect to personal portal for personal tier', () => {
    tierServiceSpy.detectTier.and.returnValue('personal');
    const fixture = TestBed.createComponent(TierRedirectComponent);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/sp/personal']);
  });

  it('should redirect to root for unknown tier', () => {
    tierServiceSpy.detectTier.and.returnValue('unknown');
    const fixture = TestBed.createComponent(TierRedirectComponent);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should call rehydrate before redirecting', () => {
    tierServiceSpy.detectTier.and.returnValue('admin');
    const fixture = TestBed.createComponent(TierRedirectComponent);
    fixture.detectChanges();
    expect(sharedStateSpy.rehydrate).toHaveBeenCalled();
  });
});
