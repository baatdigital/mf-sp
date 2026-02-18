/**
 * GlobalTransfersComponent - Tests unitarios
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GlobalTransfersComponent } from './global-transfers.component';
import { AdminService, AdminTransfer } from '../../services/admin.service';
import { SharedStateService } from '@shared-state';

const mockTransfers: AdminTransfer[] = [
  {
    transfer_id: 'txn-001',
    type: 'SPEI',
    from_org: 'org-abc',
    to_org: 'org-xyz',
    amount: 5000,
    status: 'COMPLETED',
    created_at: '2024-06-01T10:00:00Z',
  },
  {
    transfer_id: 'txn-002',
    type: 'CASH',
    from_org: 'org-abc',
    to_org: 'org-def',
    amount: 1500,
    status: 'PENDING',
    created_at: '2024-06-01T11:00:00Z',
  },
];

const mockSummary = {
  pending_amount: 1500,
  processing_amount: 0,
  completed_amount: 5000,
  failed_amount: 0,
};

const mockResponse = {
  success: true,
  data: mockTransfers,
  total: 2,
  summary: mockSummary,
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('GlobalTransfersComponent', () => {
  let fixture: ComponentFixture<GlobalTransfersComponent>;
  let component: GlobalTransfersComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', ['getAllTransfers']);
    adminServiceSpy.getAllTransfers.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [GlobalTransfersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalTransfersComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load transfers on init', () => {
    fixture.detectChanges();
    expect(adminServiceSpy.getAllTransfers).toHaveBeenCalled();
    expect(component.transfers().length).toBe(2);
    expect(component.total()).toBe(2);
  });

  it('should populate summary cards after load', () => {
    fixture.detectChanges();
    expect(component.summary()?.pending_amount).toBe(1500);
    expect(component.summary()?.completed_amount).toBe(5000);
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should reset page and reload when filter changes', () => {
    fixture.detectChanges();
    component.currentPage.set(3);
    component.selectedType = 'SPEI';
    component.applyFilters();
    expect(component.currentPage()).toBe(1);
    expect(adminServiceSpy.getAllTransfers).toHaveBeenCalledTimes(2);
  });

  it('should show error message when API call fails', () => {
    adminServiceSpy.getAllTransfers.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should paginate when goToPage is called', () => {
    fixture.detectChanges();
    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
    expect(adminServiceSpy.getAllTransfers).toHaveBeenCalledTimes(2);
  });

  it('should render summary cards in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const summaryCards = compiled.querySelectorAll('.summary-card');
    expect(summaryCards.length).toBe(4);
  });
});
