'use client';

import React, { useState } from 'react';
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
  const pathname = usePathname();
  const isPrintRoute = pathname.includes('/print');
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/setup');

  if (isPrintRoute || isAuthRoute || !isAuthenticated) {
    return <div className="min-h-screen bg-white text-black">{children}</div>;
  }

  return (
    <div className="min-h-screen flex w-full bg-[#F8FAFC] text-[#111827]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        isMasterAdmin={isMasterAdmin}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          companyName={companyName}
          activeCompanyId={activeCompanyId}
          companies={companies}
          userName={userName}
          userRole={userRole}
          isMasterAdmin={isMasterAdmin}
          mfaEnabled={mfaEnabled}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
