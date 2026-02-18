/**
 * OrganizationsListComponent - Tests unitarios
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrganizationsListComponent } from './organizations-list.component';
import { AdminService, AdminOrganization } from '../../services/admin.service';
import { SharedStateService } from '@shared-state';

const mockOrgs: AdminOrganization[] = [
  {
    org_id: 'org-001',
    name: 'Empresa Alpha',
    tier: 'B2B',
    status: 'ACTIVE',
    accounts_count: 5,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    org_id: 'org-002',
    name: 'Empresa Beta',
    tier: 'B2C',
    status: 'FROZEN',
    accounts_count: 2,
    created_at: '2024-02-10T00:00:00Z',
  },
];

const mockListResponse = {
  success: true,
  data: mockOrgs,
  total: 2,
  page: 1,
  page_size: 20,
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('OrganizationsListComponent', () => {
  let fixture: ComponentFixture<OrganizationsListComponent>;
  let component: OrganizationsListComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', [
      'getOrganizations',
      'freezeOrganization',
      'unfreezeOrganization',
    ]);
    adminServiceSpy.getOrganizations.and.returnValue(of(mockListResponse));
    adminServiceSpy.freezeOrganization.and.returnValue(of({ success: true }));
    adminServiceSpy.unfreezeOrganization.and.returnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      imports: [OrganizationsListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationsListComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load organizations on init', () => {
    fixture.detectChanges();
    expect(adminServiceSpy.getOrganizations).toHaveBeenCalled();
    expect(component.organizations().length).toBe(2);
    expect(component.total()).toBe(2);
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should reset page and reload when filter changes', () => {
    fixture.detectChanges();
    component.currentPage.set(3);
    component.selectedTier = 'B2B';
    component.applyFilters();
    expect(component.currentPage()).toBe(1);
    expect(adminServiceSpy.getOrganizations).toHaveBeenCalledTimes(2);
  });

  it('should show error message when API call fails', () => {
    adminServiceSpy.getOrganizations.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should paginate correctly on goToPage', () => {
    fixture.detectChanges();
    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
    expect(adminServiceSpy.getOrganizations).toHaveBeenCalledTimes(2);
  });

  it('should call freezeOrganization and reload on toggleFreeze for ACTIVE org', () => {
    fixture.detectChanges();
    const activeOrg = mockOrgs[0];
    component.toggleFreeze(activeOrg);
    expect(adminServiceSpy.freezeOrganization).toHaveBeenCalledWith(activeOrg.org_id);
    expect(adminServiceSpy.getOrganizations).toHaveBeenCalledTimes(2);
  });

  it('should call unfreezeOrganization on toggleFreeze for FROZEN org', () => {
    fixture.detectChanges();
    const frozenOrg = mockOrgs[1];
    component.toggleFreeze(frozenOrg);
    expect(adminServiceSpy.unfreezeOrganization).toHaveBeenCalledWith(frozenOrg.org_id);
  });

  it('should debounce search input', fakeAsync(() => {
    fixture.detectChanges();
    component['searchSubject'].next('alpha');
    tick(100);
    expect(adminServiceSpy.getOrganizations).toHaveBeenCalledTimes(1);
    tick(300);
    expect(adminServiceSpy.getOrganizations).toHaveBeenCalledTimes(2);
  }));
});
