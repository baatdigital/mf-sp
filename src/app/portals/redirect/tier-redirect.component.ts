/**
 * TierRedirectComponent - Redireccion automatica por tier
 *
 * Detecta el tier del usuario y redirige al portal correspondiente.
 * Punto de entrada cuando el usuario accede a /sp sin especificar tier.
 */

import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TierDetectionService } from '@core/services/tier-detection.service';
import { SharedStateService } from '@shared-state';

@Component({
  selector: 'sp-tier-redirect',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="redirect-container">
      <div class="spinner"></div>
      <p>Detectando acceso...</p>
    </div>
  `,
  styles: [`
    .redirect-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8fafc;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    p {
      color: #64748b;
      font-size: 14px;
    }
  `],
})
export class TierRedirectComponent implements OnInit {
  private readonly tierService = inject(TierDetectionService);
  private readonly sharedState = inject(SharedStateService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Refrescar estado antes de detectar tier
    this.sharedState.rehydrate();
    this.redirectToTierPortal();
  }

  private redirectToTierPortal(): void {
    if (!this.sharedState.isAuthenticated()) {
      window.location.href = '/auth';
      return;
    }

    const tier = this.tierService.detectTier();

    switch (tier) {
      case 'admin':
        this.router.navigate(['/sp/admin']);
        break;
      case 'business':
        this.router.navigate(['/sp/business']);
        break;
      case 'personal':
        this.router.navigate(['/sp/personal']);
        break;
      default:
        // Sin tier conocido: redirigir a inicio del shell
        this.router.navigate(['/']);
    }
  }
}
