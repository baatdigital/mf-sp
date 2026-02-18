/**
 * BillpayDashboardComponent - Tests unitarios
 * EP-SP-026
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BillpayDashboardComponent } from './billpay-dashboard.component';
import { BillpayMonitorService, ReconciliationReport } from './billpay-monitor.service';
import { SharedStateService } from '@shared-state';

const mockReports: ReconciliationReport[] = [
  {
    report_id: 'rpt-001',
    org_id: 'org-001',
    period_from: '2025-01-01',
    period_to: '2025-01-31',
    status: 'COMPLETED',
    total_transactions: 1200,
    discrepancies_count: 3,
    created_at: '2025-02-01T10:00:00Z',
  },
  {
    report_id: 'rpt-002',
    org_id: 'org-002',
    period_from: '2025-01-01',
    period_to: '2025-01-31',
    status: 'PROCESSING',
    total_transactions: 850,
    discrepancies_count: 0,
    created_at: '2025-02-01T11:00:00Z',
  },
  {
    report_id: 'rpt-003',
    org_id: 'org-003',
    period_from: '2025-01-01',
    period_to: '2025-01-31',
    status: 'FAILED',
    total_transactions: 0,
    discrepancies_count: 0,
    created_at: '2025-02-01T12:00:00Z',
  },
];

const mockListResponse = { success: true, data: mockReports, total: 3 };
const mockReconcileResponse = { success: true, data: mockReports[0] };

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('BillpayDashboardComponent', () => {
  let fixture: ComponentFixture<BillpayDashboardComponent>;
  let component: BillpayDashboardComponent;
  let serviceSpy: jasmine.SpyObj<BillpayMonitorService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('BillpayMonitorService', [
      'getReconciliations',
      'runReconciliation',
    ]);
    serviceSpy.getReconciliations.and.returnValue(of(mockListResponse));
    serviceSpy.runReconciliation.and.returnValue(of(mockReconcileResponse));

    await TestBed.configureTestingModule({
      imports: [BillpayDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayMonitorService, useValue: serviceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillpayDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load reconciliation reports on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getReconciliations).toHaveBeenCalledTimes(1);
    expect(component.reports().length).toBe(3);
    expect(component.isLoading()).toBeFalse();
  });

  it('should compute metrics correctly from reports', () => {
    fixture.detectChanges();
    const m = component.metrics();
    // Total transactions: 1200 + 850 + 0
    expect(m.totalPayments).toBe(2050);
    // 1 COMPLETED out of 3 = 33.33%
    expect(m.successRate).toBeCloseTo(33.33, 1);
    // Discrepancies: 3 + 0 + 0
    expect(m.activeDiscrepancies).toBe(3);
  });

  it('should set error state when API fails', () => {
    serviceSpy.getReconciliations.and.returnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
  });

  it('should filter reports by status', () => {
    fixture.detectChanges();
    component.statusFilter = 'COMPLETED';
    component.applyFilter();
    expect(component.filteredReports().length).toBe(1);
    expect(component.filteredReports()[0].report_id).toBe('rpt-001');
  });

  it('should open and close reconciliation modal', () => {
    fixture.detectChanges();
    component.openReconciliationModal();
    expect(component.reconciliationModalOpen()).toBeTrue();

    component.closeReconciliationModal();
    expect(component.reconciliationModalOpen()).toBeFalse();
  });

  it('should not allow reconciliation when fields are empty', () => {
    fixture.detectChanges();
    component.reconcileOrgId = '';
    component.periodFrom = '';
    component.periodTo = '';
    expect(component.canRunReconciliation()).toBeFalse();
  });

  it('should allow reconciliation when all fields are filled', () => {
    fixture.detectChanges();
    component.reconcileOrgId = 'org-001';
    component.periodFrom = '2025-01-01';
    component.periodTo = '2025-01-31';
    expect(component.canRunReconciliation()).toBeTrue();
  });

  it('should call runReconciliation and reload reports', () => {
    fixture.detectChanges();
    component.reconcileOrgId = 'org-001';
    component.periodFrom = '2025-01-01';
    component.periodTo = '2025-01-31';
    component.runReconciliation();
    expect(serviceSpy.runReconciliation).toHaveBeenCalledWith('org-001', {
      from: '2025-01-01',
      to: '2025-01-31',
    });
    // Reports reload after reconciliation
    expect(serviceSpy.getReconciliations).toHaveBeenCalledTimes(2);
  });

  it('should toggle auto-refresh state', () => {
    fixture.detectChanges();
    expect(component.autoRefreshEnabled()).toBeFalse();
    component.toggleAutoRefresh();
    expect(component.autoRefreshEnabled()).toBeTrue();
    component.toggleAutoRefresh();
    expect(component.autoRefreshEnabled()).toBeFalse();
  });
});
