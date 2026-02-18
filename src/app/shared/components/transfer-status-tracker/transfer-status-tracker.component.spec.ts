import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransferStatusTrackerComponent } from './transfer-status-tracker.component';
import { SpeiTransfer, TransferStatus } from '../../../domain/models/transfer.model';

const makeTransfer = (overrides: Partial<SpeiTransfer> = {}): SpeiTransfer => ({
  transfer_id: 'txn-001',
  organization_id: 'org-001',
  source_account_id: 'acc-001',
  destination_clabe: '012345678901234567',
  destination_name: 'Juan Perez',
  amount: 1500,
  concept: 'Pago de servicios',
  status: 'PENDING',
  created_at: '2026-02-17T10:00:00Z',
  ...overrides,
});

describe('TransferStatusTrackerComponent', () => {
  let component: TransferStatusTrackerComponent;
  let fixture: ComponentFixture<TransferStatusTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferStatusTrackerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferStatusTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when transfer is null and not loading', () => {
    component.transfer = null;
    component.isLoading = false;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.tracker-empty')).toBeTruthy();
  });

  it('should show skeleton when isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.tracker-body')).toBeTruthy();
  });

  it('should show tracker header when transfer is provided', () => {
    component.transfer = makeTransfer();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.tracker-header')).toBeTruthy();
  });

  it('should emit refreshRequested when refresh button clicked', () => {
    component.transfer = makeTransfer();
    fixture.detectChanges();

    let emitted = false;
    component.refreshRequested.subscribe(() => (emitted = true));

    const btn = (fixture.nativeElement as HTMLElement).querySelector('.refresh-btn') as HTMLButtonElement;
    btn.click();

    expect(emitted).toBeTrue();
  });

  it('should show auto-refresh bar for PENDING status', () => {
    component.transfer = makeTransfer({ status: 'PENDING' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.auto-refresh-bar')).toBeTruthy();
  });

  it('should show auto-refresh bar for PROCESSING status', () => {
    component.transfer = makeTransfer({ status: 'PROCESSING' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.auto-refresh-bar')).toBeTruthy();
  });

  it('should not show auto-refresh bar for COMPLETED status', () => {
    component.transfer = makeTransfer({ status: 'COMPLETED' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.auto-refresh-bar')).toBeNull();
  });

  it('should show error box when status is FAILED and error_message is set', () => {
    component.transfer = makeTransfer({ status: 'FAILED', error_message: 'Fondos insuficientes' });
    fixture.detectChanges();
    const errorBox = (fixture.nativeElement as HTMLElement).querySelector('.error-box');
    expect(errorBox).toBeTruthy();
    expect(errorBox?.textContent).toContain('Fondos insuficientes');
  });

  it('getStatusBadgeClass should return correct class for each status', () => {
    const cases: Array<[TransferStatus, string]> = [
      ['PENDING',    'badge badge-pending'],
      ['PROCESSING', 'badge badge-processing'],
      ['COMPLETED',  'badge badge-completed'],
      ['FAILED',     'badge badge-failed'],
      ['REVERSED',   'badge badge-reversed'],
    ];
    for (const [status, expected] of cases) {
      expect(component.getStatusBadgeClass(status)).toBe(expected);
    }
  });

  it('getStatusLabel should return Spanish labels', () => {
    expect(component.getStatusLabel('PENDING')).toBe('Pendiente');
    expect(component.getStatusLabel('PROCESSING')).toBe('Procesando');
    expect(component.getStatusLabel('COMPLETED')).toBe('Completada');
    expect(component.getStatusLabel('FAILED')).toBe('Fallida');
    expect(component.getStatusLabel('REVERSED')).toBe('Revertida');
  });

  it('timelineSteps should return 3 steps', () => {
    component.transfer = makeTransfer({ status: 'PENDING' });
    const steps = component.timelineSteps();
    expect(steps.length).toBe(3);
  });

  it('timelineSteps: first step is always completed', () => {
    component.transfer = makeTransfer({ status: 'PENDING' });
    const steps = component.timelineSteps();
    expect(steps[0].completed).toBeTrue();
  });

  it('timelineSteps: all steps completed for COMPLETED status', () => {
    component.transfer = makeTransfer({ status: 'COMPLETED' });
    const steps = component.timelineSteps();
    expect(steps.every(s => s.completed)).toBeTrue();
  });

  it('isAutoRefreshable should be true for PENDING and PROCESSING', () => {
    component.transfer = makeTransfer({ status: 'PENDING' });
    expect(component.isAutoRefreshable()).toBeTrue();
    component.transfer = makeTransfer({ status: 'PROCESSING' });
    expect(component.isAutoRefreshable()).toBeTrue();
  });

  it('isAutoRefreshable should be false for COMPLETED and FAILED', () => {
    component.transfer = makeTransfer({ status: 'COMPLETED' });
    expect(component.isAutoRefreshable()).toBeFalse();
    component.transfer = makeTransfer({ status: 'FAILED' });
    expect(component.isAutoRefreshable()).toBeFalse();
  });

  it('trackByLabel should return step label', () => {
    const step = { label: 'Iniciada', completed: true, active: false, failed: false };
    expect(component.trackByLabel(0, step)).toBe('Iniciada');
  });
});
