'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldOff,
  QrCode,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { createClient as createBrowserSupabase } from '@/lib/supabase/client';
import { changeMyPassword } from '@/app/actions/auth';

interface TotpFactorInfo {
  id: string;
  friendlyName: string;
  createdAt: string;
}

interface MfaSecurityPanelProps {
  username: string;
  email: string;
  fullName: string;
  roleLabel: string;
  verifiedFactors: TotpFactorInfo[];
}

export function MfaSecurityPanel({
  username,
  email,
  fullName,
  roleLabel,
  verifiedFactors,
}: MfaSecurityPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMfaEnabled = verifiedFactors.length > 0;

  const handleStartEnroll = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Google Authenticator (${username || email})`,
      });

      if (error || !data) {
        setErrorMsg('Gagal memulai aktivasi Google Authenticator. Silakan coba lagi.');
        return;
      }

      setEnrolling({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    });
  };

  const handleVerifyEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolling) return;
    setErrorMsg(null);

    startTransition(async () => {
      const supabase = createBrowserSupabase();
      const code = verifyCode.replace(/\s+/g, '');
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrolling.factorId,
        code,
      });

      if (error) {
        setErrorMsg('Kode OTP salah atau kedaluwarsa. Coba lagi.');
        return;
      }

      setEnrolling(null);
      setVerifyCode('');
      setSuccessMsg('Google Authenticator (2FA) berhasil diaktifkan!');
      router.refresh();
    });
  };

  const handleUnenroll = (factorId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setErrorMsg('Gagal menonaktifkan Google Authenticator. Silakan coba lagi.');
        return;
      }
      setSuccessMsg('Google Authenticator dinonaktifkan.');
      router.refresh();
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    startTransition(async () => {
      const res = await changeMyPassword(newPassword);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Password berhasil diperbarui.');
    });
  };

  return (
    <div className="space-y-5 text-xs">
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="font-bold text-sm text-gray-900">Informasi Akun</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Nama Lengkap</div>
            <div className="font-bold text-gray-900 mt-0.5">{fullName || '-'}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Username</div>
            <div className="font-mono font-bold text-gray-900 mt-0.5">{username || '-'}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Email</div>
            <div className="font-semibold text-gray-800 mt-0.5">{email}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Role Aktif</div>
            <div className="mt-0.5">
              <span className="inline-flex px-2.5 py-0.5 rounded-lg bg-brand-soft text-brand font-bold text-[11px]">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Authenticator Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isMfaEnabled
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">
                  Google Authenticator (2FA / TOTP)
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    isMfaEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {isMfaEnabled ? 'Aktif' : 'Belum Aktif (Opsional)'}
                </span>
              </div>
              <p className="text-slate-500 mt-1">
                Tambahkan lapisan keamanan kode OTP 6 digit dari aplikasi Google
                Authenticator saat login. Sifatnya opsional dan bisa diaktifkan atau
                dinonaktifkan kapan saja.
              </p>
            </div>
          </div>

          {!isMfaEnabled && !enrolling && (
            <button
              type="button"
              onClick={handleStartEnroll}
              disabled={isPending}
              className="h-9 px-4 rounded-xl bg-brand font-bold flex items-center gap-1.5 flex-shrink-0 shadow-sm"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <QrCode className="w-3.5 h-3.5" />
              )}
              Aktifkan Google Authenticator
            </button>
          )}
        </div>

        {/* QR Code Enrollment Flow */}
        {enrolling && (
          <form
            onSubmit={handleVerifyEnroll}
            className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrolling.qrCode}
                  alt="QR Google Authenticator"
                  className="w-44 h-44"
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Scan QR di atas lewat aplikasi <b>Google Authenticator</b>.
              </div>
              <div className="text-[10px] font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 select-all">
                Secret: {enrolling.secret}
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-bold text-gray-900">
                Konfirmasi Kode 6 Digit
              </div>
              <p className="text-slate-500">
                Setelah ditambahkan di Google Authenticator, masukkan 6 digit angka
                yang tampil untuk menyelesaikan aktivasi.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-center text-lg font-mono font-bold tracking-[0.4em]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEnrolling(null);
                    setVerifyCode('');
                  }}
                  className="flex-1 h-9 rounded-xl border border-slate-300 bg-white font-bold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || verifyCode.length < 6}
                  className="flex-1 h-9 rounded-xl bg-brand font-bold disabled:opacity-60"
                >
                  Aktifkan Sekarang
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Active TOTP Factors */}
        {isMfaEnabled && (
          <div className="space-y-2 pt-2">
            {verifiedFactors.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200"
              >
                <div>
                  <div className="font-bold text-emerald-950">{f.friendlyName}</div>
                  <div className="text-[11px] text-emerald-700">
                    Aktif • Kode OTP diminta setiap login
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnenroll(f.id)}
                  disabled={isPending}
                  className="h-8 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1.5"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  Nonaktifkan
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
          <KeyRound className="w-4 h-4 text-brand" />
          Ubah Password Akun
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Password Baru (min. 8 karakter)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Ulangi Password Baru
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-4 rounded-xl bg-brand font-bold shadow-sm disabled:opacity-60"
        >
          Simpan Password Baru
        </button>
      </form>
    </div>
  );
}
