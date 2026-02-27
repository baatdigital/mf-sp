/**
 * BeneficiariesPageComponent
 *
 * Gestion de beneficiarios guardados (CLABEs frecuentes) de la organizacion.
 * EP-SP-011: US-SP-044
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Beneficiary {
  id: string;
  name: string;
  clabe: string;
  bank: string;
  alias: string;
  created_at: string;
  category?: string;
}

interface NewBeneficiaryForm {
  name: string;
  clabe: string;
  bank: string;
  alias: string;
}

@Component({
  selector: 'sp-beneficiaries-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="sp-beneficiaries">

      <!-- Header -->
      <div class="sp-beneficiaries__header">
        <div>
          <h1 class="sp-beneficiaries__title">Beneficiarios</h1>
          <p class="sp-beneficiaries__subtitle">
            CLABEs frecuentes guardadas · {{ beneficiaries().length }} registros
          </p>
        </div>
        <button (click)="toggleAddForm()" class="sp-beneficiaries__btn sp-beneficiaries__btn--primary">
          @if (showAddForm()) { Cancelar } @else { + Agregar beneficiario }
        </button>
      </div>

      <!-- Formulario inline para agregar -->
      @if (showAddForm()) {
        <div class="sp-beneficiaries__add-form">
          <h3 class="sp-beneficiaries__add-form-title">Nuevo beneficiario</h3>
          <div class="sp-beneficiaries__add-form-grid">
            <div class="sp-beneficiaries__field">
              <label>Nombre completo <span class="sp-beneficiaries__required">*</span></label>
              <input
                type="text"
                [value]="newForm().name"
                (input)="updateNewForm('name', $any($event.target).value)"
                placeholder="Nombre o razon social"
                class="sp-beneficiaries__input"
                [class.sp-beneficiaries__input--error]="formTouched() && !newForm().name"
              />
            </div>
            <div class="sp-beneficiaries__field">
              <label>Alias (opcional)</label>
              <input
                type="text"
                [value]="newForm().alias"
                (input)="updateNewForm('alias', $any($event.target).value)"
                placeholder="Nombre corto para mostrar"
                class="sp-beneficiaries__input"
              />
            </div>
            <div class="sp-beneficiaries__field">
              <label>CLABE (18 digitos) <span class="sp-beneficiaries__required">*</span></label>
              <input
                type="text"
                [value]="newForm().clabe"
                (input)="updateNewForm('clabe', $any($event.target).value)"
                maxlength="18"
                placeholder="000000000000000000"
                class="sp-beneficiaries__input"
                [class.sp-beneficiaries__input--error]="formTouched() && newForm().clabe.length !== 18"
              />
              @if (formTouched() && newForm().clabe.length > 0 && newForm().clabe.length !== 18) {
                <span class="sp-beneficiaries__error">La CLABE debe tener 18 digitos</span>
              }
            </div>
            <div class="sp-beneficiaries__field">
              <label>Banco <span class="sp-beneficiaries__required">*</span></label>
              <input
                type="text"
                [value]="newForm().bank"
                (input)="updateNewForm('bank', $any($event.target).value)"
                placeholder="Ej. BBVA, Santander, Banorte"
                class="sp-beneficiaries__input"
              />
            </div>
          </div>
          <div class="sp-beneficiaries__add-form-actions">
            <button (click)="toggleAddForm()" class="sp-beneficiaries__btn sp-beneficiaries__btn--secondary">
              Cancelar
            </button>
            <button (click)="saveBeneficiary()" class="sp-beneficiaries__btn sp-beneficiaries__btn--primary">
              Guardar beneficiario
            </button>
          </div>
        </div>
      }

      <!-- Busqueda -->
      <div class="sp-beneficiaries__search-wrap">
        <input
          type="text"
          [value]="searchTerm()"
          (input)="searchTerm.set($any($event.target).value)"
          placeholder="Buscar por nombre, alias o CLABE..."
          class="sp-beneficiaries__search"
        />
        @if (searchTerm()) {
          <button (click)="searchTerm.set('')" class="sp-beneficiaries__search-clear">✕</button>
        }
      </div>

      <!-- Lista de beneficiarios -->
      @if (filteredBeneficiaries().length === 0) {
        <div class="sp-beneficiaries__empty">
          @if (searchTerm()) {
            <p>Sin resultados para "{{ searchTerm() }}"</p>
          } @else {
            <p>No hay beneficiarios guardados.</p>
            <p>Agrega un beneficiario para agilizar tus transferencias.</p>
          }
        </div>
      } @else {
        <div class="sp-beneficiaries__list">
          @for (ben of filteredBeneficiaries(); track ben.id) {
            <div class="sp-beneficiaries__card">
              <div class="sp-beneficiaries__card-avatar">
                {{ initials(ben.name) }}
              </div>
              <div class="sp-beneficiaries__card-info">
                <div class="sp-beneficiaries__card-top">
                  <strong class="sp-beneficiaries__card-name">{{ ben.alias || ben.name }}</strong>
                  @if (ben.alias && ben.alias !== ben.name) {
                    <span class="sp-beneficiaries__card-fullname">{{ ben.name }}</span>
                  }
                  <span class="sp-beneficiaries__card-bank">{{ ben.bank }}</span>
                </div>
                <div class="sp-beneficiaries__card-clabe">{{ formatClabe(ben.clabe) }}</div>
                <div class="sp-beneficiaries__card-date">
                  Agregado el {{ ben.created_at | date:'d MMM yyyy':'':'es' }}
                </div>
              </div>
              <div class="sp-beneficiaries__card-actions">
                <a
                  [routerLink]="['/sp/business/transfers/spei']"
                  [queryParams]="{ clabe: ben.clabe, name: ben.name }"
                  class="sp-beneficiaries__action-btn sp-beneficiaries__action-btn--transfer"
                  title="Transferir a este beneficiario">
                  ↗ Transferir
                </a>
                <button
                  (click)="deleteBeneficiary(ben.id)"
                  class="sp-beneficiaries__action-btn sp-beneficiaries__action-btn--delete"
                  title="Eliminar beneficiario">
                  Eliminar
                </button>
              </div>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .sp-beneficiaries { padding: 24px; max-width: 900px; margin: 0 auto; font-family: system-ui, sans-serif; }

    /* Header */
    .sp-beneficiaries__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .sp-beneficiaries__title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 4px; }
    .sp-beneficiaries__subtitle { font-size: 13px; color: #718096; margin: 0; }

    /* Buttons */
    .sp-beneficiaries__btn {
      padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; display: inline-flex; align-items: center; text-decoration: none;
    }
    .sp-beneficiaries__btn--primary { background: #3182ce; color: white; }
    .sp-beneficiaries__btn--primary:hover { background: #2b6cb0; }
    .sp-beneficiaries__btn--secondary { background: white; color: #4a5568; border: 1px solid #e2e8f0; }
    .sp-beneficiaries__btn--secondary:hover { background: #f7fafc; }

    /* Add form */
    .sp-beneficiaries__add-form {
      background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 20px; margin-bottom: 20px;
    }
    .sp-beneficiaries__add-form-title { font-size: 14px; font-weight: 700; color: #2d3748; margin: 0 0 16px; }
    .sp-beneficiaries__add-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .sp-beneficiaries__field { display: flex; flex-direction: column; gap: 4px; }
    .sp-beneficiaries__field label { font-size: 12px; font-weight: 600; color: #4a5568; }
    .sp-beneficiaries__required { color: #e53e3e; }
    .sp-beneficiaries__input {
      padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 7px;
      font-size: 14px; outline: none; background: white;
    }
    .sp-beneficiaries__input:focus { border-color: #3182ce; }
    .sp-beneficiaries__input--error { border-color: #e53e3e; }
    .sp-beneficiaries__error { font-size: 11px; color: #e53e3e; }
    .sp-beneficiaries__add-form-actions { display: flex; gap: 8px; justify-content: flex-end; }

    /* Search */
    .sp-beneficiaries__search-wrap { position: relative; margin-bottom: 16px; }
    .sp-beneficiaries__search {
      width: 100%; padding: 9px 36px 9px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 14px; outline: none; box-sizing: border-box;
    }
    .sp-beneficiaries__search:focus { border-color: #3182ce; }
    .sp-beneficiaries__search-clear {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      border: none; background: none; cursor: pointer; font-size: 12px; color: #718096;
    }

    /* List */
    .sp-beneficiaries__list { display: flex; flex-direction: column; gap: 10px; }
    .sp-beneficiaries__card {
      display: flex; align-items: center; gap: 14px;
      background: white; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 14px 16px; transition: box-shadow 0.15s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .sp-beneficiaries__card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.08); }

    /* Avatar */
    .sp-beneficiaries__card-avatar {
      width: 40px; height: 40px; background: #e9d8fd; color: #553c9a;
      border-radius: 50%; font-size: 14px; font-weight: 700; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }

    /* Info */
    .sp-beneficiaries__card-info { flex: 1; min-width: 0; }
    .sp-beneficiaries__card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .sp-beneficiaries__card-name { font-size: 14px; color: #2d3748; }
    .sp-beneficiaries__card-fullname { font-size: 11px; color: #a0aec0; }
    .sp-beneficiaries__card-bank {
      font-size: 10px; padding: 1px 8px; background: #e2e8f0; color: #4a5568;
      border-radius: 10px; font-weight: 600;
    }
    .sp-beneficiaries__card-clabe { font-size: 12px; color: #718096; font-family: monospace; margin-top: 4px; }
    .sp-beneficiaries__card-date { font-size: 11px; color: #a0aec0; margin-top: 2px; }

    /* Actions */
    .sp-beneficiaries__card-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .sp-beneficiaries__action-btn {
      padding: 5px 12px; border-radius: 7px; font-size: 12px; font-weight: 600;
      cursor: pointer; text-decoration: none; border: none;
    }
    .sp-beneficiaries__action-btn--transfer { background: #ebf8ff; color: #2c5282; }
    .sp-beneficiaries__action-btn--transfer:hover { background: #bee3f8; }
    .sp-beneficiaries__action-btn--delete { background: #fff5f5; color: #c53030; }
    .sp-beneficiaries__action-btn--delete:hover { background: #fed7d7; }

    /* Empty */
    .sp-beneficiaries__empty { text-align: center; padding: 48px 24px; color: #a0aec0; }
    .sp-beneficiaries__empty p { margin: 4px 0; font-size: 14px; }

    @media (max-width: 640px) {
      .sp-beneficiaries__add-form-grid { grid-template-columns: 1fr; }
      .sp-beneficiaries__card { flex-wrap: wrap; }
      .sp-beneficiaries__card-actions { width: 100%; justify-content: flex-end; }
    }
  `],
})
export class BeneficiariesPageComponent {
  readonly showAddForm = signal(false);
  readonly formTouched = signal(false);
  readonly searchTerm = signal('');

  readonly newForm = signal<NewBeneficiaryForm>({
    name: '',
    clabe: '',
    bank: '',
    alias: '',
  });

  readonly beneficiaries = signal<Beneficiary[]>([
    { id: 'ben-001', name: 'Proveedor ABC SA de CV', clabe: '002180700254789652', bank: 'BBVA Bancomer', alias: 'Proveedor ABC', created_at: '2026-01-15' },
    { id: 'ben-002', name: 'Maria Elena Gutierrez Lopez', clabe: '014180100123456783', bank: 'Santander', alias: 'Maria Elena', created_at: '2026-01-22' },
    { id: 'ben-003', name: 'Constructora del Valle SA de CV', clabe: '072180000123456787', bank: 'Banorte', alias: 'Constructora Valle', created_at: '2026-02-03' },
    { id: 'ben-004', name: 'GNP Seguros SA', clabe: '044180001234567892', bank: 'ScotiaBank', alias: 'GNP Seguros', created_at: '2026-02-10' },
  ]);

  readonly filteredBeneficiaries = computed<Beneficiary[]>(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.beneficiaries();
    return this.beneficiaries().filter((b) =>
      b.name.toLowerCase().includes(term) ||
      b.alias.toLowerCase().includes(term) ||
      b.clabe.includes(term)
    );
  });

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
    this.formTouched.set(false);
    this.newForm.set({ name: '', clabe: '', bank: '', alias: '' });
  }

  updateNewForm(field: keyof NewBeneficiaryForm, value: string): void {
    this.newForm.update((current) => ({ ...current, [field]: value }));
  }

  saveBeneficiary(): void {
    this.formTouched.set(true);
    const form = this.newForm();
    if (!form.name || form.clabe.length !== 18) return;

    const newBen: Beneficiary = {
      id: `ben-${Date.now()}`,
      name: form.name,
      clabe: form.clabe,
      bank: form.bank || 'Banco desconocido',
      alias: form.alias || form.name,
      created_at: new Date().toISOString().split('T')[0],
    };

    this.beneficiaries.update((list) => [newBen, ...list]);
    this.toggleAddForm();
  }

  deleteBeneficiary(id: string): void {
    this.beneficiaries.update((list) => list.filter((b) => b.id !== id));
  }

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  formatClabe(clabe: string): string {
    // Formato: XXX X XXXXXX XXXXXXXXXX X (agrupacion visual)
    return clabe.replace(/(\d{3})(\d{1})(\d{6})(\d{6})(\d{2})/, '$1 $2 $3 $4 $5');
  }
}
