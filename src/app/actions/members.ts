'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { formatSupabaseError, safeActionErrorMessage } from '@/lib/utils';
import { requireTenantAccess } from '@/lib/auth';
import { Member } from '@/types/database';

export async function getMembers() {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) {
    console.warn('Warning fetching members:', formatSupabaseError(error));
    return [];
  }
  return data as Member[];
}

export async function createMember(payload: {
  name: string;
  phone?: string;
  address?: string;
  payment_term_days?: number;
  credit_limit?: number;
}) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const termDays = Math.max(0, Math.round(Number(payload.payment_term_days ?? 14)));
  const creditLimit = Math.max(0, Math.round(Number(payload.credit_limit ?? 0)));

  const { data, error } = await supabase
    .from('members')
    .insert({
      company_id: companyId,
      name: payload.name,
      phone: payload.phone || null,
      address: payload.address || null,
      payment_term_days: Number.isFinite(termDays) ? termDays : 14,
      credit_limit: Number.isFinite(creditLimit) ? creditLimit : 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      safeActionErrorMessage('createMember', error, 'Gagal menambah data member.')
    );
  }

  revalidatePath('/members');
  return data;
}

export async function updateMember(
  id: string,
  payload: {
    name: string;
    phone?: string;
    address?: string;
    payment_term_days?: number;
    credit_limit?: number;
  }
) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const termDays = Math.max(0, Math.round(Number(payload.payment_term_days ?? 14)));
  const creditLimit = Math.max(0, Math.round(Number(payload.credit_limit ?? 0)));

  const { data, error } = await supabase
    .from('members')
    .update({
      name: payload.name,
      phone: payload.phone || null,
      address: payload.address || null,
      payment_term_days: Number.isFinite(termDays) ? termDays : 14,
      credit_limit: Number.isFinite(creditLimit) ? creditLimit : 0,
    })
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId)
    .select()
    .single();

  if (error) {
    throw new Error(
      safeActionErrorMessage('updateMember', error, 'Gagal memperbarui data member.')
    );
  }

  revalidatePath('/members');
  return data;
}
