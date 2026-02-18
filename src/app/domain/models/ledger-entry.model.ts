/**
 * LedgerEntry - Modelo de asiento contable
 *
 * Representa un movimiento en el libro mayor de una cuenta financiera.
 * Cada transaccion genera uno o mas asientos (debito/credito).
 */

export type EntryType = 'DEBIT' | 'CREDIT';

export type EntryCategory =
  | 'SPEI_IN'
  | 'SPEI_OUT'
  | 'FEE'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'INITIAL_DEPOSIT'
  | 'INTERNAL_TRANSFER';

export interface LedgerEntry {
  entry_id: string;
  account_id: string;
  organization_id: string;
  entry_type: EntryType;
  amount: number;
  category: EntryCategory;
  concept: string;
  reference_id?: string;
  balance_after: number;
  metadata?: Record<string, string>;
  created_at: string;
}

export interface LedgerEntriesResponse {
  success: boolean;
  data: LedgerEntry[];
  total?: number;
  page?: number;
  page_size?: number;
}
