/**
 * TierDetectionService - MF SP
 *
 * Detecta el nivel de acceso del usuario (tier) basado en sus permisos y roles.
 *
 * Tiers disponibles:
 * - admin:    Administrador SuperPago (permiso sp:admin o rol platform_admin)
 * - business: Empresa cliente B2B (permiso sp:business o rol org_admin)
 * - personal: Usuario final B2C (permiso sp:personal o rol end_user)
 * - unknown:  Sin tier detectado
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { SharedStateService } from '@shared-state';

export type Tier = 'admin' | 'business' | 'personal' | 'unknown';

@Injectable({ providedIn: 'root' })
export class TierDetectionService {
  private readonly sharedState = inject(SharedStateService);

  private readonly _tier = signal<Tier>('unknown');
  readonly currentTier = this._tier.asReadonly();

  readonly isAdmin = computed(() => this._tier() === 'admin');
  readonly isBusiness = computed(() => this._tier() === 'business');
  readonly isPersonal = computed(() => this._tier() === 'personal');

  /**
   * Detecta el tier del usuario desde el estado compartido.
   * La jerarquia de prioridad es: admin > business > personal.
   */
  detectTier(): Tier {
    const permissions = this.sharedState.permissions();
    const roles = this.sharedState.roles();
    const isSuperAdmin = this.sharedState.isSuperAdmin();

    const tier = this.resolveTier(permissions, roles, isSuperAdmin);
    this._tier.set(tier);
    return tier;
  }

  /**
   * Resuelve el tier basado en permisos y roles.
   * Separado para facilitar testing.
   */
  resolveTier(permissions: string[], roles: string[], isSuperAdmin: boolean): Tier {
    if (isSuperAdmin || permissions.includes('sp:admin') || roles.includes('platform_admin')) {
      return 'admin';
    }

    if (permissions.includes('sp:business') || roles.includes('org_admin')) {
      return 'business';
    }

    if (permissions.includes('sp:personal') || roles.includes('end_user')) {
      return 'personal';
    }

    return 'unknown';
  }
}
