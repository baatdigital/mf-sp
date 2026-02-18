/**
 * NotificationDashboardComponent - Tests unitarios
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationDashboardComponent } from './notification-dashboard.component';
import { NotificationsConfigService, NotificationHistoryItem } from '../../../notifications/notifications-config.service';
import { SharedStateService } from '@shared-state';

const mockItems: NotificationHistoryItem[] = [
  {
    notification_id: 'n-001',
    org_id: 'org-001',
    type: 'SPEI',
    channel: 'email',
    status: 'SENT',
    timestamp: new Date().toISOString(),
  },
  {
    notification_id: 'n-002',
    org_id: 'org-002',
    type: 'BILLPAY',
    channel: 'push',
    status: 'FAILED',
    timestamp: new Date().toISOString(),
  },
  {
    notification_id: 'n-003',
    org_id: 'org-003',
    type: 'CASH',
    channel: 'webhook',
    status: 'PENDING',
    timestamp: new Date().toISOString(),
  },
];

const mockResponse = {
  success: true,
  data: mockItems,
  total: mockItems.length,
};

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

describe('NotificationDashboardComponent', () => {
  let fixture: ComponentFixture<NotificationDashboardComponent>;
  let component: NotificationDashboardComponent;
  let notifServiceSpy: jasmine.SpyObj<NotificationsConfigService>;

  beforeEach(async () => {
    notifServiceSpy = jasmine.createSpyObj('NotificationsConfigService', [
      'getNotificationHistory',
    ]);
    notifServiceSpy.getNotificationHistory.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [NotificationDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationsConfigService, useValue: notifServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationDashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Limpiar polling para evitar fugas de temporizadores en tests
    component['stopPolling']();
    component['destroy$'].next();
    component['destroy$'].complete();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load notification history on init', () => {
    fixture.detectChanges();
    expect(notifServiceSpy.getNotificationHistory).toHaveBeenCalledWith('org-001', 50);
    expect(component.notifications().length).toBe(3);
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should show error when API fails', () => {
    notifServiceSpy.getNotificationHistory.and.returnValue(
      throwError(() => new Error('error'))
    );
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should compute correct stats from loaded data', () => {
    fixture.detectChanges();
    expect(component.totalSentToday()).toBe(1);
    expect(component.failedCount()).toBe(1);
    expect(component.pendingCount()).toBe(1);
    expect(component.successRate()).toBe(33);
  });

  it('should filter notifications by type', () => {
    fixture.detectChanges();
    component.setFilter('SPEI');
    expect(component.filteredNotifications().length).toBe(1);
    expect(component.filteredNotifications()[0].type).toBe('SPEI');
  });

  it('should show all notifications when filter is ALL', () => {
    fixture.detectChanges();
    component.setFilter('ALL');
    expect(component.filteredNotifications().length).toBe(3);
  });

  it('should toggle live state when toggleLive is called', () => {
    fixture.detectChanges();
    expect(component.isLive()).toBeTrue();
    component.toggleLive();
    expect(component.isLive()).toBeFalse();
    component.toggleLive();
    expect(component.isLive()).toBeTrue();
  });

  it('channelLabel should return readable labels', () => {
    expect(component.channelLabel('email')).toBe('Email');
    expect(component.channelLabel('push')).toBe('Push');
    expect(component.channelLabel('webhook')).toBe('Webhook');
    expect(component.channelLabel('in_app')).toBe('In-App');
    expect(component.channelLabel('unknown')).toBe('unknown');
  });

  it('should render the filter tabs in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('.tab-btn');
    expect(tabs.length).toBe(5);
  });
});
