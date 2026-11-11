'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createManifest } from '@/app/actions/manifests';
import { ArrowLeft, Ship, Save } from 'lucide-react';
import Link from 'next/link';

export function CreateManifestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [manifestNumber, setManifestNumber] = useState(
    `DM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [vendorName, setVendorName] = useState('PT. Meratus Line');
  const [vesselName, setVesselName] = useState('');
  const [destinationCity, setDestinationCity] = useState('Makassar');
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [vendorCost, setVendorCost] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!manifestNumber.trim() || !vendorName.trim() || !destinationCity.trim()) {
      setErrorMsg('Semua kolom bertanda * wajib diisi');
      return;
    }

    startTransition(async () => {
      try {
        const created = await createManifest({
          manifest_number: manifestNumber.trim(),
          vendor_name: vendorName.trim(),
          vessel_name: vesselName.trim() || undefined,
          destination_city: destinationCity.trim(),
          departure_date: departureDate,
          vendor_cost: Number(vendorCost || 0),
        });

        router.push(`/manifests/${created.id}`);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat manifest');
      }
    });
  };

  const inputCls =
    'w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto text-xs">
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl px-5 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link
            href="/manifests"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
            <Ship className="w-4 h-4 text-brand" />
            Buat Daftar Muat (DM) Pelayaran Baru
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isPending ? 'Menyimpan...' : 'Simpan Manifest'}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Nomor Manifest (DM) *
            </label>
            <input
              type="text"
              value={manifestNumber}
              onChange={(e) => setManifestNumber(e.target.value)}
              className={`${inputCls} font-mono`}
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Tanggal Berangkat Kapal (ETD) *
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Vendor Pelayaran (Shipping Line) *
            </label>
            <input
              type="text"
              list="shipping-vendors"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="PT. Meratus Line / Temas / SPIL"
              className={inputCls}
              required
            />
            <datalist id="shipping-vendors">
              <option value="PT. Meratus Line" />
              <option value="PT. Pelayaran Tempuran Emas (Temas)" />
              <option value="PT. Salam Pacific Indonesia Lines (SPIL)" />
              <option value="PT. Tanto Intim Line" />
              <option value="PT. Samudera Indonesia" />
            </datalist>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Nama Kapal & No. Voyage
            </label>
            <input
              type="text"
              value={vesselName}
              onChange={(e) => setVesselName(e.target.value)}
              placeholder="Contoh: KM. Meratus Jayapura V.2410"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Kota Pelabuhan Tujuan *
            </label>
            <input
              type="text"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="Makassar, Ambon, Jayapura, Sorong..."
              className={`${inputCls} font-bold text-brand`}
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Biaya Freight ke Vendor Pelayaran (Rp)
            </label>
            <input
              type="number"
              value={vendorCost || ''}
              onChange={(e) => setVendorCost(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={`${inputCls} tabular-nums`}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
