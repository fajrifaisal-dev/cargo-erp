import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { getCompanySettings } from '@/app/actions/companies';
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

export default async function SettingsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.isMasterAdmin) redirect('/');

  const company = await getCompanySettings();

  return (
    <div>
      <ControlPanel
        title="Pengaturan Ekspedisi & Tema Brand"
        subtitle="Profil resmi perusahaan dan warna tema aplikasi (otomatis diterapkan ke seluruh UI & cetakan dokumen)."
      />

      <div className="p-3.5 sm:p-6 max-w-4xl mx-auto text-xs">
        <CompanySettingsForm key={company?.id || 'default'} company={company} />
      </div>
    </div>
  );
}
