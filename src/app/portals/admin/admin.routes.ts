/**
 * Admin Portal Routes - Tier 1
 *
 * Rutas del portal administrativo SuperPago.
 * Requiere tier 'admin' (permiso sp:admin o rol platform_admin).
 */

import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
    title: 'Admin Dashboard | SuperPago',
  },
  {
    path: 'accounts',
    loadComponent: () =>
      import('./accounts/accounts-list.component').then(
        (m) => m.AccountsListComponent
      ),
    title: 'Cuentas Financieras | SuperPago Admin',
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('./pages/organizations/organizations-list.component').then(
        (m) => m.OrganizationsListComponent
      ),
    title: 'Organizaciones | SuperPago Admin',
  },
  {
    path: 'organizations/:orgId',
    loadComponent: () =>
      import('./pages/organizations/organization-detail.component').then(
        (m) => m.OrganizationDetailComponent
      ),
    title: 'Detalle Organizacion | SuperPago Admin',
  },
  {
    path: 'transfers',
    loadComponent: () =>
      import('./pages/transfers/global-transfers.component').then(
        (m) => m.GlobalTransfersComponent
      ),
    title: 'Transferencias | SuperPago Admin',
  },
  {
    path: 'system',
    loadComponent: () =>
      import('./pages/system/system-health.component').then(
        (m) => m.SystemHealthComponent
      ),
    title: 'Salud del Sistema | SuperPago Admin',
  },
  // EP-SP-025: Onboarding y Catalogo de Servicios
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding-list.component').then(
        (m) => m.OnboardingListComponent
      ),
    title: 'Onboarding | SuperPago Admin',
  },
  {
    path: 'onboarding/:id',
    loadComponent: () =>
      import('./pages/onboarding/onboarding-detail.component').then(
        (m) => m.OnboardingDetailComponent
      ),
    title: 'Detalle Onboarding | SuperPago Admin',
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/catalog/service-catalog.component').then(
        (m) => m.ServiceCatalogComponent
      ),
    title: 'Catalogo de Servicios | SuperPago Admin',
  },
  // EP-SP-026: BillPay Conciliacion y Monitoreo
  {
    path: 'billpay',
    loadComponent: () =>
      import('./pages/billpay/billpay-dashboard.component').then(
        (m) => m.BillpayDashboardComponent
      ),
    title: 'BillPay Monitor | SuperPago Admin',
  },
  {
    path: 'billpay/discrepancies',
    loadComponent: () =>
      import('./pages/billpay/billpay-discrepancies.component').then(
        (m) => m.BillpayDiscrepanciesComponent
      ),
    title: 'Discrepancias BillPay | SuperPago Admin',
  },
  // EP-SP-030: Notification Config Frontend
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/notification-dashboard.component').then(
        (m) => m.NotificationDashboardComponent
      ),
    title: 'Notificaciones | SuperPago Admin',
  },
];
