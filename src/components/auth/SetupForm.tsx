'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Anchor, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { bootstrapMasterAdmin } from '@/app/actions/auth';

export function SetupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('Master Admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const res = await bootstrapMasterAdmin({
        username,
        email,
        fullName,
        password,
      });
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15] flex items-center justify-center">
              <Anchor className="w-4 h-4 text-gray-900" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">
                Setup Master Admin Pertama
              </h1>
              <p className="text-[11px] text-slate-500">
                Halaman ini otomatis terkunci setelah 1 Master Admin dibuat.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#EAB308]"
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
              placeholder="Admin Utama"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#EAB308]"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Email Aktif *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gematrans.id"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#EAB308]"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Password (min. 8 karakter) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#EAB308]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-gray-900 font-bold flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Buat Akun Master Admin & Masuk
          </button>
        </form>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-gray-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke halaman Login
        </Link>
      </div>
    </div>
  );
}
