/**
 * OnboardingListComponent - Tests unitarios
 * EP-SP-025
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OnboardingListComponent } from './onboarding-list.component';
import {
  OnboardingCatalogService,
  OnboardingRecord,
} from '../../services/onboarding-catalog.service';
import { SharedStateService } from '@shared-state';

const mockOnboardings: OnboardingRecord[] = [
  {
    onboarding_id: 'onb-001',
    org_id: 'org-abc-001',
    tier: 'B2B',
    status: 'UNDER_REVIEW',
    current_step: 'LEGAL',
    completed_steps: ['EMPRESA_INFO', 'PRODUCTOS', 'DOCUMENTOS'],
    total_steps: 5,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-12T10:00:00Z',
  },
  {
    onboarding_id: 'onb-002',
    org_id: 'org-xyz-002',
    tier: 'B2C',
    status: 'APPROVED',
    current_step: 'CONFORMIDAD',
    completed_steps: ['EMPRESA_INFO', 'PRODUCTOS', 'DOCUMENTOS', 'LEGAL', 'CONFORMIDAD'],
    total_steps: 5,
    approved_by: 'admin@superpago.com.mx',
    created_at: '2025-01-05T08:00:00Z',
    updated_at: '2025-01-08T08:00:00Z',
  },
];

const mockListResponse = {
  success: true,
  data: mockOnboardings,
  total: 2,
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('OnboardingListComponent', () => {
  let fixture: ComponentFixture<OnboardingListComponent>;
  let component: OnboardingListComponent;
  let serviceSpy: jasmine.SpyObj<OnboardingCatalogService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('OnboardingCatalogService', [
      'getOnboardings',
      'approveOnboarding',
      'rejectOnboarding',
    ]);
    serviceSpy.getOnboardings.and.returnValue(of(mockListResponse));
    serviceSpy.approveOnboarding.and.returnValue(of({ success: true }));
    serviceSpy.rejectOnboarding.and.returnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      imports: [OnboardingListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OnboardingCatalogService, useValue: serviceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingListComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load onboardings on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getOnboardings).toHaveBeenCalledTimes(1);
    expect(component.onboardings().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('should set error state when API fails', () => {
    serviceSpy.getOnboardings.and.returnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should reload onboardings when filter changes', () => {
    fixture.detectChanges();
    component.selectedStatus = 'APPROVED';
    component.applyFilters();
    expect(serviceSpy.getOnboardings).toHaveBeenCalledTimes(2);
    expect(serviceSpy.getOnboardings).toHaveBeenCalledWith({ status: 'APPROVED' });
  });

  it('should compute progress percentage correctly', () => {
    const item = mockOnboardings[0]; // 3 of 5 steps
    expect(component.progressPercent(item)).toBe(60);
  });

  it('should return correct status CSS class', () => {
    expect(component.statusClass('DRAFT')).toBe('status-draft');
    expect(component.statusClass('UNDER_REVIEW')).toBe('status-under-review');
    expect(component.statusClass('APPROVED')).toBe('status-approved');
    expect(component.statusClass('REJECTED')).toBe('status-rejected');
  });

  it('should call approveOnboarding and reload on approve', () => {
    fixture.detectChanges();
    component.approve(mockOnboardings[0]);
    expect(serviceSpy.approveOnboarding).toHaveBeenCalledWith('onb-001');
    expect(serviceSpy.getOnboardings).toHaveBeenCalledTimes(2);
  });

  it('should open and close reject modal correctly', () => {
    fixture.detectChanges();
    component.openRejectModal(mockOnboardings[0]);
    expect(component.rejectModalOpen()).toBeTrue();
    expect(component.selectedItem()?.onboarding_id).toBe('onb-001');

    component.closeRejectModal();
    expect(component.rejectModalOpen()).toBeFalse();
    expect(component.selectedItem()).toBeNull();
  });

  it('should call rejectOnboarding with reason and reload', () => {
    fixture.detectChanges();
    component.openRejectModal(mockOnboardings[0]);
    component.rejectReason = 'Documentacion incompleta';
    component.confirmReject();
    expect(serviceSpy.rejectOnboarding).toHaveBeenCalledWith('onb-001', 'Documentacion incompleta');
    expect(serviceSpy.getOnboardings).toHaveBeenCalledTimes(2);
  });

  it('should not call rejectOnboarding if reason is empty', () => {
    fixture.detectChanges();
    component.openRejectModal(mockOnboardings[0]);
    component.rejectReason = '  ';
    component.confirmReject();
    expect(serviceSpy.rejectOnboarding).not.toHaveBeenCalled();
  });
});
