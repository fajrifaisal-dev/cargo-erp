'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  ShieldCheck,
  Building2,
  Pencil,
  KeyRound,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  createUserAccount,
  resetUserPassword,
  updateUserAccess,
  UserWithMemberships,
} from '@/app/actions/users';
import { Company, TenantRole } from '@/types/database';

interface UserManagementClientProps {
  users: UserWithMemberships[];
  companies: Company[];
  adminKeyConfigured: boolean;
}

export function UserManagementClient({
  users,
  companies,
  adminKeyConfigured,
}: UserManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithMemberships | null>(null);
  const [resetTarget, setResetTarget] = useState<UserWithMemberships | null>(null);
  const [resetPassValue, setResetPassValue] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [tenantRoles, setTenantRoles] = useState<Record<string, TenantRole | ''>>({});

  const openCreateModal = () => {
    setErrorMsg(null);
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setFullName('');
    setPassword('');
    setIsMasterAdmin(false);
    setIsActive(true);
    setTenantRoles({});
    setModalMode('create');
  };

  const openEditModal = (u: UserWithMemberships) => {
    setErrorMsg(null);
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email);
    setFullName(u.full_name);
    setPassword('');
    setIsMasterAdmin(u.is_master_admin);
    setIsActive(u.is_active);
    const map: Record<string, TenantRole | ''> = {};
    u.memberships.forEach((m) => {
      map[m.company_id] = m.role;
    });
    setTenantRoles(map);
    setModalMode('edit');
  };

  const buildMembershipsList = () =>
    Object.entries(tenantRoles)
      .filter(([, role]) => role === 'finance' || role === 'marketing')
      .map(([company_id, role]) => ({
        company_id,
        role: role as TenantRole,
      }));

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const memberships = buildMembershipsList();
        if (modalMode === 'create') {
          await createUserAccount({
            username,
            email,
            fullName,
            password,
            isMasterAdmin,
            memberships,
          });
        } else if (modalMode === 'edit' && editingUser) {
          await updateUserAccess({
            userId: editingUser.id,
            username,
            fullName,
            isMasterAdmin,
            isActive,
            memberships,
          });
        }
        setModalMode(null);
        router.refresh();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan user.'
        );
      }
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        await resetUserPassword(resetTarget.id, resetPassValue);
        setResetTarget(null);
        setResetPassValue('');
        router.refresh();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Gagal mereset password.'
        );
      }
    });
  };

  if (!adminKeyConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-xs space-y-2 text-amber-900">
        <div className="font-bold text-sm">Layanan Manajemen User Belum Aktif</div>
        <p>
          Konfigurasi layanan administrasi server belum lengkap. Silakan hubungi
          administrator sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreateModal}
          className="h-9 px-4 rounded-xl bg-brand font-bold flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Tambah User Baru
        </button>
      </div>

      {errorMsg && !modalMode && !resetTarget && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Username / Email</th>
                <th className="py-3 px-3">Role & Akses Tenant</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-gray-900">{u.full_name}</td>
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-brand">@{u.username}</div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    {u.is_master_admin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                        <ShieldCheck className="w-3 h-3" />
                        Master Admin (Semua Tenant)
                      </span>
                    ) : u.memberships.length === 0 ? (
                      <span className="text-slate-400 italic">Belum ada akses tenant</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {u.memberships.map((m) => (
                          <span
                            key={m.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                              m.role === 'finance'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            <Building2 className="w-3 h-3" />
                            {m.company?.name || 'Tenant'}: {m.role.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="px-2.5 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Edit Akses
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setResetPassValue('');
                          setResetTarget(u);
                        }}
                        className="px-2.5 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold inline-flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3" /> Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">
                {modalMode === 'create' ? 'Tambah User Baru' : 'Edit User & Hak Akses'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="cth: finance.sby"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama staf"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {modalMode === 'create' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staf@gematrans.id"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">
                      Password Awal *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="flex items-center gap-2 font-bold text-gray-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMasterAdmin}
                    onChange={(e) => setIsMasterAdmin(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Jadikan Master Admin (Akses Semua Tenant & Kelola User)</span>
                </label>

                {modalMode === 'edit' && (
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Akun Aktif (Bisa Login)</span>
                  </label>
                )}
              </div>

              {!isMasterAdmin && (
                <div className="space-y-2">
                  <div className="font-bold text-gray-800">
                    Hak Akses Per Tenant Ekspedisi:
                  </div>
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {companies.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.slug}
                          </div>
                        </div>
                        <select
                          value={tenantRoles[c.id] || ''}
                          onChange={(e) =>
                            setTenantRoles((prev) => ({
                              ...prev,
                              [c.id]: e.target.value as TenantRole | '',
                            }))
                          }
                          className="h-8 px-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                        >
                          <option value="">Tidak Ada Akses</option>
                          <option value="finance">Finance (Full Invoice)</option>
                          <option value="marketing">Marketing (Invoice Lihat Saja)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="h-9 px-4 rounded-xl border border-slate-300 font-bold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-5 rounded-xl bg-brand font-bold flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">
                Reset Password (@{resetTarget.username})
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Password Baru (min. 8 karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetPassValue}
                  onChange={(e) => setResetPassValue(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="h-9 px-4 rounded-xl border border-slate-300 font-bold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-4 rounded-xl bg-brand font-bold"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
