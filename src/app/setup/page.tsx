import { redirect } from 'next/navigation';
import { getBootstrapStatus } from '@/app/actions/auth';
import { SetupForm } from '@/components/auth/SetupForm';

export const revalidate = 0;

export default async function SetupPage() {
  const status = await getBootstrapStatus();

  if (status.hasMasterAdmin) {
    redirect('/login');
  }

  return <SetupForm />;
}
