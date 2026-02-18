/**
 * ServicePaymentPageComponent - EP-SP-027
 *
 * Flujo de pago de servicios para empresas (Tier 2 B2B).
 * Permite pagar CFE, Telmex, agua, gas y otros servicios publicos.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-service-payment-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Pago de Servicios</h1>
        <p>EP-SP-027 — Flujo de pago de CFE, Telmex, agua y servicios publicos (Tier 2 Business).</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>US-SP-113: Catalogo de servicios por categoria</li>
          <li>US-SP-114: Busqueda de cuenta de servicio por numero</li>
          <li>US-SP-115: Flujo de pago con confirmacion</li>
          <li>US-SP-116: Comprobante de pago descargable</li>
        </ul>
      </div>
    </div>
  `,
})
export class ServicePaymentPageComponent {}
