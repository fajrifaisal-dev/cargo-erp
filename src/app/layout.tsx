import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { getAuthContext } from '@/lib/auth';
import { getContrastTextColor } from '@/lib/utils';

const cairo = Cairo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export async function generateMetadata(): Promise<Metadata> {
  const auth = await getAuthContext();
  const isAuthenticated = Boolean(auth && !auth.needsMfaVerification);
  const company = isAuthenticated ? auth?.activeCompany || null : null;

  return {
    title: company?.name
      ? `${company.name} | Cargo ERP`
      : 'Cargo ERP | Multi-Tenant Logistics Management System',
    description:
      'Multi-Tenant Industrial Cargo & Expedition Logistics ERP System',
  };
}

export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthContext();
  const isAuthenticated = Boolean(auth && !auth.needsMfaVerification);
  const company = isAuthenticated ? auth?.activeCompany || null : null;
  const companies = isAuthenticated ? auth?.allowedCompanies || [] : [];

  const brandPrimary = company?.brand_color || '#EAB308';
  const brandAccent = company?.brand_accent || '#CA8A04';
  const brandForeground = getContrastTextColor(brandPrimary);
  const companyName = company?.name || 'Cargo ERP';
  const activeCompanyId = company?.id || '';

  return (
    <html lang="id" className={cairo.variable}>
      <body
        className="font-sans bg-[#F8FAFC] text-[#111827] min-h-screen antialiased"
        style={
          {
            '--brand-primary': brandPrimary,
            '--brand-accent': brandAccent,
            '--brand-foreground': brandForeground,
          } as React.CSSProperties
        }
      >
        <AppShell
          isAuthenticated={isAuthenticated}
          companyName={companyName}
          companyLogoUrl={company?.logo_url || null}
          activeCompanyId={activeCompanyId}
          companies={companies}
          userName={
            auth?.profile?.full_name || auth?.profile?.username || auth?.email || ''
          }
          userRole={auth?.activeRole || null}
          isMasterAdmin={Boolean(auth?.isMasterAdmin)}
          mfaEnabled={Boolean(auth?.mfaEnabled)}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
