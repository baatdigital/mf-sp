/**
 * OrganizationDetailComponent - Tests unitarios
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrganizationDetailComponent } from './organization-detail.component';
import { AdminService, AdminOrganizationDetail } from '../../services/admin.service';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { SharedStateService } from '@shared-state';

const mockOrgDetail: AdminOrganizationDetail = {
  org_id: 'org-001',
  name: 'Empresa Alpha',
  tier: 'B2B',
  status: 'ACTIVE',
  accounts_count: 3,
  created_at: '2024-01-15T00:00:00Z',
  contact_email: 'admin@alpha.com',
  tax_id: 'ALFA010101AAA',
};

const mockAccounts = {
  success: true,
  data: [
    {
      account_id: 'acc-001',
      organization_id: 'org-001',
      account_type: 'CONCENTRADORA' as const,
      status: 'ACTIVE' as const,
      balance: 10000,
      available_balance: 9500,
      created_at: '2024-01-15T00:00:00Z',
    },
  ],
};

const mockLedger = {
  success: true,
  data: [],
  total: 0,
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('OrganizationDetailComponent', () => {
  let fixture: ComponentFixture<OrganizationDetailComponent>;
  let component: OrganizationDetailComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', ['getOrganization']);
    adminServiceSpy.getOrganization.and.returnValue(
      of({ success: true, data: mockOrgDetail })
    );

    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', [
      'getAccounts',
      'getLedgerEntries',
    ]);
    accountsAdapterSpy.getAccounts.and.returnValue(of(mockAccounts));
    accountsAdapterSpy.getLedgerEntries.and.returnValue(of(mockLedger));

    await TestBed.configureTestingModule({
      imports: [OrganizationDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: SharedStateService, useValue: mockSharedState },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ orgId: 'org-001' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load organization detail from route param on init', () => {
    fixture.detectChanges();
    expect(adminServiceSpy.getOrganization).toHaveBeenCalledWith('org-001');
    expect(component.organization()?.name).toBe('Empresa Alpha');
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('should load accounts after organization is loaded', () => {
    fixture.detectChanges();
    expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-001');
    expect(component.accounts().length).toBe(1);
  });

  it('should load recent movements for first account', () => {
    fixture.detectChanges();
    expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalledWith(
      'org-001', 'acc-001', 1, 10
    );
  });

  it('should set error when organization API fails', () => {
    adminServiceSpy.getOrganization.and.returnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('should not load accounts when organization load fails', () => {
    adminServiceSpy.getOrganization.and.returnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    expect(accountsAdapterSpy.getAccounts).not.toHaveBeenCalled();
  });
});
