'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Company, UserRole } from '@/types/database';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  companyName: string;
  companyLogoUrl?: string | null;
  activeCompanyId: string;
  companies: Company[];
  userName: string;
  userRole: UserRole | null;
  isMasterAdmin: boolean;
  mfaEnabled: boolean;
}

export function AppShell({
  children,
  isAuthenticated,
  companyName,
  companyLogoUrl,
  activeCompanyId,
  companies,
  userName,
  userRole,
  isMasterAdmin,
  mfaEnabled,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isPrintRoute = pathname.includes('/print');
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/resi');

  if (isPrintRoute || isAuthRoute || !isAuthenticated) {
    return <div className="min-h-screen bg-white text-black">{children}</div>;
  }

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden bg-[#F8FAFC] text-[#111827]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        isMasterAdmin={isMasterAdmin}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          companyName={companyName}
          activeCompanyId={activeCompanyId}
          companies={companies}
          userName={userName}
          userRole={userRole}
          isMasterAdmin={isMasterAdmin}
          mfaEnabled={mfaEnabled}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
