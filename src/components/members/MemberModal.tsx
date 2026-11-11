'use client';

import React, { useState, useTransition } from 'react';
import { Member } from '@/types/database';
import { createMember, updateMember } from '@/app/actions/members';
import { Plus, Edit2, Users } from 'lucide-react';

interface MemberModalProps {
  member?: Member;
  mode: 'create' | 'edit';
}

export function MemberModal({ member, mode }: MemberModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState(member?.name || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [address, setAddress] = useState(member?.address || '');
  const [paymentTermDays, setPaymentTermDays] = useState(member?.payment_term_days || 14);
  const [creditLimit, setCreditLimit] = useState(member?.credit_limit || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama member wajib diisi');
      return;
    }

    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createMember({
            name: name.trim(),
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            payment_term_days: Number(paymentTermDays),
            credit_limit: Number(creditLimit),
          });
        } else if (member) {
          await updateMember(member.id, {
            name: name.trim(),
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            payment_term_days: Number(paymentTermDays),
            credit_limit: Number(creditLimit),
          });
        }
        setIsOpen(false);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan member');
      }
    });
  };

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Member Baru</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
          title="Edit Member"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 text-xs">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand" />
                {mode === 'create' ? 'Tambah Member Korporat' : 'Edit Member'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-gray-900 font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nama Perusahaan / Shipper *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="PT. Logistik Maju Jaya"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">No. Telepon / PIC</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Alamat Kantor / Pabrik
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat kantor member..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Term of Payment (Hari)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={paymentTermDays}
                    onChange={(e) => setPaymentTermDays(parseInt(e.target.value) || 14)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Plafon Kredit (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 h-9 rounded-xl bg-brand font-bold disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
