/**
 * Tests: SavedServicesComponent
 *
 * Cubre el grid de servicios guardados: carga, pago rapido,
 * eliminacion con confirmacion inline y formulario de agregar.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SavedServicesComponent } from './saved-services.component';
import { BillpayServiceApi, SavedBillpayService } from '../../services/billpay.service';
import { SharedStateService } from '@shared-state';

// Datos de prueba
const mockSaved: SavedBillpayService[] = [
  {
    saved_id: 'SAV-001',
    service_id: 'CFE',
    service_name: 'CFE',
    reference: '12345',
    nickname: 'Oficina Norte',
    last_amount: 850.5,
    last_paid_at: '2026-02-10T10:00:00Z',
  },
  {
    saved_id: 'SAV-002',
    service_id: 'TELMEX',
    service_name: 'Telmex',
    reference: '99999',
    nickname: 'Internet Casa',
  },
];

const mockSavedServiceApi = jasmine.createSpyObj('BillpayServiceApi', [
  'getSavedServices',
  'saveService',
  'deleteSavedService',
]);

const mockSharedState = {
  currentOrganizationId: () => 'org-biz-001',
  accessToken: () => 'token',
  tenant: () => ({ id: 'superpago' }),
};

describe('SavedServicesComponent', () => {
  let fixture: ComponentFixture<SavedServicesComponent>;
  let component: SavedServicesComponent;
  let router: Router;

  beforeEach(async () => {
    mockSavedServiceApi.getSavedServices.calls.reset();
    mockSavedServiceApi.saveService.calls.reset();
    mockSavedServiceApi.deleteSavedService.calls.reset();

    mockSavedServiceApi.getSavedServices.and.returnValue(
      of({ success: true, data: mockSaved })
    );
    mockSavedServiceApi.saveService.and.returnValue(
      of({ success: true, data: { saved_id: 'SAV-003', service_id: 'SAT', service_name: 'SAT', reference: '11111', nickname: 'SAT Empresa' } })
    );
    mockSavedServiceApi.deleteSavedService.and.returnValue(
      of({ success: true })
    );

    await TestBed.configureTestingModule({
      imports: [SavedServicesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BillpayServiceApi, useValue: mockSavedServiceApi },
        { provide: SharedStateService, useValue: mockSharedState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedServicesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar y mostrar los servicios guardados en ngOnInit', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockSavedServiceApi.getSavedServices).toHaveBeenCalledWith('org-biz-001');
    expect(component.savedServices().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar error cuando falla la carga', async () => {
    mockSavedServiceApi.getSavedServices.and.returnValue(throwError(() => new Error('Error')));

    component.loadSavedServices();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  });

  it('pagarRapido navega al flujo de pago con queryParams correctos', async () => {
    await fixture.whenStable();
    const navigateSpy = spyOn(router, 'navigate');

    component.pagarRapido(mockSaved[0]);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/sp/business/billpay/pay'],
      {
        queryParams: {
          service_id: 'CFE',
          service_name: 'CFE',
          reference: '12345',
        },
      }
    );
  });

  it('eliminarServicio elimina el servicio de la lista y limpia la confirmacion', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.iniciarEliminar('SAV-001');
    expect(component.confirmDeleteId()).toBe('SAV-001');

    component.eliminarServicio('SAV-001');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockSavedServiceApi.deleteSavedService).toHaveBeenCalledWith('org-biz-001', 'SAV-001');
    expect(component.savedServices().length).toBe(1);
    expect(component.savedServices()[0].saved_id).toBe('SAV-002');
    expect(component.confirmDeleteId()).toBeNull();
  });

  it('cancelarEliminar limpia el id de confirmacion sin borrar', () => {
    component.confirmDeleteId.set('SAV-001');
    component.cancelarEliminar();

    expect(component.confirmDeleteId()).toBeNull();
    expect(mockSavedServiceApi.deleteSavedService).not.toHaveBeenCalled();
  });

  it('agregarServicio llama saveService y agrega el nuevo item a la lista', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component.showAddForm.set(true);
    component.newNickname = 'SAT Empresa';
    component.newServiceId = 'SAT';
    component.newReference = '11111';

    component.agregarServicio();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockSavedServiceApi.saveService).toHaveBeenCalledWith(
      'org-biz-001',
      jasmine.objectContaining({
        nickname: 'SAT Empresa',
        service_id: 'SAT',
        reference: '11111',
      })
    );
    expect(component.savedServices().length).toBe(3);
    expect(component.addSuccess()).toBeTruthy();
    expect(component.isAdding()).toBeFalse();
  });

  it('getServiceEmoji retorna el emoji correcto o el fallback', () => {
    expect(component.getServiceEmoji('CFE')).toBe('⚡');
    expect(component.getServiceEmoji('TELMEX')).toBe('📡');
    expect(component.getServiceEmoji('DESCONOCIDO')).toBe('🔧');
  });

  it('toggleAddForm alterna visibilidad del formulario', () => {
    expect(component.showAddForm()).toBeFalse();
    component.toggleAddForm();
    expect(component.showAddForm()).toBeTrue();
    component.toggleAddForm();
    expect(component.showAddForm()).toBeFalse();
  });

  it('toggleAddForm limpia errores y exitos', () => {
    component.addError.set('algun error');
    component.addSuccess.set('exito');
    component.toggleAddForm();
    expect(component.addError()).toBeNull();
    expect(component.addSuccess()).toBeNull();
  });

  it('agregarServicio no ejecuta si nickname esta vacio', () => {
    component.newNickname = '';
    component.newServiceId = 'CFE';
    component.newReference = '12345';
    component.agregarServicio();
    expect(mockSavedServiceApi.saveService).not.toHaveBeenCalled();
  });

  it('agregarServicio no ejecuta si serviceId esta vacio', () => {
    component.newNickname = 'Test';
    component.newServiceId = '';
    component.newReference = '12345';
    component.agregarServicio();
    expect(mockSavedServiceApi.saveService).not.toHaveBeenCalled();
  });

  it('agregarServicio no ejecuta si reference esta vacio', () => {
    component.newNickname = 'Test';
    component.newServiceId = 'CFE';
    component.newReference = '';
    component.agregarServicio();
    expect(mockSavedServiceApi.saveService).not.toHaveBeenCalled();
  });

  it('agregarServicio no ejecuta si no hay orgId', () => {
    const origOrgId = mockSharedState.currentOrganizationId;
    (mockSharedState as any).currentOrganizationId = () => null;
    component.newNickname = 'Test';
    component.newServiceId = 'CFE';
    component.newReference = '12345';
    component.agregarServicio();
    expect(mockSavedServiceApi.saveService).not.toHaveBeenCalled();
    (mockSharedState as any).currentOrganizationId = origOrgId;
  });

  it('agregarServicio muestra error cuando falla', async () => {
    mockSavedServiceApi.saveService.and.returnValue(throwError(() => new Error('err')));
    component.newNickname = 'Test';
    component.newServiceId = 'CFE';
    component.newReference = '12345';
    component.agregarServicio();
    await fixture.whenStable();
    expect(component.addError()).toBeTruthy();
    expect(component.isAdding()).toBeFalse();
  });

  it('eliminarServicio no ejecuta si no hay orgId', () => {
    const origOrgId = mockSharedState.currentOrganizationId;
    (mockSharedState as any).currentOrganizationId = () => null;
    component.eliminarServicio('SAV-001');
    expect(mockSavedServiceApi.deleteSavedService).not.toHaveBeenCalled();
    (mockSharedState as any).currentOrganizationId = origOrgId;
  });

  it('eliminarServicio maneja error sin crashear', async () => {
    mockSavedServiceApi.deleteSavedService.and.returnValue(throwError(() => new Error('err')));
    component.eliminarServicio('SAV-001');
    await fixture.whenStable();
    expect(component.isDeleting()).toBeFalse();
    expect(component.confirmDeleteId()).toBeNull();
  });

  it('loadSavedServices no ejecuta si no hay orgId', () => {
    const origOrgId = mockSharedState.currentOrganizationId;
    (mockSharedState as any).currentOrganizationId = () => null;
    mockSavedServiceApi.getSavedServices.calls.reset();
    component.loadSavedServices();
    expect(mockSavedServiceApi.getSavedServices).not.toHaveBeenCalled();
    (mockSharedState as any).currentOrganizationId = origOrgId;
  });

  it('loadSavedServices maneja data null', async () => {
    mockSavedServiceApi.getSavedServices.and.returnValue(of({ success: true, data: null }));
    component.loadSavedServices();
    await fixture.whenStable();
    expect(component.savedServices()).toEqual([]);
  });
});
