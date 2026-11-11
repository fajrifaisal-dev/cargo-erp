'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Menu,
  Building2,
  ShieldCheck,
  LogOut,
  UserCircle2,
  X,
} from 'lucide-react';
import { Company, UserRole } from '@/types/database';
import { setActiveCompany } from '@/app/actions/companies';
import { signOutAction } from '@/app/actions/auth';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  companyName: string;
  activeCompanyId: string;
  companies: Company[];
  userName: string;
  userRole: UserRole | null;
  isMasterAdmin: boolean;
  mfaEnabled: boolean;
}

function formatRoleLabel(role: UserRole | null) {
  if (role === 'master_admin') return 'Master Admin';
  if (role === 'finance') return 'Finance';
  if (role === 'marketing') return 'Marketing';
  return 'Guest';
}

export function Header({
  onToggleSidebar,
  onOpenMobileSidebar,
  companyName,
  activeCompanyId,
  companies,
  userName,
  userRole,
  isMasterAdmin,
  mfaEnabled,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (pathname.includes('/print')) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setMobileSearchOpen(false);
    if (q) {
      router.push(`/shipments?search=${encodeURIComponent(q)}`);
    } else {
      router.push('/shipments');
    }
  };

  const handleCompanySwitch = (newCompanyId: string) => {
    if (!newCompanyId || newCompanyId === activeCompanyId) return;
    startTransition(async () => {
      await setActiveCompany(newCompanyId);
      router.refresh();
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard Operasional';
    if (pathname.startsWith('/shipments/new')) return 'Input STT Baru';
    if (pathname.startsWith('/shipments')) return 'Manajemen Resi (STT)';
    if (pathname.startsWith('/manifests/new')) return 'Buat Manifest Muatan';
    if (pathname.startsWith('/manifests')) return 'Daftar Muat Kapal (DM)';
    if (pathname.startsWith('/invoices/new')) return 'Buat Invoice Penagihan';
    if (pathname.startsWith('/invoices')) return 'Faktur & Invoice';
    if (pathname.startsWith('/members')) return 'Master Member & Ekspedisi';
    if (pathname.startsWith('/admin/expeditions'))
      return 'Admin — Daftar Ekspedisi';
    if (pathname.startsWith('/admin/users')) return 'Admin — User & Hak Akses';
    if (pathname.startsWith('/admin/regions')) return 'Admin — Master Wilayah';
    if (pathname.startsWith('/settings')) return 'Pengaturan Ekspedisi Aktif';
    if (pathname.startsWith('/account')) return 'Profil & Keamanan (2FA)';
    return companyName || 'Cargo ERP';
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Buka Menu Navigasi"
            className="md:hidden p-1.5 rounded-xl text-slate-600 hover:text-gray-900 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Ciutkan/Perluas Sidebar"
            className="hidden md:inline-flex p-1.5 rounded-xl text-slate-500 hover:text-gray-900 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <h1 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Cari STT"
            className="md:hidden p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
          >
            {mobileSearchOpen ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </button>

          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari STT / Pengirim / Kota..."
              className="w-52 h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-gray-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand transition-all"
            />
          </form>

          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

          {/* Tenant Selector */}
          {companies.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand hidden sm:block" />
              <select
                value={activeCompanyId}
                onChange={(e) => handleCompanySwitch(e.target.value)}
                disabled={isPending}
                aria-label="Pilih Ekspedisi Aktif"
                className="h-9 max-w-[115px] sm:max-w-[175px] px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:border-brand cursor-pointer truncate"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-gray-800 max-w-[175px] truncate">
              <Building2 className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              <span className="truncate">{companyName}</span>
            </span>
          )}

          {/* User Info & 2FA Status */}
          <Link
            href="/account"
            title="Pengaturan Akun & Google Authenticator"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <UserCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[11px] font-bold text-gray-900 max-w-[110px] truncate">
                {userName || 'User'}
              </span>
              <span className="text-[9px] font-bold text-brand uppercase tracking-wide">
                {formatRoleLabel(userRole)}
              </span>
            </div>
            {mfaEnabled && (
              <ShieldCheck
                className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"
                aria-label="Google Authenticator Aktif"
              />
            )}
          </Link>

          {isMasterAdmin && (
            <Link
              href="/admin/expeditions"
              title="Kelola Daftar Ekspedisi (Master Admin)"
              className="hidden lg:flex w-9 h-9 rounded-xl bg-brand-soft border border-brand-soft text-brand items-center justify-center text-xs font-bold flex-shrink-0"
            >
              {companyName.slice(0, 2).toUpperCase()}
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            title="Keluar"
            className="h-9 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Mobile Expandable Quick Search */}
      {mobileSearchOpen && (
        <form
          onSubmit={handleSearch}
          className="md:hidden px-3 pb-3 pt-1 flex items-center gap-2 border-t border-slate-100 bg-slate-50/70"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari STT / Pengirim / Kota..."
              autoFocus
              className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-xl text-gray-900 placeholder-slate-400 focus:outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 h-9 rounded-xl bg-brand text-xs font-bold flex-shrink-0"
          >
            Cari
          </button>
        </form>
      )}
    </header>
  );
}
