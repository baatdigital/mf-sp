/**
 * ReceiveMoneyComponent - Muestra la CLABE personal para recibir dinero (B2C)
 *
 * Permite al usuario compartir su CLABE interbancaria para recibir transferencias.
 * Incluye boton de copiar, share nativo y QR placeholder.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedStateService } from '@shared-state';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { FinancialAccount } from '@domain/models/financial-account.model';

@Component({
  selector: 'sp-receive-money',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="receive-page">
      <header class="page-header">
        <a routerLink="/sp/personal" class="back-link">&#8592; Mi Cuenta</a>
        <h1>Recibir Dinero</h1>
        <p class="subtitle">Comparte tu CLABE para que te transfieran</p>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando datos de cuenta...</p>
        </div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <p>&#9888; {{ error() }}</p>
          <button class="btn-retry" (click)="reload()">Reintentar</button>
        </div>
      } @else if (!account()) {
        <div class="no-account-state">
          <p>No tienes una cuenta activa. Contacta a soporte.</p>
        </div>
      } @else {
        <!-- Tarjeta CLABE -->
        <div class="clabe-card">
          <div class="card-header">
            <span class="card-label">Tu CLABE Interbancaria</span>
          </div>

          <!-- QR placeholder -->
          <div class="qr-section">
            <img
              class="qr-placeholder"
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNGMUY1RjkiLz48dGV4dCB4PSI2MCIgeT0iNjAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTRBM0I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5RUiBQcm94aW1hbWVudGU8L3RleHQ+PC9zdmc+"
              alt="Codigo QR de tu CLABE - disponible proximamente"
              width="120"
              height="120"
            />
            <p class="qr-caption">QR proximamente</p>
          </div>

          <!-- CLABE grande y formateada -->
          <div class="clabe-display">
            <span class="clabe-formatted" aria-label="CLABE: {{ formatClabe(account()!.clabe ?? '') }}">
              {{ formatClabe(account()!.clabe ?? '') }}
            </span>
          </div>

          @if (account()!.clabe) {
            <!-- Info del titular -->
            <div class="account-info">
              <div class="info-row">
                <span class="info-label">Titular</span>
                <span class="info-value">{{ holderName() }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Banco</span>
                <span class="info-value">SuperPago</span>
              </div>
            </div>

            <!-- Acciones -->
            <div class="actions">
              <button class="action-btn copy-btn" (click)="copyClabe()" [class.copied]="copied()">
                @if (copied()) {
                  &#10003; Copiado
                } @else {
                  &#128203; Copiar CLABE
                }
              </button>
              <button class="action-btn share-btn" (click)="shareClabe()">
                &#8679; Compartir
              </button>
            </div>
          } @else {
            <div class="no-clabe">
              <p>Tu cuenta aun no tiene CLABE asignada. Contacta a soporte.</p>
            </div>
          }
        </div>

        <!-- Instrucciones -->
        <div class="instructions">
          <h2>Como recibir transferencias</h2>
          <ol class="steps-list">
            <li>Comparte tu CLABE con quien te va a enviar dinero.</li>
            <li>Pidele que realice una transferencia SPEI a tu CLABE.</li>
            <li>El dinero llega en minutos a tu cuenta SuperPago.</li>
            <li>Recibiras una notificacion cuando el deposito sea exitoso.</li>
          </ol>
        </div>
      }
    </div>
  `,
  styles: [`
    .receive-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #2563eb; }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 13px;
      margin: 0;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      color: #64748b;
      gap: 12px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Error / No account */
    .error-state, .no-account-state {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      font-size: 14px;
    }

    .error-state { color: #dc2626; }

    .btn-retry {
      margin-top: 12px;
      padding: 8px 20px;
      border: 1px solid #dc2626;
      background: none;
      color: #dc2626;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    /* Tarjeta CLABE */
    .clabe-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      overflow: hidden;
      margin-bottom: 24px;
    }

    .card-header {
      background: linear-gradient(135deg, #16a34a, #15803d);
      padding: 16px 20px;
    }

    .card-label {
      color: rgba(255,255,255,0.85);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* QR */
    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #f1f5f9;
    }

    .qr-placeholder {
      border-radius: 8px;
      display: block;
    }

    .qr-caption {
      font-size: 11px;
      color: #94a3b8;
      margin: 8px 0 0;
    }

    /* CLABE formateada */
    .clabe-display {
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
    }

    .clabe-formatted {
      font-family: 'Courier New', monospace;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: 0.1em;
      word-break: break-all;
    }

    /* Info */
    .account-info {
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .info-label {
      font-size: 13px;
      color: #94a3b8;
    }

    .info-value {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    /* Acciones */
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px 20px;
    }

    .action-btn {
      padding: 12px;
      border-radius: 10px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .copy-btn {
      background: #eff6ff;
      color: #2563eb;
    }

    .copy-btn.copied {
      background: #dcfce7;
      color: #16a34a;
    }

    .copy-btn:hover:not(.copied) { background: #dbeafe; }

    .share-btn {
      background: #f0fdf4;
      color: #16a34a;
    }

    .share-btn:hover { background: #dcfce7; }

    /* No clabe */
    .no-clabe {
      padding: 20px;
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
    }

    /* Instrucciones */
    .instructions {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .instructions h2 {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 14px;
    }

    .steps-list {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .steps-list li {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
    }
  `],
})
export class ReceiveMoneyComponent implements OnInit {
  private readonly sharedState = inject(SharedStateService);
  private readonly accountsAdapter = inject(AccountsAdapter);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly account = signal<FinancialAccount | null>(null);
  readonly copied = signal(false);
  readonly holderName = signal<string>('');

  ngOnInit(): void {
    this.holderName.set(this.sharedState.currentUser().name ?? 'Tu nombre');
    this.loadAccount();
  }

  reload(): void {
    this.error.set(null);
    this.isLoading.set(true);
    this.loadAccount();
  }

  /** Formatea la CLABE en bloques: XX-XXXX-XXXX-XXXXXXXXXX */
  formatClabe(clabe: string): string {
    if (!clabe || clabe.length !== 18) return clabe;
    return `${clabe.slice(0, 2)}-${clabe.slice(2, 6)}-${clabe.slice(6, 10)}-${clabe.slice(10)}`;
  }

  copyClabe(): void {
    const clabe = this.account()?.clabe;
    if (!clabe) return;

    navigator.clipboard.writeText(clabe).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    }).catch(() => {
      // Fallback para browsers sin clipboard API
      this.fallbackCopy(clabe);
    });
  }

  shareClabe(): void {
    const clabe = this.account()?.clabe;
    const name = this.holderName();
    if (!clabe) return;

    const text = `Mi CLABE interbancaria SuperPago:\n${clabe}\nTitular: ${name}`;

    if (navigator.share) {
      navigator.share({ title: 'Mi CLABE SuperPago', text }).catch(() => {
        // Usuario cancelo el share - ignorar
      });
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      });
    }
  }

  private loadAccount(): void {
    const orgId = this.sharedState.currentOrganizationId();
    if (!orgId) {
      this.isLoading.set(false);
      return;
    }

    this.accountsAdapter.getAccounts(orgId).subscribe({
      next: (response) => {
        const accounts = response.data ?? [];
        const active = accounts.find((a) => a.status === 'ACTIVE') ?? null;
        this.account.set(active);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudo cargar la informacion de tu cuenta. Intente de nuevo.');
      },
    });
  }

  private fallbackCopy(text: string): void {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
