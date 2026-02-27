/**
 * Modelos de dominio para Transacciones/Transferencias SP.
 * EP-SP-007: arquitectura hexagonal — capa de dominio.
 */

export type SpTransactionType =
  | 'SPEI_OUT'
  | 'SPEI_IN'
  | 'INTERNAL_TRANSFER'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'FEE'
  | 'REVERSAL';

export type SpTransactionStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'REVERSED';

export interface SpTransaction {
  id: string;
  type: SpTransactionType;
  status: SpTransactionStatus;
  amount: number;
  currency: string;
  concept: string;
  reference?: string;
  source_account_id: string;
  source_clabe?: string;
  destination_clabe?: string;
  destination_name?: string;
  org_id: string;
  tracking_code?: string;
  error_message?: string;
  commission?: number;
  iva?: number;
  created_at: string;
  completed_at?: string;
  created_by?: string;
}

export interface SpTransactionFilter {
  from_date?: string;
  to_date?: string;
  status?: SpTransactionStatus;
  type?: SpTransactionType;
  account_id?: string;
  page?: number;
  page_size?: number;
}

export interface SpTransactionPage {
  items: SpTransaction[];
  total: number;
  page: number;
  page_size: number;
}
