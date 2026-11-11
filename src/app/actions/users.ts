'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { requireMasterAdmin } from '@/lib/auth';
import { safeActionErrorMessage } from '@/lib/utils';
import { Company, CompanyMembership, Profile, TenantRole } from '@/types/database';

export interface UserWithMemberships extends Profile {
  memberships: (CompanyMembership & { company?: Company })[];
}

export async function getUsersManagementData(): Promise<{
  users: UserWithMemberships[];
  companies: Company[];
  adminKeyConfigured: boolean;
}> {
  await requireMasterAdmin();
  const adminKeyConfigured = hasAdminKey();

  if (!adminKeyConfigured) {
    return { users: [], companies: [], adminKeyConfigured: false };
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: memberships }, { data: companies }] =
    await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: true }),
      admin.from('company_memberships').select('*'),
      admin.from('companies').select('*').order('name', { ascending: true }),
    ]);

  const companyList = (companies || []) as Company[];
  const companyMap = new Map(companyList.map((c) => [c.id, c]));
  const membershipList = (memberships || []) as CompanyMembership[];

  const users: UserWithMemberships[] = ((profiles || []) as Profile[]).map((p) => ({
    ...p,
    memberships: membershipList
      .filter((m) => m.user_id === p.id)
      .map((m) => ({
        ...m,
        company: companyMap.get(m.company_id),
      })),
  }));

  return { users, companies: companyList, adminKeyConfigured: true };
}

export async function createUserAccount(payload: {
  username: string;
  email: string;
  fullName: string;
  password: string;
  isMasterAdmin: boolean;
  memberships: { company_id: string; role: TenantRole }[];
}): Promise<void> {
  await requireMasterAdmin();

  const cleanUsername = payload.username.trim().toLowerCase();
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanFullName = payload.fullName.trim();

  if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
    throw new Error(
      'Username minimal 3 karakter (huruf kecil, angka, titik, underscore, atau strip).'
    );
  }
  if (!cleanEmail.includes('@')) {
    throw new Error('Format email tidak valid.');
  }
  if (payload.password.length < 8) {
    throw new Error('Password minimal 8 karakter.');
  }
  if (!payload.isMasterAdmin && payload.memberships.length === 0) {
    throw new Error(
      'User non-Master Admin wajib diberikan minimal 1 tenant ekspedisi dan role.'
    );
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      username: cleanUsername,
      full_name: cleanFullName,
    },
  });

  if (createErr || !created.user) {
    throw new Error(
      safeActionErrorMessage(
        'createUserAccount.auth',
        createErr,
        'Gagal membuat akun user baru.'
      )
    );
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    username: cleanUsername,
    email: cleanEmail,
    full_name: cleanFullName || cleanUsername,
    is_master_admin: payload.isMasterAdmin,
    is_active: true,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(
      safeActionErrorMessage(
        'createUserAccount.profile',
        profileErr,
        'Gagal menyimpan profil user.'
      )
    );
  }

  if (!payload.isMasterAdmin && payload.memberships.length > 0) {
    const rows = payload.memberships.map((m) => ({
      user_id: created.user.id,
      company_id: m.company_id,
      role: m.role,
    }));
    const { error: memErr } = await admin.from('company_memberships').insert(rows);
    if (memErr) {
      throw new Error(
        safeActionErrorMessage(
          'createUserAccount.memberships',
          memErr,
          'Akun dibuat, namun gagal menyimpan akses tenant.'
        )
      );
    }
  }

  revalidatePath('/admin/users');
}

export async function updateUserAccess(payload: {
  userId: string;
  username: string;
  fullName: string;
  isMasterAdmin: boolean;
  isActive: boolean;
  memberships: { company_id: string; role: TenantRole }[];
}): Promise<void> {
  const actor = await requireMasterAdmin();

  if (actor.userId === payload.userId && (!payload.isActive || !payload.isMasterAdmin)) {
    throw new Error(
      'Anda tidak dapat menonaktifkan akun sendiri atau mencabut role Master Admin sendiri.'
    );
  }

  const cleanUsername = payload.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
    throw new Error('Format username tidak valid.');
  }
  if (!payload.isMasterAdmin && payload.memberships.length === 0) {
    throw new Error('User non-Master Admin wajib memiliki minimal 1 tenant.');
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from('profiles')
    .update({
      username: cleanUsername,
      full_name: payload.fullName.trim() || cleanUsername,
      is_master_admin: payload.isMasterAdmin,
      is_active: payload.isActive,
    })
    .eq('id', payload.userId);

  if (updErr) {
    throw new Error(
      safeActionErrorMessage(
        'updateUserAccess.profile',
        updErr,
        'Gagal memperbarui profil user.'
      )
    );
  }

  const { error: delErr } = await admin
    .from('company_memberships')
    .delete()
    .eq('user_id', payload.userId);

  if (delErr) {
    throw new Error(
      safeActionErrorMessage(
        'updateUserAccess.clearMemberships',
        delErr,
        'Gagal memperbarui akses tenant user.'
      )
    );
  }

  if (!payload.isMasterAdmin && payload.memberships.length > 0) {
    const rows = payload.memberships.map((m) => ({
      user_id: payload.userId,
      company_id: m.company_id,
      role: m.role,
    }));
    const { error: insErr } = await admin.from('company_memberships').insert(rows);
    if (insErr) {
      throw new Error(
        safeActionErrorMessage(
          'updateUserAccess.insertMemberships',
          insErr,
          'Gagal menyimpan akses tenant user.'
        )
      );
    }
  }

  revalidatePath('/admin/users');
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  await requireMasterAdmin();
  if (newPassword.length < 8) {
    throw new Error('Password baru minimal 8 karakter.');
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'resetUserPassword',
        error,
        'Gagal mereset password user.'
      )
    );
  }
}
