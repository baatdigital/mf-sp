/**
 * Modelos de dominio para Organizaciones SP.
 * EP-SP-007: arquitectura hexagonal — capa de dominio.
 */

export type SpOrgStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'CLOSED';
export type SpOrgTier = 'ENTERPRISE' | 'BUSINESS' | 'STARTER';

export interface SpOrganization {
  id: string;
  name: string;
  rfc?: string;
  legal_name?: string;
  status: SpOrgStatus;
  tier: SpOrgTier;
  account_count: number;
  user_count: number;
  total_balance: number;
  created_at: string;
  updated_at?: string;
}

export interface SpBeneficiary {
  id: string;
  name: string;
  clabe: string;
  bank?: string;
  alias?: string;
  org_id: string;
  created_at: string;
  last_used_at?: string;
}

export interface SpOrgUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'operator' | 'readonly' | 'approver';
  status: 'active' | 'invited' | 'suspended';
  org_id: string;
  last_login?: string;
  created_at: string;
}
