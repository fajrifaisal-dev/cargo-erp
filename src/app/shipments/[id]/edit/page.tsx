import { notFound } from 'next/navigation';
import { getShipmentById } from '@/app/actions/shipments';
import { getMembers } from '@/app/actions/members';
import { getCompanySettings } from '@/app/actions/companies';
import { getActiveRegions } from '@/app/actions/regions';
import { getTenantPrefix } from '@/lib/utils';
import { CreateShipmentForm } from '@/components/shipments/CreateShipmentForm';

export const revalidate = 0;

interface EditShipmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditShipmentPage({
  params,
}: EditShipmentPageProps) {
  const { id } = await params;
  const [shipment, members, company, regions] = await Promise.all([
    getShipmentById(id),
    getMembers(),
    getCompanySettings(),
    getActiveRegions(),
  ]);

  if (!shipment) {
    notFound();
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto">
      <CreateShipmentForm
        members={members}
        regions={regions}
        initialData={shipment}
        tenantPrefix={getTenantPrefix(shipment.company || company)}
      />
    </div>
  );
}
