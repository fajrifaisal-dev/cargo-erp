'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { safeActionErrorMessage } from '@/lib/utils';

export interface BootstrapStatus {
  hasAdminKey: boolean;
  profilesTableReady: boolean;
  hasMasterAdmin: boolean;
}

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  const adminKeyReady = hasAdminKey();
  if (!adminKeyReady) {
    return {
      hasAdminKey: false,
      profilesTableReady: false,
      hasMasterAdmin: false,
    };
  }

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_master_admin', true);

    if (error) {
      return {
        hasAdminKey: true,
        profilesTableReady: false,
        hasMasterAdmin: false,
      };
    }

    return {
      hasAdminKey: true,
      profilesTableReady: true,
      hasMasterAdmin: (count || 0) > 0,
    };
  } catch {
    return {
      hasAdminKey: adminKeyReady,
      profilesTableReady: false,
      hasMasterAdmin: false,
    };
  }
}

export async function bootstrapMasterAdmin(payload: {
  username: string;
  email: string;
  fullName: string;
  password: string;
}): Promise<{ error?: string }> {
  if (!hasAdminKey()) {
    console.error('[bootstrapMasterAdmin] Server admin configuration missing.');
    return {
      error: 'Konfigurasi server belum lengkap. Silakan hubungi administrator sistem.',
    };
  }

  const cleanUsername = payload.username.trim().toLowerCase();
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanFullName = payload.fullName.trim();

  if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
    return {
      error:
        'Username minimal 3 karakter dan hanya boleh huruf kecil, angka, titik, garis bawah, atau strip.',
    };
  }
  if (!cleanEmail.includes('@')) {
    return { error: 'Format email tidak valid.' };
  }
  if (payload.password.length < 8) {
    return { error: 'Password minimal 8 karakter.' };
  }

  const admin = createAdminClient();
  const { count, error: countErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_master_admin', true);

  if (countErr) {
    return {
      error: safeActionErrorMessage(
        'bootstrapMasterAdmin.count',
        countErr,
        'Sistem belum siap untuk setup awal. Silakan hubungi administrator.'
      ),
    };
  }
  if ((count || 0) > 0) {
    return {
      error:
        'Akun Master Admin sudah tersedia. Silakan login atau minta Master Admin menambahkan akun baru.',
    };
  }

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
    return {
      error: safeActionErrorMessage(
        'bootstrapMasterAdmin.createUser',
        createErr,
        'Gagal membuat akun admin. Silakan periksa data lalu coba lagi.'
      ),
    };
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    username: cleanUsername,
    email: cleanEmail,
    full_name: cleanFullName || cleanUsername,
    is_master_admin: true,
    is_active: true,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      error: safeActionErrorMessage(
        'bootstrapMasterAdmin.profile',
        profileErr,
        'Gagal menyimpan profil admin. Silakan coba lagi.'
      ),
    };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: payload.password,
  });

  revalidatePath('/', 'layout');
  return {};
}

export async function loginWithIdentifier(payload: {
  identifier: string;
  password: string;
}): Promise<{
  error?: string;
  mfaRequired?: boolean;
  factorId?: string;
}> {
  const raw = payload.identifier.trim().toLowerCase();
  const password = payload.password;

  if (!raw || !password) {
    return { error: 'Username/Email dan Password wajib diisi.' };
  }

  let targetEmail = raw;

  if (!raw.includes('@')) {
    if (!hasAdminKey()) {
      console.error('[loginWithIdentifier] Username login requires admin server key.');
      return {
        error:
          'Login dengan username sedang tidak tersedia. Silakan masuk menggunakan email.',
      };
    }
    const admin = createAdminClient();
    const { data: profile, error: lookupErr } = await admin
      .from('profiles')
      .select('email, is_active')
      .eq('username', raw)
      .maybeSingle();

    if (lookupErr) {
      return {
        error: safeActionErrorMessage(
          'loginWithIdentifier.lookup',
          lookupErr,
          'Terjadi kendala saat memproses login. Silakan coba beberapa saat lagi.'
        ),
      };
    }

    if (!profile) {
      return { error: 'Username atau password salah.' };
    }

    if (!profile.is_active) {
      return { error: 'Akun ini telah dinonaktifkan. Hubungi Master Admin.' };
    }

    targetEmail = profile.email;
  }

  const supabase = await createClient();
  const { data: signInData, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

  if (signInErr || !signInData.user) {
    return { error: 'Username/Email atau password salah.' };
  }

  const { data: ownProfile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', signInData.user.id)
    .maybeSingle();

  if (ownProfile && ownProfile.is_active === false) {
    await supabase.auth.signOut();
    return { error: 'Akun ini telah dinonaktifkan. Hubungi Master Admin.' };
  }

  const [{ data: aal }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
    const totpFactor = (factors?.totp || []).find((f) => f.status === 'verified');
    if (totpFactor) {
      return { mfaRequired: true, factorId: totpFactor.id };
    }
  }

  revalidatePath('/', 'layout');
  return { mfaRequired: false };
}

export async function getPendingMfaFactor(): Promise<{
  factorId: string | null;
  email: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { factorId: null, email: '' };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = (factors?.totp || []).find(
    (f) => f.status === 'verified'
  );

  return {
    factorId: verifiedTotp?.id || null,
    email: user.email || '',
  };
}

export async function verifyMfaLogin(payload: {
  factorId: string;
  code: string;
}): Promise<{ error?: string }> {
  const code = payload.code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) {
    return { error: 'Masukkan 6 digit kode OTP dari Google Authenticator.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: payload.factorId,
    code,
  });

  if (error) {
    return { error: 'Kode OTP tidak valid atau sudah kedaluwarsa.' };
  }

  revalidatePath('/', 'layout');
  return {};
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordReset(
  identifier: string
): Promise<{ error?: string; message?: string }> {
  const raw = identifier.trim().toLowerCase();
  if (!raw) {
    return { error: 'Masukkan email atau username Anda.' };
  }

  let targetEmail = raw;
  if (!raw.includes('@') && hasAdminKey()) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('username', raw)
      .maybeSingle();
    if (profile?.email) {
      targetEmail = profile.email;
    }
  }

  if (!targetEmail.includes('@')) {
    return {
      message:
        'Jika akun terdaftar, instruksi reset password akan dikirim atau hubungi Master Admin.',
    };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(targetEmail);
  return {
    message:
      'Jika email terdaftar di sistem, link reset password telah dikirim. Jika belum menerima, hubungi Master Admin untuk reset manual.',
  };
}

export async function changeMyPassword(
  newPassword: string
): Promise<{ error?: string }> {
  await requireAuth();
  if (newPassword.length < 8) {
    return { error: 'Password baru minimal 8 karakter.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return {
      error: safeActionErrorMessage(
        'changeMyPassword',
        error,
        'Gagal memperbarui password. Pastikan password memenuhi syarat keamanan.'
      ),
    };
  }

  return {};
}
