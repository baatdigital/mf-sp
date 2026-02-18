/**
 * Tests: BillpayHistoryComponent
 *
 * Cubre la tabla de historial de pagos de servicios con filtros,
 * paginacion, exportacion CSV y visualizacion de comprobante.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BillpayHistoryComponent } from './billpay-history.component';
import { BillpayServiceApi, BillpayHistoryItem } from '../../services/billpay.service';
import { SharedStateService } from '@shared-state';

// Datos de prueba
const buildItem = (overrides: Partial<BillpayHistoryItem> = {}): BillpayHistoryItem => ({
  transaction_id: 'TXN-001',
  service_id: 'CFE',
  service_name: 'CFE',
  reference: '123456',
  amount: 850.5,
  status: 'COMPLETED',
  created_at: '2026-02-15T10:00:00Z',
  account_id: 'ACC-001',
  ...overrides,
});

const mockItems: BillpayHistoryItem[] = [
  buildItem({ transaction_id: 'TXN-001', service_id: 'CFE', status: 'COMPLETED' }),
  buildItem({ transaction_id: 'TXN-002', service_id: 'TELMEX', service_name: 'Telmex', status: 'FAILED' }),
  buildItem({ transaction_id: 'TXN-003', service_id: 'SAT', service_name: 'SAT', status: 'PENDING' }),
];

const mockBillpay = jasmine.createSpyObj('BillpayServiceApi', ['getBillpayHistory']);

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago' }),
};

describe('BillpayHistoryComponent', () => {
  let fixture: ComponentFixture<BillpayHistoryComponent>;
  let component: BillpayHistoryComponent;

  beforeEach(async () => {
    mockBillpay.getBillpayHistory.calls.reset();
    mockBillpay.getBillpayHistory.and.returnValue(
      of({ success: true, data: mockItems, total: mockItems.length })
    );

    await TestBed.configureTestingModule({
      imports: [BillpayHistoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayServiceApi, useValue: mockBillpay },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillpayHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar y mostrar el historial en ngOnInit', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockBillpay.getBillpayHistory).toHaveBeenCalledWith('org-biz-001', '');
    expect(component.allItems().length).toBe(3);
    expect(component.filteredItems().length).toBe(3);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando falla la carga del historial', async () => {
    mockBillpay.getBillpayHistory.and.returnValue(throwError(() => new Error('Error')));

    component.loadHistory();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('debe filtrar por tipo de servicio al aplicar filtros', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.filterServiceType = 'CFE';
    component.applyFilters();
    fixture.detectChanges();

    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].service_id).toBe('CFE');
  });

  it('debe filtrar por estado al seleccionar FAILED', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.filterStatus = 'FAILED';
    component.applyFilters();
    fixture.detectChanges();

    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].status).toBe('FAILED');
  });

  it('debe limpiar filtros y restaurar todos los items', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.filterServiceType = 'CFE';
    component.applyFilters();
    expect(component.filteredItems().length).toBe(1);

    component.clearFilters();
    fixture.detectChanges();
    expect(component.filteredItems().length).toBe(3);
  });

  it('debe calcular totalPages correctamente para PAGE_SIZE=20', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    // Con 3 items y PAGE_SIZE=20 -> 1 pagina
    expect(component.totalPages()).toBe(1);
  });

  it('debe navegar entre paginas con goToPage', async () => {
    await fixture.whenStable();

    // Agregar 25 items para probar paginacion
    const manyItems = Array.from({ length: 25 }, (_, i) =>
      buildItem({ transaction_id: `TXN-${i + 100}` })
    );
    component.filteredItems.set(manyItems);
    fixture.detectChanges();

    expect(component.totalPages()).toBe(2);
    component.goToPage(2);
    expect(component.currentPage()).toBe(2);

    // No puede ir a pagina 3 (no existe)
    component.goToPage(3);
    expect(component.currentPage()).toBe(2);
  });

  it('debe togglear el comprobante seleccionado', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.toggleComprobante('TXN-001');
    expect(component.selectedTxnId()).toBe('TXN-001');

    component.toggleComprobante('TXN-001');
    expect(component.selectedTxnId()).toBeNull();
  });

  it('exportarCSV no lanza error cuando hay items filtrados', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    // Mock del DOM para la descarga
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(mockLink as unknown as HTMLElement);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL').and.callFake(() => {});

    expect(() => component.exportarCSV()).not.toThrow();
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('exportarCSV no hace nada cuando filteredItems esta vacio', () => {
    component.filteredItems.set([]);
    const spy = spyOn(document, 'createElement');

    component.exportarCSV();

    expect(spy).not.toHaveBeenCalled();
  });
});
