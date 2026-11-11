'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Company } from '@/types/database';
import { createCompany, updateCompanyById } from '@/app/actions/companies';
import { Plus, Settings2, Building2, Palette } from 'lucide-react';
import { LogoUploader } from './LogoUploader';

interface ExpeditionModalProps {
  company?: Company;
  mode: 'create' | 'edit';
}

const BRAND_PRESETS = [
  { name: 'Indigo', primary: '#4F46E5', accent: '#4338CA' },
  { name: 'Navy', primary: '#0F172A', accent: '#1E293B' },
  { name: 'Amber', primary: '#D97706', accent: '#B45309' },
  { name: 'Emerald', primary: '#059669', accent: '#047857' },
  { name: 'Ocean', primary: '#0284C7', accent: '#0369A1' },
];

export function ExpeditionModal({ company, mode }: ExpeditionModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState(company?.name || '');
  const [slug, setSlug] = useState(company?.slug || '');
  const [phone, setPhone] = useState(company?.phone || '');
  const [address, setAddress] = useState(company?.address || '');
  const [bankAccount, setBankAccount] = useState(company?.bank_account || '');
  const [logoUrl, setLogoUrl] = useState(company?.logo_url || '');
  const [brandColor, setBrandColor] = useState(company?.brand_color || '#4F46E5');
  const [brandAccent, setBrandAccent] = useState(company?.brand_accent || '#4338CA');

  const openModal = () => {
    setErrorMsg(null);
    if (mode === 'edit' && company) {
      setName(company.name || '');
      setSlug(company.slug || '');
      setPhone(company.phone || '');
      setAddress(company.address || '');
      setBankAccount(company.bank_account || '');
      setLogoUrl(company.logo_url || '');
      setBrandColor(company.brand_color || '#4F46E5');
      setBrandAccent(company.brand_accent || '#4338CA');
    }
    setIsOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === 'create') {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama ekspedisi wajib diisi');
      return;
    }

    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createCompany({
            name: name.trim(),
            slug: slug.trim() || name.trim(),
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            logo_url: logoUrl.trim() || undefined,
            bank_account: bankAccount.trim() || undefined,
            brand_color: brandColor,
            brand_accent: brandAccent,
          });
          setName('');
          setSlug('');
          setPhone('');
          setAddress('');
          setBankAccount('');
          setLogoUrl('');
        } else if (company) {
          await updateCompanyById(company.id, {
            name: name.trim(),
            slug: slug.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            logo_url: logoUrl.trim() || null,
            bank_account: bankAccount.trim() || null,
            brand_color: brandColor,
            brand_accent: brandAccent,
          });
        }
        setIsOpen(false);
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan ekspedisi');
      }
    });
  };

  const inputCls =
    'w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand';

  return (
    <>
      {mode === 'create' ? (
        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Ekspedisi</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 border border-slate-200 text-xs font-semibold transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Atur Ekspedisi</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 text-xs">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand" />
                {mode === 'create'
                  ? 'Tambah Ekspedisi Baru (Multi-Tenant)'
                  : `Pengaturan: ${company?.name}`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Nama Ekspedisi *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="PT. Nusantara Cargo"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Kode / Slug Unik *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="nusantara-cargo"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    No. Telepon / CS
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="031-xxxxxxx"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Rekening Bank Resmi
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="BCA 0123456 a.n PT ..."
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Alamat Kantor / Cabang Utama
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Kalimas Baru ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
                />
              </div>

              <LogoUploader
                value={logoUrl}
                onChange={setLogoUrl}
                companyName={name || company?.name}
                brandColor={brandColor}
              />

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                  <Palette className="w-3.5 h-3.5 text-brand" />
                  <span>Tema Warna Brand Ekspedisi</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {BRAND_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setBrandColor(preset.primary);
                        setBrandAccent(preset.accent);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${
                        brandColor.toLowerCase() === preset.primary.toLowerCase()
                          ? 'border-gray-900 bg-slate-100 text-gray-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                      />
                      <span className="font-mono text-gray-900 font-bold">{brandColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Accent / Hover Color
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9">
                      <input
                        type="color"
                        value={brandAccent}
                        onChange={(e) => setBrandAccent(e.target.value)}
                        className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                      />
                      <span className="font-mono text-gray-900 font-bold">{brandAccent}</span>
                    </div>
                  </div>
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
                {isPending ? 'Menyimpan...' : 'Simpan Ekspedisi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
