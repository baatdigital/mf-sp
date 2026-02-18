/**
 * BillpayConciliationPageComponent - EP-SP-026
 *
 * Dashboard Admin (Tier 1) para monitorear la conciliacion BillPay.
 * Muestra discrepancias, estado de conciliacion y permite resolver manualmente.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-billpay-conciliation-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Conciliacion BillPay</h1>
        <p>EP-SP-026 — Dashboard de conciliacion y resolucion de discrepancias BillPay (Tier 1 Admin).</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>US-SP-108: Dashboard de conciliacion automatica</li>
          <li>US-SP-109: Tabla de discrepancias con filtros</li>
          <li>US-SP-110: Resolucion manual de discrepancias</li>
          <li>US-SP-111: Exportacion de reportes de conciliacion</li>
          <li>US-SP-112: Alertas de discrepancias por email/Slack</li>
        </ul>
      </div>
    </div>
  `,
})
export class BillpayConciliationPageComponent {}
