/**
 * BillpayDiscrepanciesComponent - Tests unitarios
 * EP-SP-026
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BillpayDiscrepanciesComponent } from './billpay-discrepancies.component';
import { BillpayMonitorService, Discrepancy } from './billpay-monitor.service';
import { SharedStateService } from '@shared-state';

const mockDiscrepancy: Discrepancy = {
  discrepancy_id: 'disc-test-001',
  org_id: 'org-abc-001',
  transaction_id: 'txn-0001',
  biller_name: 'CFE Electricidad',
  amount: 1250.50,
  discrepancy_type: 'STATUS_MISMATCH',
  local_status: 'COMPLETED',
  provider_status: 'PENDING',
  detected_at: '2025-01-15T10:30:00Z',
  resolved: false,
};

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-123',
  tenant: () => ({ id: 'superpago', apiKey: 'test-key' }),
};

describe('BillpayDiscrepanciesComponent', () => {
  let fixture: ComponentFixture<BillpayDiscrepanciesComponent>;
  let component: BillpayDiscrepanciesComponent;
  let serviceSpy: jasmine.SpyObj<BillpayMonitorService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('BillpayMonitorService', ['resolveDiscrepancy']);
    serviceSpy.resolveDiscrepancy.and.returnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      imports: [BillpayDiscrepanciesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayMonitorService, useValue: serviceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillpayDiscrepanciesComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with mock discrepancies', () => {
    fixture.detectChanges();
    expect(component.discrepancies().length).toBeGreaterThan(0);
    expect(component.isLoading()).toBeFalse();
  });

  it('should compute pending count correctly', () => {
    fixture.detectChanges();
    const initialPending = component.pendingCount();
    expect(initialPending).toBeGreaterThan(0);
  });

  it('should filter discrepancies by type', () => {
    fixture.detectChanges();
    component.typeFilter = 'STATUS_MISMATCH';
    component.applyFilters();
    const filtered = component.filteredDiscrepancies();
    expect(filtered.every((d) => d.discrepancy_type === 'STATUS_MISMATCH')).toBeTrue();
  });

  it('should return correct type badge class', () => {
    expect(component.typeClass('STATUS_MISMATCH')).toBe('type-status-mismatch');
    expect(component.typeClass('AMOUNT_MISMATCH')).toBe('type-amount-mismatch');
  });

  it('should open and cancel resolve form', () => {
    fixture.detectChanges();
    component.openResolveForm(mockDiscrepancy);
    expect(component.resolvingId()).toBe('disc-test-001');

    component.cancelResolve();
    expect(component.resolvingId()).toBeNull();
  });

  it('should call resolveDiscrepancy and mark item as resolved', () => {
    fixture.detectChanges();
    // Agrega una discrepancia de prueba al estado
    component.discrepancies.set([{ ...mockDiscrepancy }]);

    component.openResolveForm(mockDiscrepancy);
    component.resolveJustification = 'El proveedor confirmo el pago manualmente';
    component.confirmResolve(mockDiscrepancy);

    expect(serviceSpy.resolveDiscrepancy).toHaveBeenCalledWith(
      'disc-test-001',
      'El proveedor confirmo el pago manualmente'
    );
    expect(component.discrepancies()[0].resolved).toBeTrue();
    expect(component.resolvingId()).toBeNull();
  });

  it('should not call resolveDiscrepancy when justification is empty', () => {
    fixture.detectChanges();
    component.openResolveForm(mockDiscrepancy);
    component.resolveJustification = '';
    component.confirmResolve(mockDiscrepancy);
    expect(serviceSpy.resolveDiscrepancy).not.toHaveBeenCalled();
  });

  it('should set error when resolveDiscrepancy fails', () => {
    serviceSpy.resolveDiscrepancy.and.returnValue(throwError(() => new Error('API error')));
    fixture.detectChanges();
    component.discrepancies.set([{ ...mockDiscrepancy }]);
    component.openResolveForm(mockDiscrepancy);
    component.resolveJustification = 'Justificacion valida';
    component.confirmResolve(mockDiscrepancy);
    expect(component.error()).toBeTruthy();
  });
});
