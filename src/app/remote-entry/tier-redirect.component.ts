/**
 * TierRedirectComponent
 *
 * Componente de redireccion inteligente por tier.
 * Se monta en /sp/ y redirige al portal correcto segun el tier del usuario.
 * EP-SP-007: US-SP-026
 */
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'sp-tier-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#718096;">
      <div style="text-align:center">
        <div style="font-size:32px;margin-bottom:12px">⚡</div>
        <p style="margin:0">Redirigiendo...</p>
      </div>
    </div>
  `,
})
export class TierRedirectComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    // Determinar tier leyendo permisos desde localStorage
    const userRaw = localStorage.getItem('covacha:user');
    let permissions: string[] = [];

    try {
      if (userRaw) {
        const user = JSON.parse(userRaw) as { permissions?: string[] };
        permissions = user.permissions ?? [];
      }
    } catch {
      permissions = [];
    }

    if (permissions.includes('sp:admin')) {
      this.router.navigate(['/sp/admin/dashboard']);
    } else if (permissions.includes('sp:business')) {
      this.router.navigate(['/sp/business/dashboard']);
    } else if (permissions.includes('sp:personal')) {
      this.router.navigate(['/sp/personal/dashboard']);
    } else {
      // Sin permisos SPEI: ir a dashboard general
      this.router.navigate(['/']);
    }
  }
}
