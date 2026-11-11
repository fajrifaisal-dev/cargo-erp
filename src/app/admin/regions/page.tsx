import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { getRegionsForAdmin } from '@/app/actions/regions';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { RegionManagementClient } from '@/components/admin/RegionManagementClient';

export const revalidate = 0;

export default async function AdminRegionsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.isMasterAdmin) redirect('/');

  const { regions, tableReady } = await getRegionsForAdmin();

  return (
    <div>
      <ControlPanel
        title="Master Wilayah (Kota & Provinsi)"
        subtitle="Referensi wilayah kota asal/tujuan terpusat di database untuk seluruh tenant."
        badge={`${regions.length} Wilayah`}
      />

      <div className="p-6 max-w-6xl mx-auto">
        <RegionManagementClient regions={regions} tableReady={tableReady} />
      </div>
    </div>
  );
}
