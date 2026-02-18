/**
 * AdminDashboardComponent - Tests unitarios
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminService } from '../services/admin.service';
import { SharedStateService } from '@shared-state';

const mockPlatformMetrics = {
  success: true,
  data: {
    total_organizations: 25,
    total_active_accounts: 120,
    transactions_today: { spei: 30, cash: 10, billpay: 5, total: 45 },
  },
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentUser: () => ({ name: 'Admin User', id: 'u1' }),
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let component: AdminDashboardComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', ['getPlatformMetrics']);
    adminServiceSpy.getPlatformMetrics.and.returnValue(of(mockPlatformMetrics));

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name from shared state on init', () => {
    fixture.detectChanges();
    expect(component.userName()).toBe('Admin User');
  });

  it('should load platform metrics on init', () => {
    fixture.detectChanges();
    expect(adminServiceSpy.getPlatformMetrics).toHaveBeenCalled();
    expect(component.metrics()?.total_organizations).toBe(25);
    expect(component.metrics()?.total_active_accounts).toBe(120);
    expect(component.metrics()?.transactions_today.total).toBe(45);
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should render metric cards in the template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const metricCards = compiled.querySelectorAll('.metric-card');
    expect(metricCards.length).toBeGreaterThanOrEqual(4);
  });

  it('should show error message when API call fails', () => {
    adminServiceSpy.getPlatformMetrics.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should render quick action links', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const actionCards = compiled.querySelectorAll('.action-card');
    expect(actionCards.length).toBeGreaterThanOrEqual(3);
  });
});
