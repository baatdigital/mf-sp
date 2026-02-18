/**
 * Transfer - Modelos de transferencias SPEI
 *
 * Representa transferencias bancarias via SPEI dentro del sistema SuperPago.
 */

export type TransferStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export interface SpeiTransfer {
  transfer_id: string;
  organization_id: string;
  source_account_id: string;
  destination_clabe: string;
  destination_name: string;
  destination_bank?: string;
  amount: number;
  concept: string;
  reference?: string;
  status: TransferStatus;
  tracking_key?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface CreateTransferRequest {
  source_account_id: string;
  destination_clabe: string;
  destination_name: string;
  destination_bank?: string;
  amount: number;
  concept: string;
  reference?: string;
}

export interface TransferResponse {
  success: boolean;
  data: SpeiTransfer;
}

export interface TransfersListResponse {
  success: boolean;
  data: SpeiTransfer[];
  total?: number;
}
