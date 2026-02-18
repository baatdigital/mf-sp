/**
 * Business Portal Routes - Tier 2
 *
 * Rutas del portal empresarial B2B SuperPago.
 * Requiere tier 'business' (permiso sp:business o rol org_admin).
 */

import { Routes } from '@angular/router';

export const BUSINESS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/business-dashboard.component').then(
        (m) => m.BusinessDashboardPageComponent
      ),
    title: 'Portal Empresarial | SuperPago',
  },
  {
    path: 'accounts',
    loadComponent: () =>
      import('./pages/accounts/accounts-overview.component').then(
        (m) => m.AccountsOverviewComponent
      ),
    title: 'Cuentas | SuperPago Business',
  },
  {
    path: 'transfers/spei',
    loadComponent: () =>
      import('./pages/transfers/spei-transfer.component').then(
        (m) => m.SpeiTransferComponent
      ),
    title: 'Transferencia SPEI | SuperPago Business',
  },
  {
    path: 'movements',
    loadComponent: () =>
      import('./pages/movements/movements-history.component').then(
        (m) => m.MovementsHistoryComponent
      ),
    title: 'Movimientos | SuperPago Business',
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./pages/reports/business-reports.component').then(
        (m) => m.BusinessReportsComponent
      ),
    title: 'Reportes | SuperPago Business',
  },
  // Ruta legacy: mantener compatibilidad con transfers-list existente
  {
    path: 'transfers',
    loadComponent: () =>
      import('./transfers/transfers-list.component').then(
        (m) => m.TransfersListComponent
      ),
    title: 'Transferencias | SuperPago Business',
  },

  // EP-SP-025: Cash Auction - Marketplace de Liquidez
  {
    path: 'cash-auction',
    loadComponent: () =>
      import('./pages/cash-auction/cash-auction-dashboard.component').then(
        (m) => m.CashAuctionDashboardComponent
      ),
    title: 'Marketplace de Liquidez | SuperPago Business',
  },
  {
    path: 'cash-auction/post',
    loadComponent: () =>
      import('./pages/cash-auction/post-offer.component').then(
        (m) => m.PostOfferComponent
      ),
    title: 'Publicar Oferta | SuperPago Business',
  },
  {
    path: 'cash-auction/reserve/:offerId',
    loadComponent: () =>
      import('./pages/cash-auction/reserve-offer.component').then(
        (m) => m.ReserveOfferComponent
      ),
    title: 'Reservar Oferta | SuperPago Business',
  },
  {
    path: 'cash-auction/confirm/:offerId',
    loadComponent: () =>
      import('./pages/cash-auction/confirm-offer.component').then(
        (m) => m.ConfirmOfferComponent
      ),
    title: 'Confirmar Retiro | SuperPago Business',
  },

  // EP-SP-027: BillPay - Pago de Servicios B2B
  {
    path: 'billpay',
    loadComponent: () =>
      import('./pages/billpay/service-catalog-view.component').then(
        (m) => m.ServiceCatalogViewComponent
      ),
    title: 'Pago de Servicios | SuperPago Business',
  },
  {
    path: 'billpay/pay',
    loadComponent: () =>
      import('./pages/billpay/pay-service.component').then(
        (m) => m.PayServiceComponent
      ),
    title: 'Pagar Servicio | SuperPago Business',
  },
  {
    path: 'billpay/history',
    loadComponent: () =>
      import('./pages/billpay/billpay-history.component').then(
        (m) => m.BillpayHistoryComponent
      ),
    title: 'Historial de Servicios | SuperPago Business',
  },
  {
    path: 'billpay/saved',
    loadComponent: () =>
      import('./pages/billpay/saved-services.component').then(
        (m) => m.SavedServicesComponent
      ),
    title: 'Servicios Guardados | SuperPago Business',
  },

  // EP-SP-030: Notification Config Frontend
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/notification-settings.component').then(
        (m) => m.NotificationSettingsComponent
      ),
    title: 'Configurar Notificaciones | SuperPago',
  },
];
