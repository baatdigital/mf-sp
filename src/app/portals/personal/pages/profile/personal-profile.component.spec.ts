/**
 * Tests: PersonalProfileComponent
 *
 * Verifica la pantalla de perfil del usuario B2C con edicion inline.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PersonalProfileComponent } from './personal-profile.component';
import { SharedStateService } from '@shared-state';
import { PersonalService } from '../../services/personal.service';

const mockProfile = {
  user_id: 'u-001',
  name: 'Ana Lopez',
  email: 'ana@test.com',
  phone: '5512345678',
  clabe: '123456789012345678',
  created_at: '2024-01-01T00:00:00Z',
};

const mockSharedState = {
  currentOrganizationId: () => 'org-001',
  currentUser: () => ({ id: 'u-001', name: 'Ana Lopez', email: 'ana@test.com' }),
  accessToken: () => 'test-token',
  tenant: () => ({ id: 'superpago', apiKey: 'key' }),
};

const mockPersonalService = {
  getProfile: jasmine.createSpy('getProfile').and.returnValue(
    of({ success: true, data: mockProfile })
  ),
  updateProfile: jasmine.createSpy('updateProfile').and.returnValue(
    of({ success: true, data: { ...mockProfile, name: 'Ana Maria Lopez' } })
  ),
};

describe('PersonalProfileComponent', () => {
  let fixture: ComponentFixture<PersonalProfileComponent>;
  let component: PersonalProfileComponent;

  beforeEach(async () => {
    mockPersonalService.getProfile.calls.reset();
    mockPersonalService.updateProfile.calls.reset();

    mockPersonalService.getProfile.and.returnValue(
      of({ success: true, data: mockProfile })
    );
    mockPersonalService.updateProfile.and.returnValue(
      of({ success: true, data: { ...mockProfile, name: 'Ana Maria Lopez' } })
    );

    await TestBed.configureTestingModule({
      imports: [PersonalProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: PersonalService, useValue: mockPersonalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar el perfil del usuario en ngOnInit', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mockPersonalService.getProfile).toHaveBeenCalled();
    expect(component.profile()).toEqual(mockProfile);
  });

  it('debe desactivar loading despues de cargar datos', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('debe mostrar el nombre del usuario en el perfil', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ana Lopez');
  });

  it('debe calcular las iniciales correctamente', async () => {
    await fixture.whenStable();
    expect(component.initials()).toBe('AL');
  });

  it('debe entrar en modo edicion al llamar enterEditMode()', async () => {
    await fixture.whenStable();
    component.enterEditMode();
    fixture.detectChanges();
    expect(component.isEditMode()).toBeTrue();
    expect(component.editForm.value.name).toBe('Ana Lopez');
    expect(component.editForm.value.phone).toBe('5512345678');
  });

  it('debe cancelar edicion y volver al modo lectura', async () => {
    await fixture.whenStable();
    component.enterEditMode();
    component.cancelEdit();
    fixture.detectChanges();
    expect(component.isEditMode()).toBeFalse();
  });

  it('debe guardar el perfil y salir del modo edicion', async () => {
    await fixture.whenStable();
    component.enterEditMode();
    component.editForm.setValue({ name: 'Ana Maria Lopez', phone: '5512345678' });
    component.saveProfile();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockPersonalService.updateProfile).toHaveBeenCalledWith({
      name: 'Ana Maria Lopez',
      phone: '5512345678',
    });
    expect(component.isEditMode()).toBeFalse();
    expect(component.profile()?.name).toBe('Ana Maria Lopez');
  });

  it('debe mostrar error cuando falla el guardado', async () => {
    mockPersonalService.updateProfile.and.returnValue(
      throwError(() => new Error('Update failed'))
    );

    await fixture.whenStable();
    component.enterEditMode();
    component.editForm.setValue({ name: 'Test', phone: '' });
    component.saveProfile();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.saveError()).toBeTruthy();
    expect(component.isSaving()).toBeFalse();
    expect(component.isEditMode()).toBeTrue();
  });

  it('debe usar datos de SharedState como fallback si el API falla', async () => {
    mockPersonalService.getProfile.and.returnValue(
      throwError(() => new Error('Profile not found'))
    );

    const fixture2 = TestBed.createComponent(PersonalProfileComponent);
    fixture2.detectChanges();
    await fixture2.whenStable();
    fixture2.detectChanges();

    expect(fixture2.componentInstance.profile()?.name).toBe('Ana Lopez');
    expect(fixture2.componentInstance.isLoading()).toBeFalse();
    expect(fixture2.componentInstance.loadError()).toBeNull();
  });

  it('debe mostrar el toast de "proximamente" al hacer click en Cambiar NIP', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    component.showPinComingSoon();
    expect(component.pinToast()).toBeTrue();
  });

  it('no debe guardar si el nombre esta vacio', async () => {
    await fixture.whenStable();
    component.enterEditMode();
    component.editForm.setValue({ name: '', phone: '' });
    component.saveProfile();

    expect(mockPersonalService.updateProfile).not.toHaveBeenCalled();
    expect(component.isEditMode()).toBeTrue();
  });

  it('debe formatear correctamente la CLABE de 18 digitos', () => {
    expect(component.formatClabe('123456789012345678')).toBe('12-3456-7890-12345678');
  });
});
