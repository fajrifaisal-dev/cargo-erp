import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { getMembers } from '@/app/actions/members';
import { getShipments } from '@/app/actions/shipments';
import { CreateInvoiceForm } from '@/components/invoices/CreateInvoiceForm';

export const revalidate = 0;

export default async function NewInvoicePage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.canManageInvoices) {
    redirect('/invoices');
  }

  const [members, shipments] = await Promise.all([
    getMembers(),
    getShipments({ paymentStatus: 'all' }),
  ]);

  return (
    <div className="p-6">
      <CreateInvoiceForm members={members} unbilledShipments={shipments} />
    </div>
  );
}
