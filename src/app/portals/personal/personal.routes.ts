/**
 * Personal Portal Routes - Tier 3
 *
 * Rutas del portal personal B2C SuperPago.
 * Requiere tier 'personal' (permiso sp:personal o rol end_user).
 */

import { Routes } from '@angular/router';

export const PERSONAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/personal-dashboard.component').then(
        (m) => m.PersonalDashboardComponent
      ),
    title: 'Mi Cuenta | SuperPago',
  },

  // Historial de movimientos
  {
    path: 'movements',
    loadComponent: () =>
      import('./pages/movements/personal-movements.component').then(
        (m) => m.PersonalMovementsComponent
      ),
    title: 'Mis Movimientos | SuperPago',
  },

  // Enviar dinero (SPEI saliente)
  {
    path: 'send',
    loadComponent: () =>
      import('./pages/send-money/send-money.component').then(
        (m) => m.SendMoneyComponent
      ),
    title: 'Enviar Dinero | SuperPago',
  },

  // Recibir dinero (mostrar CLABE)
  {
    path: 'receive',
    loadComponent: () =>
      import('./pages/receive-money/receive-money.component').then(
        (m) => m.ReceiveMoneyComponent
      ),
    title: 'Recibir Dinero | SuperPago',
  },

  // Perfil del usuario
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/personal-profile.component').then(
        (m) => m.PersonalProfileComponent
      ),
    title: 'Mi Perfil | SuperPago',
  },

  // EP-SP-028: Mis Servicios (BillPay B2C)
  {
    path: 'services',
    loadComponent: () =>
      import('./pages/services/services-home.component').then(
        (m) => m.ServicesHomeComponent
      ),
    title: 'Mis Servicios | SuperPago',
  },
  {
    path: 'services/catalog',
    loadComponent: () =>
      import('./pages/services/services-catalog.component').then(
        (m) => m.ServicesCatalogComponent
      ),
    title: 'Catálogo de Servicios | SuperPago',
  },
  {
    path: 'services/pay',
    loadComponent: () =>
      import('./pages/services/pay-service-personal.component').then(
        (m) => m.PayServicePersonalComponent
      ),
    title: 'Pagar Servicio | SuperPago',
  },
  {
    path: 'services/history',
    loadComponent: () =>
      import('./pages/services/services-history.component').then(
        (m) => m.ServicesHistoryComponent
      ),
    title: 'Historial de Servicios | SuperPago',
  },

  // EP-SP-020: Cash routes
  {
    path: 'cash',
    loadComponent: () =>
      import('./pages/cash/cash-dashboard.component').then(
        (m) => m.CashDashboardComponent
      ),
    title: 'Efectivo | SuperPago',
  },
  {
    path: 'cash/deposit',
    loadComponent: () =>
      import('./pages/cash/cash-in.component').then(
        (m) => m.CashInComponent
      ),
    title: 'Depositar Efectivo | SuperPago',
  },
  {
    path: 'cash/withdraw/request',
    loadComponent: () =>
      import('./pages/cash/cash-out-request.component').then(
        (m) => m.CashOutRequestComponent
      ),
    title: 'Retirar Efectivo | SuperPago',
  },
  {
    path: 'cash/withdraw/confirm',
    loadComponent: () =>
      import('./pages/cash/cash-out-confirm.component').then(
        (m) => m.CashOutConfirmComponent
      ),
    title: 'Confirmar Retiro | SuperPago',
  },

  // EP-SP-030: Notification Config Frontend
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/notification-preferences.component').then(
        (m) => m.NotificationPreferencesComponent
      ),
    title: 'Mis Notificaciones | SuperPago',
  },
];
