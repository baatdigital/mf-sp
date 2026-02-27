/**
 * Remote Entry Routes - MF SP (SuperPago SPEI)
 *
 * Routing multi-tier con arquitectura hexagonal.
 * EP-SP-007: US-SP-025, US-SP-026
 *
 * Estructura:
 *   /sp/           → Redirect inteligente por tier
 *   /sp/admin/*    → Portal Admin (Tier 1) — sp:admin
 *   /sp/business/* → Portal Empresa (Tier 2) — sp:business
 *   /sp/personal/* → Portal Personal (Tier 3) — sp:personal
 */
import { Routes } from '@angular/router';
import { EntryComponent } from './entry.component';
import { TierRedirectComponent } from './tier-redirect.component';

export const ENTRY_ROUTES: Routes = [
  {
    path: 'sp',
    component: EntryComponent,
    children: [
      // ─── Redirect raiz por tier ───────────────────────────────────────────
      {
        path: '',
        pathMatch: 'full',
        component: TierRedirectComponent,
        title: 'SuperPago SPEI',
      },

      // ─── TIER 1: Portal Admin (sp:admin) ─────────────────────────────────
      {
        path: 'admin',
        loadComponent: () =>
          import('../presentation/layouts/admin-layout/admin-layout.component').then(
            (m) => m.AdminLayoutComponent,
          ),
        canActivate: [() => import('../core/guards/tier.guard').then((m) => m.tierGuard('admin'))],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            title: 'Dashboard Global | SuperPago Admin',
            loadComponent: () =>
              import('../presentation/pages/admin/dashboard/admin-dashboard.component').then(
                (m) => m.AdminDashboardComponent,
              ),
          },
          {
            path: 'organizations',
            title: 'Organizaciones | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/organizations/organizations-page.component'
              ).then((m) => m.OrganizationsPageComponent),
          },
          {
            path: 'accounts/tree',
            title: 'Grafo Global | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/accounts-tree/accounts-tree-page.component'
              ).then((m) => m.AccountsTreePageComponent),
          },
          {
            path: 'providers',
            title: 'Proveedores SPEI | SuperPago Admin',
            loadComponent: () =>
              import('../presentation/pages/admin/providers/providers-page.component').then(
                (m) => m.ProvidersPageComponent,
              ),
          },
          {
            path: 'reconciliation',
            title: 'Reconciliacion | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/reconciliation/reconciliation-page.component'
              ).then((m) => m.ReconciliationPageComponent),
          },
          {
            path: 'audit',
            title: 'Audit Trail | SuperPago Admin',
            loadComponent: () =>
              import('../presentation/pages/admin/audit/audit-page.component').then(
                (m) => m.AuditPageComponent,
              ),
          },
          {
            path: 'policies',
            title: 'Politicas | SuperPago Admin',
            loadComponent: () =>
              import('../presentation/pages/admin/policies/policies-page.component').then(
                (m) => m.PoliciesPageComponent,
              ),
          },
          {
            path: 'alerts',
            title: 'Alertas | SuperPago Admin',
            loadComponent: () =>
              import('../presentation/pages/admin/alerts/alerts-page.component').then(
                (m) => m.AlertsPageComponent,
              ),
          },
          {
            path: 'dlq',
            title: 'DLQ | SuperPago Admin',
            loadComponent: () =>
              import('../presentation/pages/admin/dlq/dlq-page.component').then(
                (m) => m.DlqPageComponent,
              ),
          },
          // ─── BillPay Admin (EP-SP-025, EP-SP-026) ──────────────────────────────
          {
            path: 'billpay/providers',
            title: 'Proveedores BillPay | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/billpay-providers/billpay-providers-page.component'
              ).then((m) => m.BillPayProvidersPageComponent),
          },
          {
            path: 'billpay/reconciliation',
            title: 'Conciliacion BillPay | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/billpay-reconciliation/billpay-reconciliation-page.component'
              ).then((m) => m.BillPayReconciliationPageComponent),
          },
          // ─── Cash & Auction Config (EP-SP-020) ────────────────────────────────
          {
            path: 'cash-config',
            title: 'Config Cash & Subasta | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/cash-config/cash-config-page.component'
              ).then((m) => m.CashConfigPageComponent),
          },
          // ─── Notifications SSE Dashboard (EP-SP-030) ────────────────────────────
          {
            path: 'notifications',
            title: 'Notificaciones | SuperPago Admin',
            loadComponent: () =>
              import(
                '../presentation/pages/admin/notifications/notifications-dashboard.component'
              ).then((m) => m.NotificationsDashboardComponent),
          },
        ],
      },

      // ─── TIER 2: Portal Empresa (sp:business) ────────────────────────────
      {
        path: 'business',
        loadComponent: () =>
          import('../presentation/layouts/business-layout/business-layout.component').then(
            (m) => m.BusinessLayoutComponent,
          ),
        canActivate: [
          () => import('../core/guards/tier.guard').then((m) => m.tierGuard('business')),
        ],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            title: 'Dashboard | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/dashboard/business-dashboard.component'
              ).then((m) => m.BusinessDashboardComponent),
          },
          {
            path: 'accounts',
            title: 'Mis Cuentas | SuperPago Empresa',
            loadComponent: () =>
              import('../presentation/pages/business/accounts/accounts-page.component').then(
                (m) => m.AccountsPageComponent,
              ),
          },
          {
            path: 'accounts/new',
            title: 'Nueva Cuenta | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/accounts/create-account.component'
              ).then((m) => m.CreateAccountComponent),
          },
          {
            path: 'accounts/tree',
            title: 'Arbol de Cuentas | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/accounts/accounts-tree.component'
              ).then((m) => m.AccountsTreeComponent),
          },
          {
            path: 'accounts/:id',
            title: 'Detalle Cuenta | SuperPago Empresa',
            loadComponent: () =>
              import('../presentation/pages/business/accounts/account-detail.component').then(
                (m) => m.AccountDetailComponent,
              ),
          },
          {
            path: 'transfers/spei',
            title: 'Transferencia SPEI | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/transfers/spei-transfer.component'
              ).then((m) => m.SpeiTransferComponent),
          },
          {
            path: 'transfers/internal',
            title: 'Movimiento Interno | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/transfers/internal-transfer.component'
              ).then((m) => m.InternalTransferComponent),
          },
          {
            path: 'movements',
            title: 'Historial | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/movements/movements-page.component'
              ).then((m) => m.MovementsPageComponent),
          },
          {
            path: 'beneficiaries',
            title: 'Beneficiarios | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/beneficiaries/beneficiaries-page.component'
              ).then((m) => m.BeneficiariesPageComponent),
          },
          {
            path: 'approvals',
            title: 'Aprobaciones | SuperPago Empresa',
            loadComponent: () =>
              import(
                '../presentation/pages/business/approvals/approvals-page.component'
              ).then((m) => m.ApprovalsPageComponent),
          },
          {
            path: 'users',
            title: 'Usuarios | SuperPago Empresa',
            loadComponent: () =>
              import('../presentation/pages/business/users/users-page.component').then(
                (m) => m.UsersPageComponent,
              ),
          },
          {
            path: 'settings',
            title: 'Configuracion | SuperPago Empresa',
            loadComponent: () =>
              import('../presentation/pages/business/settings/settings-page.component').then(
                (m) => m.SettingsPageComponent,
              ),
          },
          // ─── BillPay Empresa (EP-SP-027) ────────────────────────────────
          {
            path: 'billpay',
            title: 'Pago de Servicios | SuperPago Empresa',
            loadComponent: () =>
              import('../presentation/pages/business/billpay/billpay-page.component').then(
                (m) => m.BillPayPageComponent,
              ),
          },
        ],
      },

      // ─── TIER 3: Portal Personal (sp:personal) ───────────────────────────
      {
        path: 'personal',
        loadComponent: () =>
          import('../presentation/layouts/personal-layout/personal-layout.component').then(
            (m) => m.PersonalLayoutComponent,
          ),
        canActivate: [
          () => import('../core/guards/tier.guard').then((m) => m.tierGuard('personal')),
        ],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            title: 'Mi Cuenta | SuperPago',
            loadComponent: () =>
              import(
                '../presentation/pages/personal/dashboard/personal-dashboard.component'
              ).then((m) => m.PersonalDashboardComponent),
          },
          {
            path: 'movements',
            title: 'Mis Movimientos | SuperPago',
            loadComponent: () =>
              import(
                '../presentation/pages/personal/movements/personal-movements.component'
              ).then((m) => m.PersonalMovementsComponent),
          },
          {
            path: 'transfer',
            title: 'Enviar Dinero | SuperPago',
            loadComponent: () =>
              import(
                '../presentation/pages/personal/transfer/personal-transfer.component'
              ).then((m) => m.PersonalTransferComponent),
          },
          {
            path: 'account',
            title: 'Mi Cuenta | SuperPago',
            loadComponent: () =>
              import('../presentation/pages/personal/account/personal-account.component').then(
                (m) => m.PersonalAccountComponent,
              ),
          },
          // ─── Pago de Servicios Personal (EP-SP-028) ────────────────────────
          {
            path: 'services',
            title: 'Pago de Servicios | SuperPago',
            loadComponent: () =>
              import(
                '../presentation/pages/personal/services/services-page.component'
              ).then((m) => m.ServicesPageComponent),
          },
        ],
      },
    ],
  },
];
