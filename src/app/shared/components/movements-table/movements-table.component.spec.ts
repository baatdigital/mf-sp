import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovementsTableComponent } from './movements-table.component';
import { LedgerEntry } from '../../../domain/models/ledger-entry.model';

const makeLedgerEntry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({
  entry_id: 'entry-001',
  account_id: 'acc-001',
  organization_id: 'org-001',
  entry_type: 'CREDIT',
  amount: 500,
  category: 'SPEI_IN',
  concept: 'Pago recibido',
  balance_after: 1500,
  created_at: '2026-02-17T12:00:00Z',
  ...overrides,
});

describe('MovementsTableComponent', () => {
  let component: MovementsTableComponent;
  let fixture: ComponentFixture<MovementsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MovementsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when entries array is empty and not loading', () => {
    fixture.componentRef.setInput('entries', []);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state')).toBeTruthy();
  });

  it('should show skeleton rows when isLoading is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(3);
  });

  it('should hide empty state when isLoading is true', () => {
    fixture.componentRef.setInput('entries', []);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty-state')).toBeNull();
  });

  it('should render one row per entry', () => {
    fixture.componentRef.setInput('entries', [makeLedgerEntry(), makeLedgerEntry({ entry_id: 'entry-002' })]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show account column when showAccountColumn is true', () => {
    fixture.componentRef.setInput('entries', [makeLedgerEntry()]);
    fixture.componentRef.setInput('showAccountColumn', true);
    fixture.detectChanges();
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.textContent?.trim());
    expect(headerTexts).toContain('Cuenta');
  });

  it('should hide account column when showAccountColumn is false', () => {
    fixture.componentRef.setInput('entries', [makeLedgerEntry()]);
    fixture.componentRef.setInput('showAccountColumn', false);
    fixture.detectChanges();
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.textContent?.trim());
    expect(headerTexts).not.toContain('Cuenta');
  });

  it('should apply credit badge class for CREDIT entry', () => {
    expect(component.getBadgeClass('CREDIT')).toBe('badge badge-credit');
  });

  it('should apply debit badge class for DEBIT entry', () => {
    expect(component.getBadgeClass('DEBIT')).toBe('badge badge-debit');
  });

  it('should return + prefix for CREDIT and - prefix for DEBIT', () => {
    expect(component.getAmountPrefix('CREDIT')).toBe('+');
    expect(component.getAmountPrefix('DEBIT')).toBe('-');
  });

  it('should respect pageSize and slice entries', () => {
    component.pageSize = 2;
    component.entries = [
      makeLedgerEntry({ entry_id: 'e1' }),
      makeLedgerEntry({ entry_id: 'e2' }),
      makeLedgerEntry({ entry_id: 'e3' }),
    ];
    expect(component.pagedEntries.length).toBe(2);
  });

  it('trackById should return entry_id', () => {
    const entry = makeLedgerEntry({ entry_id: 'e99' });
    expect(component.trackById(0, entry)).toBe('e99');
  });

  // ─── Regresión responsive (ISS-000) ─────────────────────────────
  // Verifica que el contenedor de tabla tiene overflow-x:auto (no hidden)
  // y que las tablas están dentro de un wrapper con scroll horizontal.
  it('[responsive] container should have overflow-x:auto, not overflow:hidden', () => {
    fixture.componentRef.setInput('entries', [makeLedgerEntry()]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const container = (fixture.nativeElement as HTMLElement).querySelector(
      '.movements-table-container'
    ) as HTMLElement | null;
    expect(container).toBeTruthy();
    const style = getComputedStyle(container!);
    // overflow:hidden en un wrapper de tabla causa scroll horizontal en la página.
    // El valor debe ser 'auto' o 'scroll', nunca 'hidden'.
    expect(style.overflowX).not.toBe('hidden');
  });

  it('[responsive] data table should be a descendant of the scrollable container', () => {
    fixture.componentRef.setInput('entries', [makeLedgerEntry()]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    const container = (fixture.nativeElement as HTMLElement).querySelector(
      '.movements-table-container'
    );
    const table = container?.querySelector('table.movements-table');
    expect(table).toBeTruthy();
  });
});
