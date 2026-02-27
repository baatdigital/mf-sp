/**
 * AlertsPageComponent - EP-SP-008 US-SP-036
 * Alertas de fraude, reconciliación y sistema.
 */
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

type AlertSeverity = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  source: string;
  created_at: string;
  resolved: boolean;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; bg: string; color: string }> = {
  critical: { label: 'Crítica', bg: '#fed7d7', color: '#c53030' },
  warning: { label: 'Advertencia', bg: '#fefcbf', color: '#744210' },
  info: { label: 'Info', bg: '#bee3f8', color: '#2a4365' },
};

@Component({
  selector: 'sp-admin-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="sp-alerts">
      <div class="sp-alerts__header">
        <h2 class="sp-alerts__title">Alertas del Sistema</h2>
        <span class="sp-alerts__count">{{ alerts().length }} alertas</span>
      </div>

      <div class="sp-alerts__filters">
        @for (sev of severities; track sev) {
          <button [class]="'sp-alerts__filter-btn' + (filterSeverity() === sev ? ' active' : '')"
            (click)="filterSeverity.set(sev === filterSeverity() ? null : sev)">
            {{ SEVERITY_CONFIG[sev].label }}
          </button>
        }
        <button class="sp-alerts__filter-btn" (click)="showResolved.set(!showResolved())">
          {{ showResolved() ? 'Ocultar resueltas' : 'Mostrar resueltas' }}
        </button>
      </div>

      <div class="sp-alerts__list">
        @for (alert of filteredAlerts(); track alert.id) {
          <div [class]="'sp-alerts__item' + (alert.resolved ? ' resolved' : '')">
            <div class="sp-alerts__item-left">
              <span class="sp-alerts__badge"
                [style]="'background:' + SEVERITY_CONFIG[alert.severity].bg + ';color:' + SEVERITY_CONFIG[alert.severity].color">
                {{ SEVERITY_CONFIG[alert.severity].label }}
              </span>
              <div class="sp-alerts__item-body">
                <span class="sp-alerts__item-message">{{ alert.message }}</span>
                <span class="sp-alerts__item-meta">{{ alert.source }} · {{ alert.created_at | date:'dd/MM/yy HH:mm' }}</span>
              </div>
            </div>
            @if (!alert.resolved) {
              <button class="sp-alerts__resolve-btn" (click)="resolve(alert.id)">Resolver</button>
            } @else {
              <span class="sp-alerts__resolved-chip">Resuelta</span>
            }
          </div>
        }
        @if (filteredAlerts().length === 0) {
          <div class="sp-alerts__empty">Sin alertas con los filtros actuales</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sp-alerts { max-width: 900px; }
    .sp-alerts__header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .sp-alerts__title { font-size: 20px; font-weight: 700; color: #2d3748; margin: 0; }
    .sp-alerts__count { font-size: 13px; background: #e2e8f0; padding: 2px 10px; border-radius: 12px; }
    .sp-alerts__filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .sp-alerts__filter-btn { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 20px; background: white; font-size: 12px; cursor: pointer; }
    .sp-alerts__filter-btn.active { background: #3182ce; color: white; border-color: #3182ce; }
    .sp-alerts__list { display: flex; flex-direction: column; gap: 8px; }
    .sp-alerts__item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; gap: 12px; }
    .sp-alerts__item.resolved { opacity: 0.5; }
    .sp-alerts__item-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; }
    .sp-alerts__badge { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .sp-alerts__item-body { display: flex; flex-direction: column; gap: 2px; }
    .sp-alerts__item-message { font-size: 13px; color: #2d3748; font-weight: 500; }
    .sp-alerts__item-meta { font-size: 11px; color: #a0aec0; }
    .sp-alerts__resolve-btn { padding: 6px 14px; background: #3182ce; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap; }
    .sp-alerts__resolved-chip { font-size: 11px; color: #38a169; font-weight: 600; white-space: nowrap; }
    .sp-alerts__empty { text-align: center; padding: 40px; color: #a0aec0; }
  `],
})
export class AlertsPageComponent {
  readonly SEVERITY_CONFIG = SEVERITY_CONFIG;
  readonly severities: AlertSeverity[] = ['critical', 'warning', 'info'];
  readonly filterSeverity = signal<AlertSeverity | null>(null);
  readonly showResolved = signal(false);

  readonly alerts = signal<Alert[]>([
    { id: '1', severity: 'critical', message: 'Transferencia de $450,000 bloqueada por regla anti-fraude (org: ACME)', source: 'Motor de Fraude', created_at: '2026-02-27T09:12:00Z', resolved: false },
    { id: '2', severity: 'warning', message: 'Discrepancia de $1,234.50 detectada en conciliación STP del día anterior', source: 'Reconciliación', created_at: '2026-02-27T08:45:00Z', resolved: false },
    { id: '3', severity: 'info', message: 'Proveedor STP reporta mantenimiento programado 23:00-01:00 hrs', source: 'Proveedores', created_at: '2026-02-27T08:00:00Z', resolved: false },
    { id: '4', severity: 'critical', message: '3 intentos fallidos de login admin en 5 minutos (IP: 192.168.1.100)', source: 'Auth', created_at: '2026-02-26T22:30:00Z', resolved: true },
    { id: '5', severity: 'warning', message: 'Organización BETA S.A. supera el 90% de su límite mensual ($180,000/$200,000)', source: 'Límites', created_at: '2026-02-26T16:20:00Z', resolved: false },
  ]);

  get filteredAlerts() {
    return () => {
      let result = this.alerts();
      if (!this.showResolved()) result = result.filter((a) => !a.resolved);
      if (this.filterSeverity()) result = result.filter((a) => a.severity === this.filterSeverity());
      return result;
    };
  }

  resolve(id: string): void {
    this.alerts.update((list) => list.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  }
}
