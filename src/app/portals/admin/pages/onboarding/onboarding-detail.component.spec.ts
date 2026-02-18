/**
 * OnboardingDetailComponent - Tests unitarios
 * EP-SP-025
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OnboardingDetailComponent } from './onboarding-detail.component';
import {
  OnboardingCatalogService,
  OnboardingRecord,
} from '../../services/onboarding-catalog.service';
import { SharedStateService } from '@shared-state';

const mockOnboarding: OnboardingRecord = {
  onboarding_id: 'onb-001',
  org_id: 'org-abc-001',
  tier: 'B2B',
  status: 'UNDER_REVIEW',
  current_step: 'LEGAL',
  completed_steps: ['EMPRESA_INFO', 'PRODUCTOS', 'DOCUMENTOS'],
  total_steps: 5,
  created_at: '2025-01-10T10:00:00Z',
  updated_at: '2025-01-12T10:00:00Z',
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('OnboardingDetailComponent', () => {
  let fixture: ComponentFixture<OnboardingDetailComponent>;
  let component: OnboardingDetailComponent;
  let serviceSpy: jasmine.SpyObj<OnboardingCatalogService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('OnboardingCatalogService', [
      'getOnboarding',
      'approveOnboarding',
      'rejectOnboarding',
    ]);
    serviceSpy.getOnboarding.and.returnValue(of({ success: true, data: mockOnboarding }));
    serviceSpy.approveOnboarding.and.returnValue(of({ success: true }));
    serviceSpy.rejectOnboarding.and.returnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      imports: [OnboardingDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OnboardingCatalogService, useValue: serviceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'onb-001' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load onboarding detail on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getOnboarding).toHaveBeenCalledWith('onb-001');
    expect(component.onboarding()?.onboarding_id).toBe('onb-001');
    expect(component.isLoading()).toBeFalse();
  });

  it('should set error when API fails', () => {
    serviceSpy.getOnboarding.and.returnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should compute canAct as true when status is UNDER_REVIEW', () => {
    fixture.detectChanges();
    expect(component.canAct()).toBeTrue();
  });

  it('should identify completed steps correctly', () => {
    fixture.detectChanges();
    expect(component.isStepCompleted('EMPRESA_INFO')).toBeTrue();
    expect(component.isStepCompleted('LEGAL')).toBeFalse();
    expect(component.isStepCompleted('CONFORMIDAD')).toBeFalse();
  });

  it('should return correct step item class', () => {
    fixture.detectChanges();
    expect(component.stepItemClass('EMPRESA_INFO')).toBe('completed');
    expect(component.stepItemClass('LEGAL')).toBe('current');
    expect(component.stepItemClass('CONFORMIDAD')).toBe('pending');
  });

  it('should call approveOnboarding and reload', () => {
    fixture.detectChanges();
    component.approve();
    expect(serviceSpy.approveOnboarding).toHaveBeenCalledWith('onb-001');
    expect(serviceSpy.getOnboarding).toHaveBeenCalledTimes(2);
  });

  it('should open and close reject modal', () => {
    fixture.detectChanges();
    component.openRejectModal();
    expect(component.rejectModalOpen()).toBeTrue();

    component.closeRejectModal();
    expect(component.rejectModalOpen()).toBeFalse();
  });

  it('should call rejectOnboarding with reason and reload', () => {
    fixture.detectChanges();
    component.openRejectModal();
    component.rejectReason = 'Documentos invalidos';
    component.confirmReject();
    expect(serviceSpy.rejectOnboarding).toHaveBeenCalledWith('onb-001', 'Documentos invalidos');
    expect(serviceSpy.getOnboarding).toHaveBeenCalledTimes(2);
  });

  it('should not call rejectOnboarding when reason is blank', () => {
    fixture.detectChanges();
    component.openRejectModal();
    component.rejectReason = '';
    component.confirmReject();
    expect(serviceSpy.rejectOnboarding).not.toHaveBeenCalled();
  });
});
