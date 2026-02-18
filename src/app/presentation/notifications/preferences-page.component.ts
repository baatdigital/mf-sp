/**
 * PreferencesPageComponent - EP-SP-030
 *
 * Configuracion de preferencias de notificacion por canal.
 * Admin: configura globales + webhooks B2B; B2C: toggles personales.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-preferences-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Preferencias de Notificacion</h1>
        <p>EP-SP-030 — Configuracion de canales: webhook, email, WhatsApp, SMS, Slack.</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>Configurador de webhook con HMAC secret y test de conectividad</li>
          <li>Toggles por canal y tipo de evento</li>
          <li>Quiet hours (horario sin notificaciones no criticas)</li>
          <li>Preferencias granulares por usuario (override de globales)</li>
          <li>Estado del circuit breaker por organizacion</li>
        </ul>
      </div>
    </div>
  `,
})
export class PreferencesPageComponent {}
