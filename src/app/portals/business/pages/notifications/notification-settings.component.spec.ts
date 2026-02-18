/**
 * NotificationSettingsComponent - Tests unitarios
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationSettingsComponent } from './notification-settings.component';
import { NotificationsConfigService } from '../../../notifications/notifications-config.service';
import { SharedStateService } from '@shared-state';

const mockWebhookConfig = {
  success: true,
  data: {
    org_id: 'org-001',
    webhook_url: 'https://mi-servidor.com/webhook',
    secret_token: 'super-secret',
    event_types: ['SPEI_RECEIVED', 'CASH_IN'] as any[],
    is_active: true,
  },
};

const mockNotifConfig = {
  success: true,
  data: {
    org_id: 'org-001',
    email_enabled: true,
    push_enabled: false,
    in_app_enabled: true,
    preferences: {},
  },
};

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('NotificationSettingsComponent', () => {
  let fixture: ComponentFixture<NotificationSettingsComponent>;
  let component: NotificationSettingsComponent;
  let notifServiceSpy: jasmine.SpyObj<NotificationsConfigService>;

  beforeEach(async () => {
    notifServiceSpy = jasmine.createSpyObj('NotificationsConfigService', [
      'getWebhookConfig',
      'getNotificationConfig',
      'saveWebhookConfig',
      'updateNotificationConfig',
    ]);
    notifServiceSpy.getWebhookConfig.and.returnValue(of(mockWebhookConfig));
    notifServiceSpy.getNotificationConfig.and.returnValue(of(mockNotifConfig));
    notifServiceSpy.saveWebhookConfig.and.returnValue(of(mockWebhookConfig));
    notifServiceSpy.updateNotificationConfig.and.returnValue(of(mockNotifConfig));

    await TestBed.configureTestingModule({
      imports: [NotificationSettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationsConfigService, useValue: notifServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationSettingsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component['destroy$'].next();
    component['destroy$'].complete();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load webhook config and channel config on init', () => {
    fixture.detectChanges();
    expect(notifServiceSpy.getWebhookConfig).toHaveBeenCalledWith('org-001');
    expect(notifServiceSpy.getNotificationConfig).toHaveBeenCalledWith('org-001');
    expect(component.webhookUrl).toBe('https://mi-servidor.com/webhook');
    expect(component.secretToken).toBe('super-secret');
  });

  it('should set isLoading to false after init', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should validate webhook URL must start with https://', () => {
    fixture.detectChanges();
    component.webhookUrl = 'http://insecure.com/hook';
    component.validateWebhookUrl();
    expect(component.webhookUrlError()).toBeTrue();

    component.webhookUrl = 'https://secure.com/hook';
    component.validateWebhookUrl();
    expect(component.webhookUrlError()).toBeFalse();
  });

  it('should toggle event type selection', () => {
    fixture.detectChanges();
    expect(component.isEventSelected('BILLPAY_PAID')).toBeFalse();
    component.toggleEvent('BILLPAY_PAID');
    expect(component.isEventSelected('BILLPAY_PAID')).toBeTrue();
    component.toggleEvent('BILLPAY_PAID');
    expect(component.isEventSelected('BILLPAY_PAID')).toBeFalse();
  });

  it('should call saveWebhookConfig on testAndSaveWebhook with valid URL', () => {
    fixture.detectChanges();
    component.webhookUrl = 'https://ok.com/hook';
    component.testAndSaveWebhook();
    expect(notifServiceSpy.saveWebhookConfig).toHaveBeenCalled();
  });

  it('should NOT call saveWebhookConfig when URL is invalid', () => {
    fixture.detectChanges();
    notifServiceSpy.saveWebhookConfig.calls.reset();
    component.webhookUrl = 'ftp://bad-url.com';
    component.testAndSaveWebhook();
    expect(notifServiceSpy.saveWebhookConfig).not.toHaveBeenCalled();
  });

  it('should set webhookSuccess after successful save', () => {
    fixture.detectChanges();
    component.webhookUrl = 'https://ok.com/hook';
    component.testAndSaveWebhook();
    expect(component.webhookSuccess()).toBeTrue();
  });

  it('should set webhookError when save fails', () => {
    notifServiceSpy.saveWebhookConfig.and.returnValue(
      throwError(() => new Error('error'))
    );
    fixture.detectChanges();
    component.webhookUrl = 'https://ok.com/hook';
    component.testAndSaveWebhook();
    expect(component.webhookError()).toBeTruthy();
  });

  it('should call updateNotificationConfig on saveChannels', () => {
    fixture.detectChanges();
    component.saveChannels();
    expect(notifServiceSpy.updateNotificationConfig).toHaveBeenCalledWith('org-001', {
      email_enabled:  component.emailEnabled,
      push_enabled:   component.pushEnabled,
      in_app_enabled: component.inAppEnabled,
    });
  });

  it('should set channelSuccess after successful channel save', () => {
    fixture.detectChanges();
    component.saveChannels();
    expect(component.channelSuccess()).toBeTrue();
  });
});
