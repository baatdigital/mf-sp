/**
 * FinancialAccount - Modelo de cuenta financiera
 *
 * Representa una cuenta dentro del sistema de pagos SuperPago.
 * Las cuentas pueden ser concentradoras, CLABEs privadas, reservadas, etc.
 */

export type AccountType =
  | 'CONCENTRADORA'
  | 'CLABE_PRIVADA'
  | 'RESERVADA_NOMINA'
  | 'RESERVADA_PAGOS'
  | 'RESERVADA_IMPUESTOS'
  | 'OPERATIVA';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface FinancialAccount {
  account_id: string;
  organization_id: string;
  account_type: AccountType;
  status: AccountStatus;
  balance: number;
  available_balance: number;
  clabe?: string;
  name?: string;
  parent_account_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface AccountBalance {
  account_id: string;
  balance: number;
  available_balance: number;
  frozen_balance: number;
  currency: string;
  updated_at: string;
}

export interface AccountsListResponse {
  success: boolean;
  data: FinancialAccount[];
  total?: number;
}

export interface AccountResponse {
  success: boolean;
  data: FinancialAccount;
}
