'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Company } from '@/types/database';
import { updateCompanySettings } from '@/app/actions/companies';
import { Save, CheckCircle2, Palette } from 'lucide-react';
import { LogoUploader } from '@/components/admin/LogoUploader';

interface CompanySettingsFormProps {
  company: Company | null;
}

const BRAND_PRESETS = [
  { name: 'Indigo (Odoo Default)', primary: '#4F46E5', accent: '#4338CA' },
  { name: 'Slate Navy', primary: '#0F172A', accent: '#1E293B' },
  { name: 'Gema Amber', primary: '#D97706', accent: '#B45309' },
  { name: 'Emerald Logistik', primary: '#059669', accent: '#047857' },
  { name: 'Ocean Blue', primary: '#0284C7', accent: '#0369A1' },
];

export function CompanySettingsForm({ company }: CompanySettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState(company?.name || '');
  const [phone, setPhone] = useState(company?.phone || '');
  const [address, setAddress] = useState(company?.address || '');
  const [bankAccount, setBankAccount] = useState(company?.bank_account || '');
  const [logoUrl, setLogoUrl] = useState(company?.logo_url || '');
  const [brandColor, setBrandColor] = useState(company?.brand_color || '#4F46E5');
  const [brandAccent, setBrandAccent] = useState(company?.brand_accent || '#4338CA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await updateCompanySettings({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          bank_account: bankAccount.trim(),
          logo_url: logoUrl.trim() || null,
          brand_color: brandColor,
          brand_accent: brandAccent,
        });
        setSuccess(true);
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menyimpan profil';
        setErrorMsg(message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl text-xs">
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan perusahaan & tema brand berhasil diterapkan!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Nama Perusahaan Ekspedisi *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-brand"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Nomor Telepon Kantor / Hotline
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Rekening Pembayaran Resmi
            </label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Bank - No Rekening - a.n"
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Alamat Kantor Pusat / Operasional
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
          />
        </div>

        <LogoUploader
          value={logoUrl}
          onChange={setLogoUrl}
          companyName={name}
          brandColor={brandColor}
        />

        {/* Brand Color Presets & Custom Picker */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <Palette className="w-4 h-4 text-brand" />
            <span>Tema Warna Brand Aplikasi</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {BRAND_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setBrandColor(preset.primary);
                  setBrandAccent(preset.accent);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  brandColor.toLowerCase() === preset.primary.toLowerCase()
                    ? 'border-gray-900 bg-slate-100 text-gray-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.primary }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Brand Color Primary
              </label>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-10">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-gray-900 font-bold">{brandColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Brand Color Accent (Hover)
              </label>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-10">
                <input
                  type="color"
                  value={brandAccent}
                  onChange={(e) => setBrandAccent(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-gray-900 font-bold">{brandAccent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-5 h-9 rounded-xl bg-brand font-bold disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>
    </form>
  );
}
