/**
 * LimitsPageComponent - EP-SP-020
 *
 * Pantalla de configuracion de limites de transaccion y alertas de consumo.
 * Tier 1 (Admin) configura limites globales; Tier 2 (B2B) ve sus limites asignados.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-limits-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Limites y Alertas</h1>
        <p>EP-SP-020 — Configuracion de limites de transaccion y alertas de consumo por tier.</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>US-SP-080: Tabla de limites por organizacion</li>
          <li>US-SP-081: Alertas al 80% de consumo</li>
          <li>US-SP-082: Bloqueo automatico al exceder limite</li>
          <li>US-SP-083: Historial de alertas</li>
          <li>US-SP-084: Configuracion de politicas por tier</li>
        </ul>
      </div>
    </div>
  `,
})
export class LimitsPageComponent {}
