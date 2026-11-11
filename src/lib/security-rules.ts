import { UserRole } from '@/types/database';

/**
 * Validates and rounds monetary inputs (>= 0, finite).
 */
export function sanitizeNonNegativeAmount(value: unknown, label: string): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${label} tidak valid (harus angka >= 0).`);
  }
  return Math.round(num);
}

/**
 * Validates positive-or-zero float dimensions/weights (>= 0, finite).
 */
export function sanitizeNonNegativeFloat(value: unknown, label: string): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${label} tidak valid (harus angka >= 0).`);
  }
  return num;
}

/**
 * Validates invoice discount does not exceed subtotal.
 */
export function computeValidatedInvoiceTotal(
  subtotal: number,
  rawDiscount: unknown
): { discount: number; total: number } {
  const safeSubtotal = sanitizeNonNegativeAmount(subtotal, 'Subtotal tagihan');
  const discount = sanitizeNonNegativeAmount(rawDiscount, 'Diskon');
  if (discount > safeSubtotal) {
    throw new Error('Diskon tidak boleh melebihi subtotal tagihan.');
  }
  return {
    discount,
    total: Math.max(0, safeSubtotal - discount),
  };
}

/**
 * RBAC: Master Admin and Finance can create/edit/pay invoices or mark shipments Paid.
 * Marketing has read-only access to invoices.
 */
export function canRoleManageInvoices(role: UserRole | null): boolean {
  return role === 'master_admin' || role === 'finance';
}

/**
 * RBAC: Only Master Admin can manage tenants, users, roles, and regions.
 */
export function canRoleManageSystem(isMasterAdmin: boolean): boolean {
  return Boolean(isMasterAdmin);
}

/**
 * Prevents cross-tenant cookie tampering by only allowing companies in the user's allowlist.
 */
export function resolveAuthorizedCompany<T extends { id: string }>(
  allowedCompanies: T[],
  requestedCompanyId?: string | null
): T | null {
  if (!allowedCompanies || allowedCompanies.length === 0) {
    return null;
  }
  if (requestedCompanyId) {
    const match = allowedCompanies.find((c) => c.id === requestedCompanyId);
    if (match) return match;
  }
  return allowedCompanies[0];
}
