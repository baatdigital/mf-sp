/**
 * Modelos de dominio para Cuentas SP.
 * EP-SP-007: arquitectura hexagonal — capa de dominio.
 */

export type SpAccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PENDING';
export type SpAccountType = 'MASTER' | 'SUB' | 'WALLET' | 'VIRTUAL';
export type SpAccountCurrency = 'MXN' | 'USD';

export interface SpAccount {
  id: string;
  label: string;
  clabe: string;
  type: SpAccountType;
  status: SpAccountStatus;
  currency: SpAccountCurrency;
  balance: number;
  available_balance: number;
  org_id: string;
  org_name?: string;
  parent_account_id?: string;
  provider_account_id?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  children?: SpAccount[];
}

export interface SpAccountSummary {
  total_accounts: number;
  total_balance: number;
  active_accounts: number;
  frozen_accounts: number;
}
