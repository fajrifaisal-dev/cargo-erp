'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Plus,
  Search,
  Trash2,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  createRegion,
  deleteRegion,
  seedDefaultRegions,
  toggleRegionStatus,
} from '@/app/actions/regions';
import { Region } from '@/types/database';

interface RegionManagementClientProps {
  regions: Region[];
  tableReady: boolean;
}

export function RegionManagementClient({
  regions,
  tableReady,
}: RegionManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [newProvince, setNewProvince] = useState('');
  const [newCity, setNewCity] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const provinces = useMemo(() => {
    const set = new Set(regions.map((r) => r.province));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [regions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regions.filter((r) => {
      if (provinceFilter !== 'all' && r.province !== provinceFilter) {
        return false;
      }
      if (
        q &&
        !r.city.toLowerCase().includes(q) &&
        !r.province.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [regions, search, provinceFilter]);

  const handleSeedDefault = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        const res = await seedDefaultRegions();
        setSuccessMsg(
          `Sinkronisasi selesai (${res.inserted} wilayah default Indonesia diperiksa/ditambahkan).`
        );
        router.refresh();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal sinkronisasi wilayah.');
      }
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        await createRegion({ province: newProvince, city: newCity });
        setNewCity('');
        setSuccessMsg('Wilayah berhasil ditambahkan.');
        router.refresh();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal menambah wilayah.');
      }
    });
  };

  const handleToggle = (region: Region) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await toggleRegionStatus(region.id, !region.is_active);
        router.refresh();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal mengubah status.');
      }
    });
  };

  const handleDelete = (region: Region) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await deleteRegion(region.id);
        router.refresh();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus wilayah.');
      }
    });
  };

  if (!tableReady) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-xs text-amber-900 space-y-2">
        <div className="font-bold text-sm">Data Master Wilayah Belum Tersedia</div>
        <p>
          Layanan master wilayah belum diinisialisasi di server. Silakan hubungi
          administrator sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs">
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add New Region + Seed Action */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand" />
            Tambah Kota / Kabupaten / Area Tujuan Baru
          </div>
          <button
            type="button"
            onClick={handleSeedDefault}
            disabled={isPending}
            className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 border border-slate-200 font-bold inline-flex items-center gap-1.5"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-brand" />
            )}
            Sinkronkan Wilayah Default Indonesia
          </button>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            list="province-suggestions"
            value={newProvince}
            onChange={(e) => setNewProvince(e.target.value)}
            placeholder="Provinsi (cth: Sulawesi Selatan)"
            className="h-9 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand"
          />
          <datalist id="province-suggestions">
            {provinces.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <input
            type="text"
            required
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="Kota / Kabupaten (cth: Makassar)"
            className="h-9 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand"
          />

          <button
            type="submit"
            disabled={isPending}
            className="h-9 px-4 rounded-xl bg-brand font-bold inline-flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Wilayah
          </button>
        </form>
      </div>

      {/* Filter & List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kota atau provinsi..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand"
            />
          </div>

          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand"
          >
            <option value="all">Semua Provinsi ({provinces.length})</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end text-slate-500 font-semibold">
            Menampilkan {filtered.length} dari {regions.length} wilayah
          </div>
        </div>

        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Kota / Kabupaten</th>
                <th className="py-2.5 px-3">Provinsi</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-gray-900">{r.city}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.province}</td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(r)}
                      disabled={isPending}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                        r.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {r.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      disabled={isPending}
                      title="Hapus Wilayah"
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
