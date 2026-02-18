import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { FinancialAccount } from '../../../domain/models/financial-account.model';

export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  description: string;
  transferType: 'INTERNAL' | 'INTER_ORG';
}

/** Validator: positive number with max 2 decimal places */
function positiveDecimalValidator(control: AbstractControl): Record<string, boolean> | null {
  const val = control.value;
  if (val === null || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return { notPositive: true };
  if (!/^\d+(\.\d{1,2})?$/.test(String(val))) return { tooManyDecimals: true };
  return null;
}

@Component({
  selector: 'sp-transfer-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="transfer-form-container">
      <div class="form-header">
        <h3 class="form-title">
          {{ transferType === 'INTERNAL' ? 'Transferencia Interna' : 'Transferencia Inter-Org' }}
        </h3>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

        <!-- Source account -->
        <div class="field-group">
          <label class="field-label" for="sourceAccountId">Cuenta Origen *</label>
          <select
            id="sourceAccountId"
            formControlName="sourceAccountId"
            class="field-select"
            [class.field-error]="isInvalid('sourceAccountId')"
          >
            <option value="">Selecciona cuenta origen</option>
            <option
              *ngFor="let acc of sourceAccounts; trackBy: trackById"
              [value]="acc.account_id"
            >
              {{ acc.name ?? acc.account_type }} - {{ acc.account_id | slice:0:8 }}...
            </option>
          </select>
          <span class="error-msg" *ngIf="isInvalid('sourceAccountId')">
            Selecciona una cuenta origen.
          </span>
        </div>

        <!-- Destination account -->
        <div class="field-group">
          <label class="field-label" for="destinationAccountId">
            {{ transferType === 'INTERNAL' ? 'Cuenta Destino *' : 'ID Cuenta Destino *' }}
          </label>

          <!-- Internal: dropdown from same org -->
          <ng-container *ngIf="transferType === 'INTERNAL'">
            <select
              id="destinationAccountId"
              formControlName="destinationAccountId"
              class="field-select"
              [class.field-error]="isInvalid('destinationAccountId')"
            >
              <option value="">Selecciona cuenta destino</option>
              <option
                *ngFor="let acc of destinationOptions; trackBy: trackById"
                [value]="acc.account_id"
              >
                {{ acc.name ?? acc.account_type }} - {{ acc.account_id | slice:0:8 }}...
              </option>
            </select>
          </ng-container>

          <!-- Inter-org: free text input -->
          <ng-container *ngIf="transferType === 'INTER_ORG'">
            <input
              id="destinationAccountId"
              type="text"
              formControlName="destinationAccountId"
              class="field-input"
              [class.field-error]="isInvalid('destinationAccountId')"
              placeholder="ID de la cuenta destino"
            />
          </ng-container>

          <span class="error-msg" *ngIf="isInvalid('destinationAccountId')">
            Ingresa la cuenta destino.
          </span>
        </div>

        <!-- Amount -->
        <div class="field-group">
          <label class="field-label" for="amount">Monto (MXN) *</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">$</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              formControlName="amount"
              class="field-input field-input-prefixed"
              [class.field-error]="isInvalid('amount')"
              placeholder="0.00"
            />
          </div>
          <span class="error-msg" *ngIf="isInvalid('amount') && form.get('amount')?.errors?.['required']">
            El monto es obligatorio.
          </span>
          <span class="error-msg" *ngIf="isInvalid('amount') && form.get('amount')?.errors?.['notPositive']">
            El monto debe ser mayor a cero.
          </span>
          <span class="error-msg" *ngIf="isInvalid('amount') && form.get('amount')?.errors?.['tooManyDecimals']">
            Máximo 2 decimales permitidos.
          </span>
        </div>

        <!-- Description -->
        <div class="field-group">
          <label class="field-label" for="description">Descripción *</label>
          <textarea
            id="description"
            formControlName="description"
            class="field-textarea"
            [class.field-error]="isInvalid('description')"
            placeholder="Describe el motivo de la transferencia..."
            rows="3"
            maxlength="200"
          ></textarea>
          <div class="field-meta">
            <span class="error-msg" *ngIf="isInvalid('description')">
              La descripción es obligatoria (máx. 200 caracteres).
            </span>
            <span class="char-count">
              {{ form.get('description')?.value?.length ?? 0 }}/200
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="onCancel()">
            Cancelar
          </button>
          <button type="submit" class="btn-primary" [disabled]="form.invalid">
            Enviar Transferencia
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .transfer-form-container {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
    }

    .form-header {
      padding: 1rem 1.25rem;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }

    .form-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    form { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

    .field-group { display: flex; flex-direction: column; gap: 0.3rem; }

    .field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .field-input,
    .field-select,
    .field-textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #111827;
      background: #FFFFFF;
      box-sizing: border-box;
      transition: border-color 0.15s;
      outline: none;
    }

    .field-input:focus,
    .field-select:focus,
    .field-textarea:focus {
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }

    .field-error { border-color: #EF4444 !important; }

    .field-textarea { resize: vertical; min-height: 72px; }

    .input-prefix-wrap { position: relative; }
    .input-prefix {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #6B7280;
      font-size: 0.875rem;
    }
    .field-input-prefixed { padding-left: 1.75rem; }

    .field-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .error-msg { font-size: 0.75rem; color: #EF4444; }
    .char-count { font-size: 0.75rem; color: #9CA3AF; margin-left: auto; }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .btn-primary {
      padding: 0.5rem 1.25rem;
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) { background: #1D4ED8; }
    .btn-primary:disabled { background: #93C5FD; cursor: not-allowed; }

    .btn-secondary {
      padding: 0.5rem 1.25rem;
      background: #FFFFFF;
      color: #374151;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-secondary:hover { background: #F9FAFB; }
  `],
})
export class TransferFormComponent implements OnInit {
  @Input() sourceAccounts: FinancialAccount[] = [];
  @Input() transferType: 'INTERNAL' | 'INTER_ORG' = 'INTERNAL';
  @Output() transferSubmitted = new EventEmitter<TransferRequest>();
  @Output() formCancelled = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sourceAccountId: ['', Validators.required],
      destinationAccountId: ['', Validators.required],
      amount: ['', [Validators.required, positiveDecimalValidator]],
      description: ['', [Validators.required, Validators.maxLength(200)]],
    });
  }

  get destinationOptions(): FinancialAccount[] {
    const selected = this.form.get('sourceAccountId')?.value;
    return this.sourceAccounts.filter(a => a.account_id !== selected);
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.transferSubmitted.emit({
      sourceAccountId: raw['sourceAccountId'],
      destinationAccountId: raw['destinationAccountId'],
      amount: Number(raw['amount']),
      description: raw['description'],
      transferType: this.transferType,
    });
  }

  onCancel(): void {
    this.form.reset();
    this.formCancelled.emit();
  }

  trackById(_index: number, account: FinancialAccount): string {
    return account.account_id;
  }
}
