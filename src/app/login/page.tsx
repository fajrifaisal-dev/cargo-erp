import { redirect } from 'next/navigation';
import {
  getBootstrapStatus,
  getPendingMfaFactor,
} from '@/app/actions/auth';
import { getAuthContext } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export const revalidate = 0;

interface LoginPageProps {
  searchParams: Promise<{ mfa?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const auth = await getAuthContext();

  if (auth && !auth.needsMfaVerification) {
    redirect('/');
  }

  const [bootstrapStatus, pendingMfa] = await Promise.all([
    getBootstrapStatus(),
    params.mfa === '1' || auth?.needsMfaVerification
      ? getPendingMfaFactor()
      : Promise.resolve({ factorId: null, email: '' }),
  ]);

  return (
    <LoginForm
      initialMfaFactorId={pendingMfa.factorId}
      initialMfaEmail={pendingMfa.email}
      bootstrapStatus={bootstrapStatus}
    />
  );
}
