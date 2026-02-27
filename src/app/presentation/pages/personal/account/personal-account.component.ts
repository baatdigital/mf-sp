/**
 * PersonalAccountComponent
 *
 * Detalle de la cuenta personal del usuario.
 * Muestra la tarjeta de cuenta y la información de perfil del usuario.
 * EP-SP-012: US-SP-046
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AccountDetailCardComponent, AccountCardData } from '../../../shared/account-detail-card/account-detail-card.component';

interface PerfilUsuario {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_registro: string;
}

const MOCK_CUENTA: AccountCardData = {
  id: 'acc-personal-001',
  display_name: 'Mi cuenta personal',
  account_type: 'CLABE',
  status: 'ACTIVE',
  clabe: '012180015151515151',
  available_balance: 12450.75,
  pending_balance: 0,
  currency: 'MXN',
  created_at: '2025-06-15T09:00:00',
};

const MOCK_PERFIL: PerfilUsuario = {
  nombre: 'Carlos',
  apellido: 'Mendoza',
  email: 'carlos.mendoza@email.com',
  telefono: '+52 55 1234 5678',
  fecha_registro: '2025-06-15T09:00:00',
};

@Component({
  selector: 'sp-personal-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, AccountDetailCardComponent],
  template: `
    <div class="sp-personal-account">

      <header class="sp-personal-account__header">
        <h1 class="sp-personal-account__title">Mi cuenta</h1>
        <p class="sp-personal-account__subtitle">Información de tu cuenta y perfil</p>
      </header>

      <!-- Tarjeta de cuenta -->
      <section class="sp-personal-account__section">
        <sp-account-detail-card
          [account]="cuenta()"
          tier="personal"
          [showActions]="false"
          [showBalance]="true"
        />
      </section>

      <!-- Perfil del usuario -->
      <section class="sp-personal-account__section">
        <div class="sp-personal-account__card">
          <h2 class="sp-personal-account__card-title">Información personal</h2>

          <div class="sp-personal-account__perfil-avatar">
            <div class="sp-personal-account__avatar-circle">
              {{ perfil().nombre.charAt(0) }}{{ perfil().apellido.charAt(0) }}
            </div>
            <div class="sp-personal-account__avatar-name">
              {{ perfil().nombre }} {{ perfil().apellido }}
            </div>
          </div>

          <div class="sp-personal-account__perfil-datos">
            <div class="sp-personal-account__dato-row">
              <span class="sp-personal-account__dato-label">Nombre completo</span>
              <span class="sp-personal-account__dato-valor">{{ perfil().nombre }} {{ perfil().apellido }}</span>
            </div>
            <div class="sp-personal-account__dato-row">
              <span class="sp-personal-account__dato-label">Correo electrónico</span>
              <span class="sp-personal-account__dato-valor">{{ perfil().email }}</span>
            </div>
            <div class="sp-personal-account__dato-row">
              <span class="sp-personal-account__dato-label">Teléfono</span>
              <span class="sp-personal-account__dato-valor">{{ perfil().telefono }}</span>
            </div>
            <div class="sp-personal-account__dato-row">
              <span class="sp-personal-account__dato-label">Miembro desde</span>
              <span class="sp-personal-account__dato-valor">{{ perfil().fecha_registro | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .sp-personal-account {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 16px 32px;
      background: #f0f4f8;
      min-height: 100vh;
    }

    /* Header */
    .sp-personal-account__header {
      margin-bottom: 20px;
    }
    .sp-personal-account__title {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
      color: #2d3748;
    }
    .sp-personal-account__subtitle {
      margin: 0;
      font-size: 13px;
      color: #718096;
    }

    /* Sections */
    .sp-personal-account__section {
      margin-bottom: 16px;
    }

    /* Card wrapper */
    .sp-personal-account__card {
      background: white;
      border-radius: 16px;
      padding: 20px 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .sp-personal-account__card-title {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 700;
      color: #2d3748;
    }

    /* Avatar de perfil */
    .sp-personal-account__perfil-avatar {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-personal-account__avatar-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%);
      color: white;
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(49, 130, 206, 0.3);
    }
    .sp-personal-account__avatar-name {
      font-size: 16px;
      font-weight: 700;
      color: #2d3748;
    }

    /* Datos de perfil */
    .sp-personal-account__perfil-datos {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .sp-personal-account__dato-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f4f8;
    }
    .sp-personal-account__dato-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .sp-personal-account__dato-label {
      font-size: 11px;
      font-weight: 600;
      color: #a0aec0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sp-personal-account__dato-valor {
      font-size: 14px;
      color: #2d3748;
      font-weight: 500;
    }
  `],
})
export class PersonalAccountComponent {
  readonly cuenta = signal<AccountCardData>(MOCK_CUENTA);
  readonly perfil = signal<PerfilUsuario>(MOCK_PERFIL);
}
