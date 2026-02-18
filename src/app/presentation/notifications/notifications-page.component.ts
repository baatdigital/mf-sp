/**
 * NotificationsPageComponent - EP-SP-030
 *
 * Centro de notificaciones financieras en tiempo real via SSE.
 * Tier 1 (Admin) ve todas las notificaciones; Tier 2/3 ven las propias.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-notifications-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Notificaciones</h1>
        <p>EP-SP-030 — Centro de notificaciones financieras en tiempo real (SSE).</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>Feed en tiempo real via SSE (EventSource)</li>
          <li>Filtros por tipo de evento (SPEI, BillPay, Cash, Limites)</li>
          <li>Historial de notificaciones con paginacion</li>
          <li>Estado de entrega por canal (email, WhatsApp, webhook)</li>
          <li>Reenvio manual de notificaciones fallidas</li>
        </ul>
      </div>
    </div>
  `,
})
export class NotificationsPageComponent {}
