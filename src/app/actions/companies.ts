'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_COMPANY_ID,
  formatSupabaseError,
  safeActionErrorMessage,
} from '@/lib/utils';
import {
  ACTIVE_COMPANY_COOKIE,
  getAuthContext,
  requireAuth,
  requireMasterAdmin,
} from '@/lib/auth';
import { Company } from '@/types/database';

export async function checkDatabaseStatus(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('shipments').select('id').limit(1);
  if (error) {
    console.warn('[checkDatabaseStatus]', formatSupabaseError(error));
    return {
      ok: false,
      error: 'Terjadi kendala saat menghubungkan ke layanan data.',
    };
  }
  return { ok: true };
}

export async function getCompanies(): Promise<Company[]> {
  const auth = await getAuthContext();
  if (!auth || auth.needsMfaVerification) {
    return [];
  }
  return auth.allowedCompanies;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const auth = await requireAuth();
  const match = auth.allowedCompanies.find((c) => c.id === id);
  if (!match && !auth.isMasterAdmin) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.warn('Warning fetching company by id:', formatSupabaseError(error));
    return null;
  }
  return data as Company;
}

export async function getCompanySettings(): Promise<Company | null> {
  const auth = await getAuthContext();
  if (!auth || auth.needsMfaVerification) {
    return null;
  }
  return auth.activeCompany;
}

export async function setActiveCompany(companyId: string) {
  const auth = await requireAuth();
  const allowed =
    auth.isMasterAdmin || auth.allowedCompanies.some((c) => c.id === companyId);
  if (!allowed) {
    throw new Error('Anda tidak memiliki akses ke ekspedisi ini.');
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}

export async function createCompany(payload: {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  bank_account?: string;
  brand_color?: string;
  brand_accent?: string;
}) {
  await requireMasterAdmin();
  const supabase = await createClient();

  const cleanSlug = payload.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: payload.name.trim(),
      slug: cleanSlug || `exp-${Date.now().toString().slice(-5)}`,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
      logo_url: payload.logo_url?.trim() || null,
      bank_account: payload.bank_account?.trim() || null,
      brand_color: payload.brand_color || '#4F46E5',
      brand_accent: payload.brand_accent || '#4338CA',
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'createCompany',
        error,
        'Gagal menambahkan data ekspedisi.'
      )
    );
  }

  revalidatePath('/admin/expeditions');
  revalidatePath('/', 'layout');
  return data as Company;
}

export async function updateCompanyById(
  id: string,
  payload: Partial<Company>
) {
  await requireMasterAdmin();
  const supabase = await createClient();

  const updateFields: Record<string, unknown> = {
    name: payload.name,
    phone: payload.phone || null,
    address: payload.address || null,
    logo_url: payload.logo_url || null,
    bank_account: payload.bank_account || null,
    brand_color: payload.brand_color || '#4F46E5',
    brand_accent: payload.brand_accent || '#4338CA',
  };

  if (payload.slug) {
    updateFields.slug = payload.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'updateCompanyById',
        error,
        'Gagal memperbarui data ekspedisi.'
      )
    );
  }

  revalidatePath('/admin/expeditions');
  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return data as Company;
}

export async function updateCompanySettings(payload: Partial<Company>) {
  const auth = await requireMasterAdmin();
  return updateCompanyById(auth.activeCompanyId || DEFAULT_COMPANY_ID, payload);
}

export async function deleteCompany(id: string) {
  const auth = await requireMasterAdmin();
  const supabase = await createClient();
  const activeId = auth.activeCompanyId;

  const { error } = await supabase.from('companies').delete().eq('id', id);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'deleteCompany',
        error,
        'Gagal menghapus data ekspedisi.'
      )
    );
  }

  if (activeId === id) {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_COMPANY_COOKIE);
  }

  revalidatePath('/admin/expeditions');
  revalidatePath('/', 'layout');
}
