/**
 * Remote Entry Routes - MF SP (SuperPago SPEI)
 *
 * Rutas del modulo SuperPago SPEI cargadas por el Shell.
 * Cubre: EP-SP-020, EP-SP-025, EP-SP-026, EP-SP-027, EP-SP-028, EP-SP-030.
 *
 * Todas las rutas usan lazy loading para optimizar el bundle inicial.
 */
import { Routes } from '@angular/router';
import { EntryComponent } from './entry.component';

export const ENTRY_ROUTES: Routes = [
  {
    path: 'sp',
    component: EntryComponent,
    children: [
      {
        path: '',
        redirectTo: 'limits',
        pathMatch: 'full',
      },
      // EP-SP-020: Pantallas de Limites y Alertas
      {
        path: 'limits',
        title: 'Limites y Alertas | SuperPago',
        loadComponent: () =>
          import('../presentation/limits/limits-page.component').then(
            (m) => m.LimitsPageComponent,
          ),
      },
      // EP-SP-025: Admin - Onboarding de Clientes Empresa
      {
        path: 'admin/onboarding',
        title: 'Onboarding Clientes | SuperPago Admin',
        loadComponent: () =>
          import('../presentation/admin/onboarding/onboarding-page.component').then(
            (m) => m.OnboardingPageComponent,
          ),
      },
      {
        path: 'admin/onboarding/:id',
        title: 'Detalle Onboarding | SuperPago Admin',
        loadComponent: () =>
          import('../presentation/admin/onboarding/onboarding-detail.component').then(
            (m) => m.OnboardingDetailComponent,
          ),
      },
      // EP-SP-026: Admin - BillPay Conciliacion y Monitoreo
      {
        path: 'admin/billpay-conciliation',
        title: 'Conciliacion BillPay | SuperPago Admin',
        loadComponent: () =>
          import('../presentation/admin/billpay/billpay-conciliation-page.component').then(
            (m) => m.BillpayConciliationPageComponent,
          ),
      },
      // EP-SP-027: Business - Pago de Servicios
      {
        path: 'services/pay',
        title: 'Pago de Servicios | SuperPago',
        loadComponent: () =>
          import('../presentation/services/service-payment-page.component').then(
            (m) => m.ServicePaymentPageComponent,
          ),
      },
      // EP-SP-028: Personal - Mis Servicios
      {
        path: 'my-services',
        title: 'Mis Servicios | SuperPago',
        loadComponent: () =>
          import('../presentation/my-services/my-services-page.component').then(
            (m) => m.MyServicesPageComponent,
          ),
      },
      // EP-SP-030: Frontend Notificaciones y Tiempo Real
      {
        path: 'notifications',
        title: 'Notificaciones | SuperPago',
        loadComponent: () =>
          import('../presentation/notifications/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
      },
      {
        path: 'notifications/preferences',
        title: 'Preferencias de Notificacion | SuperPago',
        loadComponent: () =>
          import('../presentation/notifications/preferences-page.component').then(
            (m) => m.PreferencesPageComponent,
          ),
      },
    ],
  },
];
