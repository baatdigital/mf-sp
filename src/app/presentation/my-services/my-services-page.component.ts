/**
 * MyServicesPageComponent - EP-SP-028
 *
 * Vista personal (Tier 3 B2C) para gestionar servicios y ver historial de pagos.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-my-services-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Mis Servicios</h1>
        <p>EP-SP-028 — Historial y gestion de pagos de servicios del usuario (Tier 3 Personal).</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>Historial de pagos de servicios</li>
          <li>Servicios favoritos guardados</li>
          <li>Recordatorios de vencimiento</li>
          <li>Descarga de comprobantes previos</li>
        </ul>
      </div>
    </div>
  `,
})
export class MyServicesPageComponent {}
