import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import {
  getManifestById,
  updateManifestStatus,
  removeShipmentFromManifest,
} from '@/app/actions/manifests';
import { getShipments } from '@/app/actions/shipments';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { AssignShipmentsModal } from '@/components/manifests/AssignShipmentsModal';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

interface ManifestDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ManifestDetailPage({
  params,
}: ManifestDetailPageProps) {
  const { id } = await params;
  const [manifest, pendingShipments] = await Promise.all([
    getManifestById(id),
    getShipments({ status: 'Pending' }),
  ]);

  if (!manifest) notFound();

  const assignedShipments = manifest.shipments || [];

  let totalKoli = 0;
  let totalWeight = 0;
  let totalRevenue = 0;

  assignedShipments.forEach((s) => {
    totalRevenue += Number(s.total_bill || 0);
    (s.items || []).forEach((item) => {
      totalKoli += 1;
      totalWeight += Number(item.actual_kg || 0);
    });
  });

  const vendorCost = Number(manifest.vendor_cost || 0);
  const grossMargin = totalRevenue - vendorCost;

  return (
    <div>
      <ControlPanel
        title={`Manifest ${manifest.manifest_number}`}
        subtitle={`${manifest.vendor_name} (${manifest.vessel_name || 'Tanpa Kapal'}) • Tujuan ${manifest.destination_city}`}
        badge={manifest.status}
        actions={
          <>
            <Link
              href="/manifests"
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 border border-slate-200 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>

            <AssignShipmentsModal
              manifestId={manifest.id}
              destinationCity={manifest.destination_city}
              availableShipments={pendingShipments}
            />

            <Link
              href={`/manifests/${manifest.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold text-xs transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak DM Pelayaran</span>
            </Link>
          </>
        }
      />

      <div className="p-6 space-y-5 max-w-6xl mx-auto text-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Vendor Pelayaran</div>
            <div className="text-base font-bold text-gray-900">{manifest.vendor_name}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              {manifest.vessel_name || 'Tanpa Nama Kapal'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Pelabuhan Tujuan</div>
            <div className="text-base font-bold text-brand">{manifest.destination_city}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              ETD: {formatDateIndo(manifest.departure_date)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Total Muatan Fisik</div>
            <div className="text-base font-bold text-gray-900 tabular-nums">
              {assignedShipments.length} STT
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5 tabular-nums">
              {totalKoli} Koli • {totalWeight.toFixed(1)} Kg
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Margin Muatan (Est.)</div>
            <div className="text-base font-bold text-emerald-700 tabular-nums">
              {formatRupiah(grossMargin)}
            </div>
            <div className="text-slate-500 text-[10px] mt-0.5 tabular-nums">
              Omzet: {formatRupiah(totalRevenue)} | Ongkos: {formatRupiah(vendorCost)}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <span className="text-gray-900 font-bold">Ubah Status Perjalanan Kapal:</span>
          <div className="flex flex-wrap gap-2">
            <form
              action={async () => {
                'use server';
                await updateManifestStatus(manifest.id, 'Transit');
              }}
            >
              <button
                type="submit"
                className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs ${
                  manifest.status === 'Transit'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Transit (Pelayaran)
              </button>
            </form>

            <form
              action={async () => {
                'use server';
                await updateManifestStatus(manifest.id, 'Arrived');
              }}
            >
              <button
                type="submit"
                className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs ${
                  manifest.status === 'Arrived'
                    ? 'bg-brand-soft text-brand border-brand-soft'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tiba di Pelabuhan
              </button>
            </form>

            <form
              action={async () => {
                'use server';
                await updateManifestStatus(manifest.id, 'Completed');
              }}
            >
              <button
                type="submit"
                className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs ${
                  manifest.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Selesai Bongkar
              </button>
            </form>
          </div>
        </div>

        {/* Assigned Shipments Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <span className="font-bold text-gray-900 uppercase tracking-wider text-xs">
              Daftar STT yang Dimuat dalam Kapal ({assignedShipments.length} Resi)
            </span>
          </div>

          {assignedShipments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Belum ada resi STT yang dimuat ke dalam manifest ini. Klik tombol{' '}
              <span className="text-brand font-bold">&quot;Assign STT ke Manifest Ini&quot;</span> di atas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">No. STT</th>
                    <th className="py-2.5 px-3">Pengirim</th>
                    <th className="py-2.5 px-3">Penerima</th>
                    <th className="py-2.5 px-3">Muatan</th>
                    <th className="py-2.5 px-3">Koli / Kg</th>
                    <th className="py-2.5 px-3">Tagihan</th>
                    <th className="py-2.5 px-4 text-right">Keluarkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedShipments.map((s) => {
                    const sItems = s.items || [];
                    const sKg = sItems.reduce((acc, it) => acc + Number(it.actual_kg || 0), 0);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-bold text-brand">
                          <Link href={`/shipments/${s.id}`} className="hover:underline">
                            {s.receipt_number}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-gray-900 font-semibold">{s.sender_name}</td>
                        <td className="py-2.5 px-3 text-gray-900">{s.receiver_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.goods_description}</td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                          {sItems.length} Koli • {sKg} Kg
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 tabular-nums">
                          {formatRupiah(s.total_bill)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <form
                            action={async () => {
                              'use server';
                              await removeShipmentFromManifest(s.id, manifest.id);
                            }}
                          >
                            <button
                              type="submit"
                              title="Keluarkan dari manifest"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
