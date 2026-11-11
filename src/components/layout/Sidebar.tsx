'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Ship,
  Receipt,
  Users,
  Settings,
  Plus,
  Anchor,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/database';

const operationalNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Resi Pengiriman (STT)', href: '/shipments', icon: FileText },
  { name: 'Daftar Muat (Manifest)', href: '/manifests', icon: Ship },
  { name: 'Invoice Penagihan', href: '/invoices', icon: Receipt },
  { name: 'Data Member', href: '/members', icon: Users },
];

const adminNav = [
  { name: 'Daftar Ekspedisi', href: '/admin/expeditions', icon: Building2 },
  { name: 'User & Hak Akses', href: '/admin/users', icon: UserCog },
  { name: 'Master Wilayah', href: '/admin/regions', icon: MapPin },
  { name: 'Pengaturan Aktif', href: '/settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  companyName: string;
  companyLogoUrl?: string | null;
  isMasterAdmin: boolean;
  userRole: UserRole | null;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  companyName,
  companyLogoUrl,
  isMasterAdmin,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();

  if (pathname.includes('/print')) {
    return null;
  }

  const renderNavItems = (items: typeof operationalNav) =>
    items.map((item) => {
      const isActive =
        item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href);

      return (
        <Link
          key={item.name}
          href={item.href}
          title={collapsed ? item.name : undefined}
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-xl transition-colors',
            collapsed && 'justify-center px-0 w-10 mx-auto',
            isActive
              ? 'bg-brand-soft text-brand border border-brand-soft'
              : 'text-slate-600 hover:text-gray-900 hover:bg-slate-100 border border-transparent'
          )}
        >
          <item.icon
            className={cn(
              'w-4 h-4 flex-shrink-0',
              isActive ? 'text-brand' : 'text-slate-400'
            )}
          />
          {!collapsed && (
            <span className="truncate flex-1">{item.name}</span>
          )}
          {!collapsed &&
            item.href === '/invoices' &&
            userRole === 'marketing' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                Lihat
              </span>
            )}
        </Link>
      );
    });

  return (
    <aside
      className={cn(
        'no-print flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 transition-all duration-200 z-30',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="overflow-y-auto">
        {/* Brand Header (56px matching Topbar) */}
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-200">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0"
            title={companyName}
          >
            {companyLogoUrl ? (
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={companyLogoUrl}
                  alt={companyName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center flex-shrink-0 shadow-sm">
                <Anchor className="w-4 h-4" />
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold tracking-wide text-gray-900 uppercase truncate">
                  GEMA TRANS ERP
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {companyName}
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Ciutkan Sidebar"
              className="p-1.5 rounded-xl text-slate-400 hover:text-gray-900 hover:bg-slate-100 transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Perluas Sidebar"
              className="w-10 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-gray-900 hover:bg-slate-100 transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Action Button */}
        <div className="p-3">
          <Link
            href="/shipments/new"
            title="Buat Resi STT Baru"
            className={cn(
              'flex items-center justify-center gap-2 h-9 text-xs font-bold rounded-xl bg-brand transition-colors shadow-sm',
              collapsed ? 'w-10 mx-auto px-0' : 'w-full px-3'
            )}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Buat Resi STT Baru</span>}
          </Link>
        </div>

        {/* Navigation Links: Operasional */}
        <nav className="px-3 space-y-1 pb-4">
          {!collapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Menu Operasional
            </div>
          )}
          {renderNavItems(operationalNav)}

          {/* Admin Section (Master Admin only) */}
          {isMasterAdmin && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              {!collapsed && (
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Master Admin
                </div>
              )}
              <div className="space-y-1">{renderNavItems(adminNav)}</div>
            </div>
          )}

          {/* Security & Account */}
          <div className="pt-3 mt-3 border-t border-slate-100">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Akun Saya
              </div>
            )}
            <div className="space-y-1">
              {renderNavItems([
                { name: 'Profil & 2FA', href: '/account', icon: ShieldCheck },
              ])}
            </div>
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        {collapsed ? (
          <div
            title={companyName}
            className="w-8 h-8 mx-auto rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-brand"
          >
            {companyName.slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-600 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="truncate">RLS & Auth Active</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">v2.6</span>
          </div>
        )}
      </div>
    </aside>
  );
}
