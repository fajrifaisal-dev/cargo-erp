import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { MfaSecurityPanel } from '@/components/auth/MfaSecurityPanel';

export const revalidate = 0;

export default async function AccountPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = (factors?.totp || [])
    .filter((f) => f.status === 'verified')
    .map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name || 'Google Authenticator',
      createdAt: f.created_at,
    }));

  const roleLabel =
    auth.activeRole === 'master_admin'
      ? 'Master Admin (Semua Tenant)'
      : auth.activeRole === 'finance'
      ? `Finance (${auth.activeCompany?.name || '-'})`
      : auth.activeRole === 'marketing'
      ? `Marketing (${auth.activeCompany?.name || '-'})`
      : 'Belum Ada Akses Tenant';

  return (
    <div>
      <ControlPanel
        title="Profil & Keamanan Akun"
        subtitle="Kelola password dan aktivasi Google Authenticator (2FA) untuk akun Anda."
      />

      <div className="p-6 max-w-4xl mx-auto">
        <MfaSecurityPanel
          username={auth.profile?.username || ''}
          email={auth.email}
          fullName={auth.profile?.full_name || ''}
          roleLabel={roleLabel}
          verifiedFactors={verifiedFactors}
        />
      </div>
    </div>
  );
}
