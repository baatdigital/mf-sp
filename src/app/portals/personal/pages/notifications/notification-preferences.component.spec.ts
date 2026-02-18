/**
 * NotificationPreferencesComponent - Tests unitarios
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationPreferencesComponent } from './notification-preferences.component';
import { NotificationsConfigService } from '../../../notifications/notifications-config.service';
import { SharedStateService } from '@shared-state';

const mockConfig = {
  success: true,
  data: {
    org_id: 'org-001',
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
    preferences: {
      transfers_received: { email: true,  push: false, in_app: true },
      transfers_sent:     { email: false, push: true,  in_app: true },
      bill_payments:      { email: true,  push: true,  in_app: false },
      cash_deposits:      { email: false, push: false, in_app: true },
      security_alerts:    { email: true,  push: true,  in_app: true },
    },
  },
};

const mockUpdateResponse = {
  success: true,
  data: {
    org_id: 'org-001',
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
    preferences: {},
  },
};

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('NotificationPreferencesComponent', () => {
  let fixture: ComponentFixture<NotificationPreferencesComponent>;
  let component: NotificationPreferencesComponent;
  let notifServiceSpy: jasmine.SpyObj<NotificationsConfigService>;

  beforeEach(async () => {
    notifServiceSpy = jasmine.createSpyObj('NotificationsConfigService', [
      'getNotificationConfig',
      'updateNotificationConfig',
    ]);
    notifServiceSpy.getNotificationConfig.and.returnValue(of(mockConfig));
    notifServiceSpy.updateNotificationConfig.and.returnValue(of(mockUpdateResponse));

    await TestBed.configureTestingModule({
      imports: [NotificationPreferencesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationsConfigService, useValue: notifServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPreferencesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if (component['toastTimer']) clearTimeout(component['toastTimer']);
    component['destroy$'].next();
    component['destroy$'].complete();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load preferences on init', () => {
    fixture.detectChanges();
    expect(notifServiceSpy.getNotificationConfig).toHaveBeenCalledWith('org-001');
    expect(component.isLoading()).toBeFalse();
  });

  it('should apply loaded preferences to category signals', () => {
    fixture.detectChanges();
    const cats = component.categories();
    const received = cats.find((c) => c.key === 'transfers_received');
    expect(received?.prefs.email).toBeTrue();
    expect(received?.prefs.push).toBeFalse();
    expect(received?.prefs.in_app).toBeTrue();
  });

  it('should toggle individual preference for a category', () => {
    fixture.detectChanges();
    const before = component.categories().find((c) => c.key === 'transfers_sent');
    expect(before?.prefs.email).toBeFalse();

    component.togglePref('transfers_sent', 'email');
    const after = component.categories().find((c) => c.key === 'transfers_sent');
    expect(after?.prefs.email).toBeTrue();
  });

  it('should show all 5 categories', () => {
    fixture.detectChanges();
    expect(component.categories().length).toBe(5);
  });

  it('should call updateNotificationConfig on savePreferences', () => {
    fixture.detectChanges();
    component.savePreferences();
    expect(notifServiceSpy.updateNotificationConfig).toHaveBeenCalledWith(
      'org-001',
      jasmine.objectContaining({ preferences: jasmine.any(Object) })
    );
  });

  it('should show toast after successful save', fakeAsync(() => {
    fixture.detectChanges();
    component.savePreferences();
    expect(component.showToast()).toBeTrue();
    tick(3000);
    expect(component.showToast()).toBeFalse();
  }));

  it('should set saveError when update fails', () => {
    notifServiceSpy.updateNotificationConfig.and.returnValue(
      throwError(() => new Error('error'))
    );
    fixture.detectChanges();
    component.savePreferences();
    expect(component.saveError()).toBeTruthy();
    expect(component.showToast()).toBeFalse();
  });

  it('should use defaults when API returns no preferences', () => {
    notifServiceSpy.getNotificationConfig.and.returnValue(
      of({
        success: true,
        data: {
          org_id: 'org-001',
          email_enabled: true,
          push_enabled: true,
          in_app_enabled: true,
          preferences: {},
        },
      })
    );
    fixture.detectChanges();
    const cats = component.categories();
    cats.forEach((cat) => {
      expect(cat.prefs.email).toBeTrue();
      expect(cat.prefs.push).toBeTrue();
      expect(cat.prefs.in_app).toBeTrue();
    });
  });
});
