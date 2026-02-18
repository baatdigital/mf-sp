/**
 * OnboardingPageComponent - EP-SP-025
 *
 * Panel Admin (Tier 1) para gestionar el onboarding de nuevas empresas cliente.
 * Wizard 4 pasos: Datos -> Productos -> Confirmacion -> Provisionamiento.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-onboarding-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-page">
      <div class="sp-page-header">
        <h1>Onboarding de Clientes Empresa</h1>
        <p>EP-SP-025 — Wizard de alta y gestion de empresas clientes (Tier 1 Admin).</p>
      </div>
      <div class="sp-card" style="padding:24px; margin-top:16px;">
        <p>Pantalla en construccion. Implementara:</p>
        <ul>
          <li>US-SP-103: Wizard paso 1 — Datos empresa</li>
          <li>US-SP-104: Wizard paso 2 — Seleccion productos</li>
          <li>US-SP-105: Wizard paso 3 — Confirmacion</li>
          <li>US-SP-106: Estado de provisionamiento en tiempo real</li>
          <li>US-SP-107: Catalogo de productos contratables</li>
        </ul>
      </div>
    </div>
  `,
})
export class OnboardingPageComponent {}
