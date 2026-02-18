/**
 * ServicesCatalogComponent - Catalogo de servicios por categoria (Personal / B2C)
 *
 * Muestra un grid de categorias con emojis. Al seleccionar una categoria
 * muestra la lista de servicios de esa categoria. Navegacion interna con signal.
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
import { RouterModule } from '@angular/router';
import { ServicesBillpayService, BillpayService } from '../../services/services-billpay.service';

interface Category {
  id: string;
  emoji: string;
  label: string;
}

const CATEGORIES: Category[] = [
  { id: 'electricity', emoji: '⚡', label: 'Electricidad' },
  { id: 'water',       emoji: '💧', label: 'Agua' },
  { id: 'gas',         emoji: '🔥', label: 'Gas' },
  { id: 'mobile',      emoji: '📱', label: 'Recargas' },
  { id: 'internet',    emoji: '📡', label: 'Internet' },
  { id: 'other',       emoji: '🏛️', label: 'Mas servicios' },
];

@Component({
  selector: 'sp-services-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="catalog-page">
      <header class="page-header">
        @if (selectedCategory()) {
          <button class="back-btn" (click)="clearCategory()">&#8592; Categorias</button>
          <h1>{{ selectedCategory()!.label }}</h1>
        } @else {
          <a routerLink="/sp/personal/services" class="back-link">&#8592; Mis Servicios</a>
          <h1>¿Que quieres pagar?</h1>
          <p class="subtitle">Selecciona una categoria</p>
        }
      </header>

      <!-- Error global -->
      @if (error()) {
        <div class="error-banner" role="alert">&#9888; {{ error() }}</div>
      }

      <!-- Vista: Grid de categorias -->
      @if (!selectedCategory()) {
        <div class="category-grid">
          @for (cat of categories; track cat.id) {
            <button class="category-tile" (click)="selectCategory(cat)">
              <span class="tile-emoji">{{ cat.emoji }}</span>
              <span class="tile-label">{{ cat.label }}</span>
            </button>
          }
        </div>
      }

      <!-- Vista: Lista de servicios de la categoria seleccionada -->
      @if (selectedCategory()) {
        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Cargando servicios...</span>
          </div>
        } @else if (filteredServices().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>No hay servicios en esta categoria.</p>
          </div>
        } @else {
          <div class="services-list">
            @for (svc of filteredServices(); track svc.service_id) {
              <a
                class="service-row"
                [routerLink]="['/sp/personal/services/pay']"
                [queryParams]="{ service_id: svc.service_id, name: svc.name, emoji: svc.emoji }"
              >
                <span class="svc-emoji">{{ svc.emoji }}</span>
                <span class="svc-name">{{ svc.name }}</span>
                <span class="chevron">&#8250;</span>
              </a>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .catalog-page {
      padding: 20px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 28px; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      display: block;
      margin-bottom: 8px;
    }

    .back-link:hover { color: #2563eb; }

    .back-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 13px;
      cursor: pointer;
      padding: 0;
      display: block;
      margin-bottom: 8px;
      min-height: 44px;
    }

    .back-btn:hover { color: #2563eb; }

    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }

    .subtitle { color: #64748b; font-size: 14px; margin: 0; }

    /* Error banner */
    .error-banner {
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 14px;
      margin-bottom: 16px;
    }

    /* Category grid 2x3 */
    .category-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .category-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 16px;
      cursor: pointer;
      min-height: 100px;
      transition: all 0.15s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .category-tile:hover {
      border-color: #93c5fd;
      background: #eff6ff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37,99,235,0.1);
    }

    .tile-emoji { font-size: 36px; }

    .tile-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      text-align: center;
    }

    /* Loading state */
    .loading-state {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #94a3b8;
      font-size: 14px;
      padding: 24px 0;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }

    .empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }
    .empty-state p { font-size: 14px; margin: 0; }

    /* Services list */
    .services-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .service-row {
      display: flex;
      align-items: center;
      gap: 14px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      text-decoration: none;
      min-height: 56px;
      transition: all 0.15s;
    }

    .service-row:hover {
      border-color: #93c5fd;
      background: #f0f9ff;
    }

    .svc-emoji { font-size: 22px; flex-shrink: 0; }

    .svc-name {
      flex: 1;
      font-size: 15px;
      font-weight: 500;
      color: #1e293b;
    }

    .chevron {
      font-size: 20px;
      color: #cbd5e1;
      flex-shrink: 0;
    }
  `],
})
export class ServicesCatalogComponent implements OnInit {
  private readonly billpayService = inject(ServicesBillpayService);

  readonly categories = CATEGORIES;
  readonly selectedCategory = signal<Category | null>(null);
  readonly allServices = signal<BillpayService[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filteredServices = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return [];
    return this.allServices().filter((s) => s.category === cat.id);
  });

  ngOnInit(): void {
    this.loadServices();
  }

  selectCategory(cat: Category): void {
    this.selectedCategory.set(cat);
  }

  clearCategory(): void {
    this.selectedCategory.set(null);
  }

  private loadServices(): void {
    this.isLoading.set(true);
    this.billpayService.getServices().subscribe({
      next: (response) => {
        this.allServices.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catalogo. Intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
