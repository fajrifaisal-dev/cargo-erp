import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  canRoleManageInvoices,
  canRoleManageSystem,
  resolveAuthorizedCompany,
} from '@/lib/security-rules';
import {
  Company,
  CompanyMembership,
  Profile,
  TenantRole,
  UserRole,
} from '@/types/database';

export const ACTIVE_COMPANY_COOKIE = 'gema_active_company_id';

export interface AuthContext {
  userId: string;
  email: string;
  profile: Profile | null;
  isMasterAdmin: boolean;
  memberships: CompanyMembership[];
  allowedCompanies: Company[];
  activeCompanyId: string;
  activeCompany: Company | null;
  activeRole: UserRole | null;
  needsMfaVerification: boolean;
  mfaEnabled: boolean;
  canManageSystem: boolean;
  canManageInvoices: boolean;
  canViewInvoices: boolean;
  canManagePaymentStatus: boolean;
}

/**
 * Resolves the currently authenticated user, MFA status, tenant memberships,
 * active tenant context, and role-based permissions on the server.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const [{ data: aal }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  const verifiedTotp = (factors?.totp || []).filter(
    (f) => f.status === 'verified'
  );
  const mfaEnabled = verifiedTotp.length > 0;
  const needsMfaVerification =
    aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2';

  const [{ data: profileData }, { data: membershipData }, { data: companiesData }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('company_memberships')
        .select('*')
        .eq('user_id', user.id),
      supabase.from('companies').select('*').order('created_at', { ascending: true }),
    ]);

  const profile = (profileData as Profile | null) || null;
  const isMasterAdmin = Boolean(profile?.is_master_admin && profile?.is_active !== false);
  const memberships = (membershipData || []) as CompanyMembership[];
  const allCompanies = (companiesData || []) as Company[];

  const allowedCompanyIds = new Set(memberships.map((m) => m.company_id));
  const allowedCompanies = isMasterAdmin
    ? allCompanies
    : allCompanies.filter((c) => allowedCompanyIds.has(c.id));

  const cookieStore = await cookies();
  const requestedCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  const activeCompany = resolveAuthorizedCompany(
    allowedCompanies,
    requestedCompanyId
  );
  const activeCompanyId = activeCompany?.id || '';

  let activeRole: UserRole | null = null;
  if (isMasterAdmin) {
    activeRole = 'master_admin';
  } else if (activeCompanyId) {
    const match = memberships.find((m) => m.company_id === activeCompanyId);
    activeRole = (match?.role as TenantRole) || null;
  }

  const canManageInvoices = canRoleManageInvoices(activeRole);

  return {
    userId: user.id,
    email: user.email || profile?.email || '',
    profile,
    isMasterAdmin,
    memberships,
    allowedCompanies,
    activeCompanyId,
    activeCompany,
    activeRole,
    needsMfaVerification,
    mfaEnabled,
    canManageSystem: canRoleManageSystem(isMasterAdmin),
    canManageInvoices,
    canViewInvoices: Boolean(activeRole),
    canManagePaymentStatus: canManageInvoices,
  };
}

/**
 * Ensures there is a verified authenticated session (and completed MFA if enabled).
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error('Anda harus login untuk melakukan aksi ini.');
  }
  if (ctx.needsMfaVerification) {
    throw new Error('Selesaikan verifikasi Google Authenticator terlebih dahulu.');
  }
  if (ctx.profile && !ctx.profile.is_active) {
    throw new Error('Akun Anda sedang dinonaktifkan oleh Master Admin.');
  }
  return ctx;
}

/**
 * Ensures the caller is Master Admin.
 */
export async function requireMasterAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.isMasterAdmin) {
    throw new Error('Akses ditolak: fitur ini khusus Master Admin.');
  }
  return ctx;
}

/**
 * Ensures the caller has tenant access and belongs to Finance or Master Admin for invoice/payment operations.
 */
export async function requireInvoiceManager(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.activeCompanyId || !ctx.activeRole) {
    throw new Error('Anda tidak memiliki akses ke tenant ekspedisi aktif.');
  }
  if (!ctx.canManageInvoices) {
    throw new Error(
      'Akses ditolak: Role Marketing hanya dapat melihat Invoice dan tidak dapat membuat/mengubah/membayar Invoice.'
    );
  }
  return ctx;
}

/**
 * Ensures the caller has an active tenant membership (Master Admin, Finance, or Marketing).
 */
export async function requireTenantAccess(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.activeCompanyId || !ctx.activeRole) {
    throw new Error(
      'Anda belum memiliki akses ke tenant ekspedisi mana pun. Hubungi Master Admin.'
    );
  }
  return ctx;
}
