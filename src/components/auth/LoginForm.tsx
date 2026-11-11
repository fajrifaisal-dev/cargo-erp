'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Anchor,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import {
  BootstrapStatus,
  loginWithIdentifier,
  requestPasswordReset,
  signOutAction,
  verifyMfaLogin,
} from '@/app/actions/auth';

interface LoginFormProps {
  initialMfaFactorId?: string | null;
  initialMfaEmail?: string;
  bootstrapStatus: BootstrapStatus;
}

export function LoginForm({
  initialMfaFactorId = null,
  initialMfaEmail = '',
  bootstrapStatus,
}: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(initialMfaFactorId);
  const [otpCode, setOtpCode] = useState('');

  const [showResetBox, setShowResetBox] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    startTransition(async () => {
      const res = await loginWithIdentifier({ identifier, password });
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      if (res.mfaRequired && res.factorId) {
        setMfaFactorId(res.factorId);
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await verifyMfaLogin({
        factorId: mfaFactorId,
        code: otpCode,
      });
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    startTransition(async () => {
      const res = await requestPasswordReset(resetIdentifier || identifier);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.message) {
        setInfoMsg(res.message);
        setShowResetBox(false);
      }
    });
  };

  const handleCancelMfa = () => {
    startTransition(async () => {
      setMfaFactorId(null);
      setOtpCode('');
      await signOutAction();
    });
  };

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side — Login Form */}
      <div className="flex flex-col justify-center px-6 sm:px-14 lg:px-20 py-10">
        <div className="w-full max-w-[400px] mx-auto space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FACC15] flex items-center justify-center shadow-sm">
              <Anchor className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-wide text-gray-900 leading-none">
                GEMA TRANS
              </div>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-400 uppercase mt-1">
                LOGISTICS MANAGEMENT SYSTEM
              </div>
            </div>
          </div>

          {/* Setup Helper Banner (without leaking env/database internals) */}
          {(!bootstrapStatus.hasAdminKey ||
            !bootstrapStatus.profilesTableReady ||
            !bootstrapStatus.hasMasterAdmin) && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Inisialisasi Sistem
              </div>
              {!bootstrapStatus.hasAdminKey ||
              !bootstrapStatus.profilesTableReady ? (
                <p className="text-amber-800 leading-relaxed">
                  Konfigurasi sistem awal belum selesai. Silakan hubungi
                  administrator sistem.
                </p>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-800">
                    Belum ada akun Master Admin pertama.
                  </span>
                  <Link
                    href="/setup"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FACC15] text-gray-900 font-bold hover:bg-[#EAB308] flex-shrink-0"
                  >
                    Setup Admin <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {mfaFactorId ? (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Google Authenticator (2FA)
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  Verifikasi Kode OTP
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan 6 digit kode dari aplikasi Google Authenticator Anda
                  {initialMfaEmail ? ` (${initialMfaEmail})` : ''}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Kode OTP 6 Digit
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-center text-lg font-mono font-bold tracking-[0.4em] text-gray-900 focus:outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || otpCode.length < 6}
                className="w-full h-11 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 text-gray-900 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Verifikasi & Masuk
              </button>

              <button
                type="button"
                onClick={handleCancelMfa}
                disabled={isPending}
                className="w-full h-9 rounded-xl text-xs font-semibold text-slate-500 hover:text-gray-800 hover:bg-slate-100 transition-colors"
              >
                Gunakan Akun Lain
              </button>
            </form>
          ) : showResetBox ? (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  Reset Password
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan username atau email terdaftar untuk mengirim link reset
                  password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Username / Email
                </label>
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-gray-900 focus:outline-none focus:border-[#EAB308]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetBox(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-300 text-xs font-bold text-gray-700 hover:bg-slate-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-10 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-xs font-bold text-gray-900"
                >
                  Kirim Reset
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Masuk</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Selamat datang kembali. Silakan masuk ke akun Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Username atau Email
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-xs text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-xs text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-amber-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Toggle Password"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setShowResetBox(true);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 text-gray-900 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Masuk
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Side — Marketing / Dashboard Illustration */}
      <div className="hidden lg:flex flex-col justify-center bg-[#F6F7F9] relative overflow-hidden px-14 xl:px-20">
        {/* Soft Warm Accent Arc */}
        <div
          className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(250,204,21,0.32) 0%, rgba(250,204,21,0.08) 45%, transparent 72%)',
          }}
        />

        <div className="relative z-10 max-w-md mx-auto w-full space-y-8">
          {/* Mock Dashboard Preview Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/80 shadow-xl p-5 space-y-4 transform -rotate-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FEF9C3] flex items-center justify-center">
                <Anchor className="w-4 h-4 text-[#CA8A04]" />
              </div>
              <div className="text-xs font-extrabold text-gray-800">
                Dashboard Operasional
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                <div className="text-[10px] text-slate-400 font-semibold">
                  Pengiriman
                </div>
                <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                  6.025
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                <div className="text-[10px] text-slate-400 font-semibold">
                  Resi Aktif
                </div>
                <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                  4.152
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                <div className="text-[10px] text-slate-400 font-semibold">
                  Invoice Tempo
                </div>
                <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                  12
                </div>
              </div>
            </div>

            <div className="flex items-end gap-2 h-24 pt-2 px-1">
              {[35, 52, 44, 65, 95, 58, 70, 48, 62].map((h, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t-lg ${
                    idx === 4 ? 'bg-[#FACC15]' : 'bg-slate-200/80'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="w-9 h-1 rounded-full bg-[#FACC15]" />
            <h2 className="text-2xl font-extrabold text-gray-900 leading-snug">
              Kelola Operasional Logistik Lebih Terintegrasi
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Pantau pengiriman, kelola cabang multi-tenant, dan akses laporan
              keuangan dalam satu sistem yang efisien dan aman.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
