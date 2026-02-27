/**
 * SharedStateService
 *
 * Estado global compartido entre todos los tiers de mf-sp.
 * Usa Angular Signals para reactividad sin RxJS.
 * EP-SP-007: US-SP-028
 */
import { Injectable, signal, computed } from '@angular/core';

export interface SpUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
  org_id?: string;
  org_name?: string;
}

export type ActiveTier = 'admin' | 'business' | 'personal' | null;

@Injectable({ providedIn: 'root' })
export class SharedStateService {
  // Usuario autenticado
  readonly currentUser = signal<SpUser | null>(null);

  // Tier activo detectado por permisos
  readonly activeTier = computed<ActiveTier>(() => {
    const user = this.currentUser();
    if (!user) return null;
    if (user.permissions.includes('sp:admin')) return 'admin';
    if (user.permissions.includes('sp:business')) return 'business';
    if (user.permissions.includes('sp:personal')) return 'personal';
    return null;
  });

  // Cuenta seleccionada actualmente
  readonly selectedAccountId = signal<string | null>(null);

  // Indicador global de carga
  readonly globalLoading = signal(false);

  // Mensaje de error global
  readonly globalError = signal<string | null>(null);

  // Inicializar desde localStorage
  initialize(): void {
    try {
      const raw = localStorage.getItem('covacha:user');
      if (raw) {
        const parsed = JSON.parse(raw) as SpUser;
        this.currentUser.set(parsed);
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }

  setUser(user: SpUser): void {
    this.currentUser.set(user);
  }

  clearUser(): void {
    this.currentUser.set(null);
    this.selectedAccountId.set(null);
  }

  selectAccount(id: string): void {
    this.selectedAccountId.set(id);
  }

  setError(message: string): void {
    this.globalError.set(message);
    setTimeout(() => this.globalError.set(null), 5000);
  }
}
