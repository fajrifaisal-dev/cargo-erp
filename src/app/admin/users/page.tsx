import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { getUsersManagementData } from '@/app/actions/users';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { UserManagementClient } from '@/components/admin/UserManagementClient';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.isMasterAdmin) redirect('/');

  const { users, companies, adminKeyConfigured } = await getUsersManagementData();

  return (
    <div>
      <ControlPanel
        title="Manajemen User & Hak Akses Tenant"
        subtitle="Kelola Master Admin serta role staf Finance dan Marketing per ekspedisi."
        badge={`${users.length} User`}
      />

      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
        <UserManagementClient
          users={users}
          companies={companies}
          adminKeyConfigured={adminKeyConfigured}
        />
      </div>
    </div>
  );
}
