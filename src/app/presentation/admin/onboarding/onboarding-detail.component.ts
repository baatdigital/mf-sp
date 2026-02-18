/**
 * OnboardingDetailComponent - EP-SP-025
 *
 * Vista de detalle de un onboarding especifico con estado de provisionamiento.
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'sp-onboarding-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Detalle de Onboarding</h1>
        <p>ID: {{ id$ | async }}</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Vista de detalle en construccion.</p>
        <p>Mostrara: estado actual, pasos completados, cuentas creadas, errores.</p>
      </div>
    </div>
  `,
})
export class OnboardingDetailComponent {
  readonly id$ = inject(ActivatedRoute).params.pipe(map((p) => p['id']));
}
