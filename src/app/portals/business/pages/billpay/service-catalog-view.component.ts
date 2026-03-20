/**
 * ServiceCatalogViewComponent - Catalogo visual de servicios para pagar
 *
 * Muestra un grid de servicios agrupados por categoria (CFE, Telmex, SAT, etc.)
 * con filtros por categoria y busqueda. Al seleccionar un servicio navega
 * al flujo de pago.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BillpayServiceApi,
  BillpayService,
  BillpayCategory,
} from '../../services/billpay.service';

// Categorias disponibles con icono y etiqueta
const CATEGORY_CONFIG: Record<BillpayCategory, { label: string; icon: string }> = {
  electricidad: { label: 'Electricidad', icon: '⚡' },
  agua: { label: 'Agua', icon: '💧' },
  gas: { label: 'Gas', icon: '🔥' },
  internet: { label: 'Internet', icon: '📡' },
  tv: { label: 'TV', icon: '📺' },
  recargas: { label: 'Recargas', icon: '📱' },
  gobierno: { label: 'Gobierno', icon: '🏛️' },
};

// Catalogo estatico de fallback para desarrollo
const STATIC_CATALOG: BillpayService[] = [
  { service_id: 'CFE', name: 'CFE', category: 'electricidad', icon: '⚡', description: 'Comision Federal de Electricidad' },
  { service_id: 'CONAGUA', name: 'CONAGUA', category: 'agua', icon: '💧', description: 'Agua potable federal' },
  { service_id: 'SACMEX', name: 'SACMEX', category: 'agua', icon: '💧', description: 'Aguas de la CDMX' },
  { service_id: 'GAS_LP', name: 'Gas LP', category: 'gas', icon: '🔥', description: 'Gas licuado de petroleo' },
  { service_id: 'GAS_NATURAL', name: 'Gas Natural', category: 'gas', icon: '🔥', description: 'Gas natural por ducto' },
  { service_id: 'TELMEX', name: 'Telmex', category: 'internet', icon: '📡', description: 'Internet y telefonia fija' },
  { service_id: 'TOTALPLAY', name: 'Totalplay', category: 'internet', icon: '📡', description: 'Internet de alta velocidad' },
  { service_id: 'MEGACABLE', name: 'Megacable', category: 'internet', icon: '📡', description: 'Internet y cable' },
  { service_id: 'SKY', name: 'SKY', category: 'tv', icon: '📺', description: 'Television satelital' },
  { service_id: 'IZZI', name: 'Izzi', category: 'tv', icon: '📺', description: 'Television por cable' },
  { service_id: 'DISH', name: 'Dish', category: 'tv', icon: '📺', description: 'Television satelital' },
  { service_id: 'TELCEL', name: 'Telcel', category: 'recargas', icon: '📱', description: 'Recarga Telcel' },
  { service_id: 'ATT', name: 'AT&T', category: 'recargas', icon: '📱', description: 'Recarga AT&T' },
  { service_id: 'MOVISTAR', name: 'Movistar', category: 'recargas', icon: '📱', description: 'Recarga Movistar' },
  { service_id: 'SAT', name: 'SAT', category: 'gobierno', icon: '🏛️', description: 'Servicio de Administracion Tributaria' },
  { service_id: 'IMSS', name: 'IMSS', category: 'gobierno', icon: '🏛️', description: 'Instituto Mexicano del Seguro Social' },
  { service_id: 'INFONAVIT', name: 'INFONAVIT', category: 'gobierno', icon: '🏛️', description: 'Instituto del Fondo Nacional para la Vivienda' },
];

@Component({
  selector: 'sp-service-catalog-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="catalog-page">
      <header class="page-header">
        <a routerLink="/sp/business" class="back-link">&#8592; Portal Empresarial</a>
        <div class="header-row">
          <div>
            <h1>Pago de Servicios</h1>
            <p class="subtitle">Paga tus recibos de CFE, agua, internet, gobierno y mas</p>
          </div>
          <a routerLink="/sp/business/billpay/saved" class="btn-outline">
            Mis servicios guardados
          </a>
        </div>
      </header>

      <!-- Barra de busqueda -->
      <div class="search-bar">
        <input
          type="text"
          placeholder="Buscar servicio..."
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          class="search-input"
          aria-label="Buscar servicio"
        />
      </div>

      <!-- Filtros por categoria -->
      <div class="category-filters" role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          class="category-pill"
          [class.active]="activeCategory() === null"
          (click)="setCategory(null)"
        >
          Todos
        </button>
        @for (cat of allCategories; track cat) {
          <button
            type="button"
            class="category-pill"
            [class.active]="activeCategory() === cat"
            (click)="setCategory(cat)"
          >
            {{ categoryConfig[cat].icon }} {{ categoryConfig[cat].label }}
          </button>
        }
      </div>

      <!-- Estado de carga: skeleton -->
      @if (isLoading()) {
        <div class="skeleton-grid">
          @for (item of skeletonItems; track $index) {
            <div class="skeleton-card">
              <div class="skeleton-icon"></div>
              <div class="skeleton-name"></div>
              <div class="skeleton-desc"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>{{ error() }}</p>
          <button type="button" class="btn-retry" (click)="loadCatalog()">
            Reintentar
          </button>
        </div>
      } @else if (filteredServices().length === 0) {
        <div class="empty-state">
          <p class="empty-icon">🔍</p>
          <p>No se encontraron servicios para "{{ searchQuery() }}"</p>
          <button type="button" class="btn-outline" (click)="clearSearch()">
            Limpiar busqueda
          </button>
        </div>
      } @else {
        <!-- Grid de servicios agrupados por categoria -->
        @for (cat of visibleCategories(); track cat) {
          <section class="category-section">
            <h2 class="category-title">
              {{ categoryConfig[cat].icon }} {{ categoryConfig[cat].label }}
            </h2>
            <div class="services-grid">
              @for (svc of servicesByCategory()[cat]; track svc.service_id) {
                <button
                  type="button"
                  class="service-card"
                  (click)="selectService(svc)"
                  [attr.aria-label]="'Pagar ' + svc.name"
                >
                  <span class="service-icon">{{ svc.icon }}</span>
                  <span class="service-name">{{ svc.name }}</span>
                  <span class="service-desc">{{ svc.description }}</span>
                </button>
              }
            </div>
          </section>
        }
      }

      <!-- Acceso rapido al historial -->
      <div class="quick-links">
        <a routerLink="/sp/business/billpay/history" class="quick-link">
          Ver historial de pagos &#8594;
        </a>
      </div>
    </div>
  `,
  styles: [`
    .catalog-page {
      padding: 24px;
      max-width: 960px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 20px; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 10px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }

    .btn-outline {
      display: inline-block;
      border: 1.5px solid #2563eb;
      color: #2563eb;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }

    .search-bar {
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      color: #1e293b;
      background: white;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input:focus { border-color: #2563eb; }

    .category-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .category-pill {
      background: #f1f5f9;
      border: 1.5px solid transparent;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }

    .category-pill:hover { background: #e2e8f0; }

    .category-pill.active {
      background: #eff6ff;
      border-color: #2563eb;
      color: #2563eb;
    }

    /* Skeleton loader */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }

    .skeleton-card {
      background: #f8fafc;
      border-radius: 14px;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-icon {
      width: 40px;
      height: 40px;
      background: #e2e8f0;
      border-radius: 50%;
    }

    .skeleton-name {
      width: 60px;
      height: 14px;
      background: #e2e8f0;
      border-radius: 4px;
    }

    .skeleton-desc {
      width: 80px;
      height: 10px;
      background: #e2e8f0;
      border-radius: 4px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .error-state {
      text-align: center;
      padding: 40px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 12px;
    }

    .btn-retry {
      margin-top: 12px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #94a3b8;
    }

    .empty-icon { font-size: 36px; margin: 0 0 8px; }

    .category-section { margin-bottom: 28px; }

    .category-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .service-card {
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }

    .service-card:hover {
      border-color: #2563eb;
      box-shadow: 0 2px 10px rgba(37, 99, 235, 0.12);
      transform: translateY(-1px);
    }

    .service-icon { font-size: 26px; }

    .service-name {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    .service-desc {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.3;
    }

    .quick-links {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
    }

    .quick-link {
      color: #2563eb;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }

    /* Responsive mobile-first */
    @media (max-width: 480px) {
      .catalog-page { padding: 16px; }
      .services-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
    }
  `],
})
export class ServiceCatalogViewComponent implements OnInit {
  private readonly billpayService = inject(BillpayServiceApi);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly services = signal<BillpayService[]>([]);
  readonly activeCategory = signal<BillpayCategory | null>(null);

  // Exposicion de configuracion para la plantilla
  readonly categoryConfig = CATEGORY_CONFIG;
  readonly allCategories = Object.keys(CATEGORY_CONFIG) as BillpayCategory[];
  readonly skeletonItems = Array(12).fill(null);

  // Termino de busqueda (signal para reactividad con computed)
  readonly searchQuery = signal('');

  /**
   * Servicios filtrados por categoria activa y termino de busqueda.
   */
  readonly filteredServices = computed(() => {
    const cat = this.activeCategory();
    const query = this.searchQuery().toLowerCase().trim();
    return this.services().filter((svc) => {
      const matchesCat = cat === null || svc.category === cat;
      const matchesQuery =
        !query ||
        svc.name.toLowerCase().includes(query) ||
        svc.description.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  });

  /**
   * Agrupa los servicios filtrados por categoria para el render por seccion.
   */
  readonly servicesByCategory = computed(() => {
    const grouped: Partial<Record<BillpayCategory, BillpayService[]>> = {};
    for (const svc of this.filteredServices()) {
      if (!grouped[svc.category]) {
        grouped[svc.category] = [];
      }
      grouped[svc.category]!.push(svc);
    }
    return grouped;
  });

  /**
   * Categorias que tienen al menos un servicio en el filtro actual.
   */
  readonly visibleCategories = computed(() => {
    const grouped = this.servicesByCategory();
    return this.allCategories.filter(
      (cat) => grouped[cat] && grouped[cat]!.length > 0
    );
  });

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.billpayService.getServices().subscribe({
      next: (res) => {
        this.services.set(res.data ?? STATIC_CATALOG);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback al catalogo estatico si el API no responde
        this.services.set(STATIC_CATALOG);
        this.isLoading.set(false);
      },
    });
  }

  setCategory(cat: BillpayCategory | null): void {
    this.activeCategory.set(cat);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  selectService(svc: BillpayService): void {
    this.router.navigate(['/sp/business/billpay/pay'], {
      queryParams: {
        service_id: svc.service_id,
        service_name: svc.name,
      },
    });
  }
}
