/**
 * SystemHealthComponent - Tests unitarios
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SystemHealthComponent } from './system-health.component';
import { AdminService, SystemHealthStatus } from '../../services/admin.service';
import { SharedStateService } from '@shared-state';

const mockHealthData: SystemHealthStatus = {
  monato_api: 'ONLINE',
  monato_last_check: new Date().toISOString(),
  error_rate_1h: 0.3,
  queue_depths: {
    'spei-processor': 15,
    'notifications': 3,
    'webhooks': 0,
  },
  alerts: [
    {
      alert_id: 'alert-001',
      type: 'DATA_INTEGRITY',
      message: 'Balance discrepancy detected in org-abc',
      severity: 'MEDIUM',
      created_at: new Date().toISOString(),
    },
  ],
};

const mockResponse = {
  success: true,
  data: mockHealthData,
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('SystemHealthComponent', () => {
  let fixture: ComponentFixture<SystemHealthComponent>;
  let component: SystemHealthComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', ['getSystemHealth']);
    adminServiceSpy.getSystemHealth.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [SystemHealthComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemHealthComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load system health on init', () => {
    fixture.detectChanges();
    expect(adminServiceSpy.getSystemHealth).toHaveBeenCalled();
    expect(component.health()?.monato_api).toBe('ONLINE');
  });

  it('should populate queue entries from health data', () => {
    fixture.detectChanges();
    const queues = component.queueEntries();
    expect(queues.length).toBe(3);
    const speiQueue = queues.find((q) => q.name === 'spei-processor');
    expect(speiQueue?.depth).toBe(15);
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should show error when API fails', () => {
    adminServiceSpy.getSystemHealth.and.returnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should set lastUpdated after successful load', () => {
    fixture.detectChanges();
    expect(component.lastUpdated()).toBeInstanceOf(Date);
  });

  it('should toggle autoRefresh signal when toggleAutoRefresh is called', () => {
    fixture.detectChanges();
    expect(component.autoRefresh()).toBeFalse();
    component.toggleAutoRefresh();
    expect(component.autoRefresh()).toBeTrue();
  });

  it('should start polling when autoRefresh is enabled', fakeAsync(() => {
    fixture.detectChanges();
    component.toggleAutoRefresh();
    tick(30_000);
    // Initial call from loadHealth + startWith(0) + one tick
    expect(adminServiceSpy.getSystemHealth.calls.count()).toBeGreaterThanOrEqual(2);
    component['destroy$'].next();
    component['destroy$'].complete();
    tick();
  }));

  it('should render alerts section in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const alertsSection = compiled.querySelector('.alerts-list');
    expect(alertsSection).toBeTruthy();
  });
});
