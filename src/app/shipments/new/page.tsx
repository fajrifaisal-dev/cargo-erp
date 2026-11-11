import { getMembers } from '@/app/actions/members';
import { getCompanySettings } from '@/app/actions/companies';
import { getActiveRegions } from '@/app/actions/regions';
import { getTenantPrefix } from '@/lib/utils';
import { CreateShipmentForm } from '@/components/shipments/CreateShipmentForm';

export const revalidate = 0;

export default async function NewShipmentPage() {
  const [members, company, regions] = await Promise.all([
    getMembers(),
    getCompanySettings(),
    getActiveRegions(),
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <CreateShipmentForm
        members={members}
        regions={regions}
        tenantPrefix={getTenantPrefix(company)}
      />
    </div>
  );
}
