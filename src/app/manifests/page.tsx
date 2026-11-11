import Link from 'next/link';
import { Ship, Plus, Printer, Eye } from 'lucide-react';
import { getManifests } from '@/app/actions/manifests';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

interface ManifestsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function ManifestsPage({ searchParams }: ManifestsPageProps) {
  const params = await searchParams;
  const manifests = await getManifests({
    search: params.search,
    status: params.status,
  });

  return (
    <div>
      <ControlPanel
        title="Daftar Muat Kapal Pelayaran (Manifest)"
        subtitle="Pengelompokan STT ke satu vendor pelayaran kontainer (Meratus, Temas, SPIL)."
        badge={`${manifests.length} Manifest`}
        actions={
          <Link
            href="/manifests/new"
            className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold rounded-xl bg-brand transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Manifest Baru</span>
          </Link>
        }
      >
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Cari No Manifest / Vendor / Nama Kapal..."
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand"
          />

          <select
            name="status"
            defaultValue={params.status || 'all'}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
          >
            <option value="all">Semua Status Pelayaran</option>
            <option value="Transit">Dalam Perjalanan (Transit)</option>
            <option value="Arrived">Tiba di Pelabuhan (Arrived)</option>
            <option value="Completed">Selesai Bongkar (Completed)</option>
          </select>

          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-900 font-bold border border-slate-200 transition-colors"
          >
            Terapkan Filter
          </button>
        </form>
      </ControlPanel>

      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {manifests.length === 0 ? (
            <div className="p-12 text-center">
              <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-900">Belum ada Manifest Kapal</div>
              <div className="text-xs text-slate-500 mt-1">
                Buat manifest baru untuk mulai mengelompokkan STT ke pelayaran.
              </div>
              <Link
                href="/manifests/new"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-brand shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Manifest Sekarang
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">No. Manifest</th>
                    <th className="py-3 px-3">Pelayaran (Vendor)</th>
                    <th className="py-3 px-3">Kapal & Voyage</th>
                    <th className="py-3 px-3">Tujuan Pelabuhan</th>
                    <th className="py-3 px-3">Tgl Berangkat</th>
                    <th className="py-3 px-3">Muatan (STT / Koli / Kg)</th>
                    <th className="py-3 px-3">Biaya Vendor</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manifests.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-brand">
                        <Link href={`/manifests/${m.id}`} className="hover:underline">
                          {m.manifest_number}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {m.vendor_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {m.vessel_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {m.destination_city}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                        {formatDateIndo(m.departure_date)}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">
                        <span className="text-brand font-bold">{m.shipments_count || 0}</span> STT •{' '}
                        <span className="text-gray-800">{m.total_packages || 0}</span> Koli •{' '}
                        <span className="text-slate-500">{m.total_weight || 0}</span> Kg
                      </td>
                      <td className="py-2.5 px-3 text-gray-800 font-semibold tabular-nums">
                        {formatRupiah(m.vendor_cost)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold border ${
                            m.status === 'Transit'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : m.status === 'Arrived'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/manifests/${m.id}`}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
                            title="Detail & Assign STT"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/manifests/${m.id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-xl bg-brand-soft text-brand border border-brand-soft"
                            title="Cetak Daftar Muat (DM)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
