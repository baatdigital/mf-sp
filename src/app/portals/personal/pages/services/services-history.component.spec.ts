import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ServicesHistoryComponent } from './services-history.component';
import { ServicesBillpayService } from '../../services/services-billpay.service';
import { SharedStateService } from '@shared-state';

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockItems = [
  { transaction_id: 'txn-001', service_id: 'cfe-001', service_name: 'CFE', service_emoji: '⚡', reference: 'C12345', amount: 450, status: 'COMPLETED' as const, created_at: '2026-02-01T10:00:00Z' },
  { transaction_id: 'txn-002', service_id: 'telmex-001', service_name: 'Telmex', service_emoji: '📡', reference: 'T99999', amount: 200, status: 'FAILED' as const, created_at: '2026-02-02T12:00:00Z' },
  { transaction_id: 'txn-003', service_id: 'gas-001', service_name: 'Gas LP', service_emoji: '🔥', reference: 'G5678', amount: 300, status: 'PENDING' as const, created_at: '2026-02-03T08:00:00Z' },
];

describe('ServicesHistoryComponent', () => {
  let component: ServicesHistoryComponent;
  let billpayServiceSpy: jasmine.SpyObj<ServicesBillpayService>;

  beforeEach(() => {
    billpayServiceSpy = jasmine.createSpyObj('ServicesBillpayService', ['getHistory']);
    billpayServiceSpy.getHistory.and.returnValue(of({ success: true, data: mockItems, total: mockItems.length }));

    TestBed.configureTestingModule({
      imports: [ServicesHistoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ServicesBillpayService, useValue: billpayServiceSpy },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    });

    const fixture = TestBed.createComponent(ServicesHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load history on init', () => {
    expect(billpayServiceSpy.getHistory).toHaveBeenCalled();
    expect(component.items().length).toBe(3);
  });

  it('should show all items by default', () => {
    expect(component.activeTab()).toBe('all');
    expect(component.filtered().length).toBe(3);
  });

  it('should filter to completed only', () => {
    component.setTab('success');
    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].status).toBe('COMPLETED');
  });

  it('should filter to failed only', () => {
    component.setTab('failed');
    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].status).toBe('FAILED');
  });

  it('should toggle detail for item', () => {
    expect(component.selectedId()).toBeNull();
    component.toggleDetail('txn-001');
    expect(component.selectedId()).toBe('txn-001');
    component.toggleDetail('txn-001');
    expect(component.selectedId()).toBeNull();
  });

  it('should show error when load fails', fakeAsync(() => {
    billpayServiceSpy.getHistory.and.returnValue(throwError(() => new Error('Network error')));
    component.load();
    tick();
    expect(component.error()).toBeTruthy();
  }));

  it('should return correct emoji for categories', () => {
    const item = mockItems[0];
    expect(component.emojiFor(item)).toBe('⚡');
  });

  it('should return correct status labels', () => {
    expect(component.statusLabel('COMPLETED')).toBe('Exitoso');
    expect(component.statusLabel('FAILED')).toBe('Fallido');
    expect(component.statusLabel('PENDING')).toBe('Pendiente');
  });
});
