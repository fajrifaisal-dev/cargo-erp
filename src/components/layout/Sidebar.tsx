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
  X,
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
  mobileOpen: boolean;
  onCloseMobile: () => void;
  companyName: string;
  companyLogoUrl?: string | null;
  isMasterAdmin: boolean;
  userRole: UserRole | null;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
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
          onClick={onCloseMobile}
          title={collapsed ? item.name : undefined}
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 text-xs font-semibold rounded-xl transition-colors',
            collapsed && 'md:justify-center md:px-0 md:w-10 md:mx-auto',
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
          <span className={cn('truncate flex-1', collapsed && 'md:hidden')}>
            {item.name}
          </span>
          {item.href === '/invoices' && userRole === 'marketing' && (
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold',
                collapsed && 'md:hidden'
              )}
            >
              Lihat
            </span>
          )}
        </Link>
      );
    });

  return (
    <>
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'no-print flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen transition-all duration-200',
          'fixed inset-y-0 left-0 z-50 w-72 md:sticky md:top-0 md:z-30 md:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          collapsed ? 'md:w-[72px]' : 'md:w-64'
        )}
      >
        <div className="overflow-y-auto">
          {/* Brand Header (56px matching Topbar) */}
          <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-200">
            <Link
              href="/"
              onClick={onCloseMobile}
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
              <div className={cn('flex flex-col min-w-0', collapsed && 'md:hidden')}>
                <span className="text-xs font-bold tracking-wide text-gray-900 uppercase truncate">
                  {companyName}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  Logistics ERP System
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup Menu"
              className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-gray-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {!collapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Ciutkan Sidebar"
                className="hidden md:inline-flex p-1.5 rounded-xl text-slate-400 hover:text-gray-900 hover:bg-slate-100 transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed (desktop only) */}
          {collapsed && (
            <div className="hidden md:flex px-3 pt-3 justify-center">
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
              onClick={onCloseMobile}
              title="Buat Resi STT Baru"
              className={cn(
                'flex items-center justify-center gap-2 h-9 text-xs font-bold rounded-xl bg-brand transition-colors shadow-sm px-3',
                collapsed ? 'md:w-10 md:mx-auto md:px-0' : 'w-full'
              )}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className={cn(collapsed && 'md:hidden')}>Buat Resi STT Baru</span>
            </Link>
          </div>

          {/* Navigation Links: Operasional */}
          <nav className="px-3 space-y-1 pb-4">
            <div
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider',
                collapsed && 'md:hidden'
              )}
            >
              Menu Operasional
            </div>
            {renderNavItems(operationalNav)}

            {/* Admin Section (Master Admin only) */}
            {isMasterAdmin && (
              <div className="pt-3 mt-3 border-t border-slate-100">
                <div
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider',
                    collapsed && 'md:hidden'
                  )}
                >
                  Master Admin
                </div>
                <div className="space-y-1">{renderNavItems(adminNav)}</div>
              </div>
            )}

            {/* Security & Account */}
            <div className="pt-3 mt-3 border-t border-slate-100">
              <div
                className={cn(
                  'px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider',
                  collapsed && 'md:hidden'
                )}
              >
                Akun Saya
              </div>
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
          <div
            title={companyName}
            className={cn(
              'hidden w-8 h-8 mx-auto rounded-xl bg-white border border-slate-200 items-center justify-center text-[10px] font-bold text-brand',
              collapsed && 'md:flex'
            )}
          >
            {companyName.slice(0, 2).toUpperCase()}
          </div>
          <div
            className={cn(
              'flex items-center justify-between text-[11px] text-slate-500',
              collapsed && 'md:hidden'
            )}
          >
            <span className="flex items-center gap-1.5 font-medium text-slate-600 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="truncate">RLS & Auth Active</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">v2.6</span>
          </div>
        </div>
      </aside>
    </>
  );
}
