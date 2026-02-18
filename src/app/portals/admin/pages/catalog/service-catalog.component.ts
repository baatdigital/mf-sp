/**
 * ServiceCatalogComponent - EP-SP-025
 *
 * Muestra el catalogo de servicios BillPay disponibles en la plataforma.
 * Permite filtrar por categoria y buscar por nombre.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  OnboardingCatalogService,
  BillPayService,
  BillPayCategory,
} from '../../services/onboarding-catalog.service';

interface CategoryOption {
  value: BillPayCategory | '';
  label: string;
  icon: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: '', label: 'Todos', icon: '&#128197;' },
  { value: 'electricidad', label: 'Electricidad', icon: '&#9889;' },
  { value: 'agua', label: 'Agua', icon: '&#128167;' },
  { value: 'gas', label: 'Gas', icon: '&#128293;' },
  { value: 'internet', label: 'Internet', icon: '&#127760;' },
  { value: 'tv', label: 'TV', icon: '&#128250;' },
  { value: 'recarga', label: 'Recargas', icon: '&#128241;' },
  { value: 'gobierno', label: 'Gobierno', icon: '&#127979;' },
];

const CATEGORY_ICONS: Record<BillPayCategory | 'otros', string> = {
  electricidad: '&#9889;',
  agua: '&#128167;',
  gas: '&#128293;',
  internet: '&#127760;',
  tv: '&#128250;',
  recarga: '&#128241;',
  gobierno: '&#127979;',
  otros: '&#128196;',
};

@Component({
  selector: 'sp-service-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="catalog-page">
      <header class="page-header">
        <a routerLink="/sp/admin" class="back-link">&#8592; Dashboard</a>
        <h1>Catalogo de Servicios BillPay</h1>
        <p class="subtitle">{{ filteredServices().length }} servicio(s) disponibles</p>
      </header>

      <!-- Buscador -->
      <div class="search-bar">
        <span class="search-icon">&#128269;</span>
        <input
          class="search-input"
          type="text"
          placeholder="Buscar servicio por nombre..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange()"
        />
      </div>

      <!-- Filtros de categoria -->
      <div class="category-pills">
        @for (cat of CATEGORY_OPTIONS; track cat.value) {
          <button
            class="pill"
            [class.active]="selectedCategory === cat.value"
            (click)="selectCategory(cat.value)"
          >
            <span [innerHTML]="cat.icon"></span>
            {{ cat.label }}
          </button>
        }
      </div>

      @if (isLoading()) {
        <!-- Grid skeleton -->
        <div class="services-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else if (error()) {
        <div class="error-banner">{{ error() }}</div>
      } @else if (filteredServices().length === 0) {
        <div class="empty-state">
          <p>&#128269; No se encontraron servicios con los filtros aplicados.</p>
          <button class="btn btn-outline" (click)="clearFilters()">Limpiar filtros</button>
        </div>
      } @else {
        <div class="services-grid">
          @for (service of filteredServices(); track service.service_id) {
            <div class="service-card" [class.inactive]="!service.active">
              <div class="card-icon" [innerHTML]="categoryIcon(service.category)"></div>
              <div class="card-body">
                <h3 class="service-name">{{ service.name }}</h3>
                <span class="service-id">{{ service.service_id }}</span>
                <p class="service-description">{{ service.description }}</p>
                <div class="card-footer">
                  <span class="category-pill">{{ service.category }}</span>
                  @if (!service.active) {
                    <span class="inactive-badge">Inactivo</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .catalog-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .search-bar {
      position: relative;
      margin-bottom: 16px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      color: #1e293b;
      box-sizing: border-box;
    }

    .search-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
    }

    .category-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #475569;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .pill:hover { border-color: #2563eb; color: #2563eb; }
    .pill.active {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .skeleton-card {
      height: 180px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 12px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .service-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #f1f5f9;
      transition: all 0.2s;
      display: flex;
      gap: 14px;
    }

    .service-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      transform: translateY(-2px);
    }

    .service-card.inactive {
      opacity: 0.6;
    }

    .card-icon {
      font-size: 28px;
      width: 48px;
      height: 48px;
      background: #f8fafc;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-body {
      flex: 1;
      min-width: 0;
    }

    .service-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .service-id {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
      display: block;
      margin-bottom: 6px;
    }

    .service-description {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 10px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-pill {
      padding: 2px 8px;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .inactive-badge {
      padding: 2px 8px;
      background: #fee2e2;
      color: #dc2626;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .error-banner {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-state p {
      font-size: 16px;
      margin: 0;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      padding: 8px 16px;
      transition: all 0.15s;
    }

    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .btn-outline:hover { border-color: #2563eb; color: #2563eb; }
  `],
})
export class ServiceCatalogComponent implements OnInit, OnDestroy {
  private readonly catalogService = inject(OnboardingCatalogService);
  private readonly destroy$ = new Subject<void>();

  readonly CATEGORY_OPTIONS = CATEGORY_OPTIONS;

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly allServices = signal<BillPayService[]>([]);

  /** Servicios filtrados por categoria y busqueda. */
  readonly filteredServices = computed(() => {
    let services = this.allServices();

    if (this.selectedCategory) {
      services = services.filter((s) => s.category === this.selectedCategory);
    }

    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      services = services.filter((s) =>
        s.name.toLowerCase().includes(term) ||
        s.service_id.toLowerCase().includes(term)
      );
    }

    return services;
  });

  selectedCategory: BillPayCategory | '' = '';
  searchTerm = '';

  ngOnInit(): void {
    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(category: BillPayCategory | ''): void {
    this.selectedCategory = category;
  }

  onSearchChange(): void {
    // La senial computed() reacciona automaticamente al cambio de searchTerm
  }

  clearFilters(): void {
    this.selectedCategory = '';
    this.searchTerm = '';
  }

  /** Devuelve el icono HTML de una categoria. */
  categoryIcon(category: BillPayCategory): string {
    return CATEGORY_ICONS[category] ?? CATEGORY_ICONS['otros'];
  }

  private loadCatalog(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.catalogService.getProductCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allServices.set(response.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el catalogo de servicios.');
          this.isLoading.set(false);
        },
      });
  }
}
