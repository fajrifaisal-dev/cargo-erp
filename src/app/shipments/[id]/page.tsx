import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Printer,
  Tag,
  ArrowLeft,
  Truck,
  Ship,
  CheckCircle2,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { getShipmentById } from '@/app/actions/shipments';
import {
  formatRupiah,
  formatDateIndo,
  calculateVolumetricKg,
} from '@/lib/utils';
import { ShipmentStatusModal } from '@/components/shipments/ShipmentStatusModal';
import { ShipmentDeleteButton } from '@/components/shipments/ShipmentDeleteButton';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

interface ShipmentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShipmentDetailPage({
  params,
}: ShipmentDetailPageProps) {
  const { id } = await params;
  const shipment = await getShipmentById(id);

  if (!shipment) {
    notFound();
  }

  const items = shipment.items || [];
  const totalActualKg = items.reduce((sum, it) => sum + Number(it.actual_kg || 0), 0);
  const totalVolumetricKg = items.reduce(
    (sum, it) => sum + calculateVolumetricKg(Number(it.dim_p), Number(it.dim_l), Number(it.dim_t)),
    0
  );
  const totalCBM = items.reduce((sum, it) => sum + Number(it.volume_cbm || 0), 0);

  const steps = [
    { name: 'Pending Gudang', status: 'Pending', icon: Truck },
    { name: 'Muat Kapal', status: 'Muat Kapal', icon: Ship },
    { name: 'Tiba Pelabuhan', status: 'Tiba Pelabuhan', icon: CheckCircle2 },
    { name: 'Diterima Cabang (POD)', status: 'Diterima Cabang', icon: CheckCircle2 },
  ];

  const currentStepIdx = steps.findIndex((s) => s.status === shipment.shipment_status);

  return (
    <div>
      <ControlPanel
        title={`Resi ${shipment.receipt_number}`}
        subtitle={`Booking: ${formatDateIndo(shipment.booking_date)}${
          shipment.pickup_date
            ? ` • Pickup: ${formatDateIndo(shipment.pickup_date)}`
            : ''
        } • ${shipment.origin_city} → ${shipment.destination_city}`}
        badge={shipment.shipment_status}
        actions={
          <>
            <Link
              href="/shipments"
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 border border-slate-200 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>

            <Link
              href={`/shipments/${shipment.id}/edit`}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white hover:bg-slate-100 text-gray-800 border border-slate-300 text-xs font-semibold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-brand" />
              <span>Edit Resi</span>
            </Link>

            <ShipmentStatusModal
              shipmentId={shipment.id}
              currentStatus={shipment.shipment_status}
              receivedDate={shipment.received_date}
              receiverPerson={shipment.receiver_person}
              podPhotoUrl={shipment.pod_photo_url}
            />

            <Link
              href={`/shipments/${shipment.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold text-xs transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak STT</span>
            </Link>

            <Link
              href={`/shipments/${shipment.id}/print-thermal`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-colors"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Thermal Label</span>
            </Link>

            {shipment.deleted_at ? (
              <ShipmentDeleteButton
                shipmentId={shipment.id}
                receiptNumber={shipment.receipt_number}
                mode="restore"
                variant="button"
              />
            ) : (
              <ShipmentDeleteButton
                shipmentId={shipment.id}
                receiptNumber={shipment.receipt_number}
                mode="soft"
                variant="button"
                redirectTo="/shipments"
              />
            )}
          </>
        }
      />

      <div className="p-6 space-y-5 max-w-6xl mx-auto text-xs">
        {shipment.deleted_at && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold">Resi Ini Berada di Tong Sampah (Soft Deleted)</div>
              <div className="text-[11px] text-rose-700">
                Resi disembunyikan dari daftar operasional aktif. Klik Pulihkan untuk mengaktifkannya kembali.
              </div>
            </div>
            <ShipmentDeleteButton
              shipmentId={shipment.id}
              receiptNumber={shipment.receipt_number}
              mode="restore"
              variant="button"
            />
          </div>
        )}
        {/* Workflow Progress Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Status Perjalanan Kargo
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {steps.map((st, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={st.name}
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
                    isCurrent
                      ? 'bg-brand-soft border-brand-soft text-brand font-bold'
                      : isCompleted
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <st.icon className="w-4 h-4 flex-shrink-0" />
                  <div className="truncate">
                    <div className="text-[10px] uppercase opacity-75">Step {idx + 1}</div>
                    <div className="truncate">{st.name}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {shipment.shipment_status === 'Diterima Cabang' && shipment.receiver_person && (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <div>
                <span className="font-bold">Barang Telah Diserahkan:</span> Diterima oleh{' '}
                <span className="font-bold underline">{shipment.receiver_person}</span> pada{' '}
                <span>{formatDateIndo(shipment.received_date)}</span>
              </div>
              {shipment.pod_photo_url && (
                <a
                  href={shipment.pod_photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline flex items-center gap-1 font-bold text-[11px]"
                >
                  Lihat Foto Bukti POD <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Shipper & Consignee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Pengirim (Shipper)
            </div>
            <div className="font-bold text-sm text-gray-900">{shipment.sender_name}</div>
            {shipment.member && (
              <div className="text-brand font-semibold text-[11px]">
                Member: {shipment.member.name} (Termin: {shipment.member.payment_term_days} hari)
              </div>
            )}
            <div className="text-slate-600">Telp: {shipment.sender_phone || '-'}</div>
            <div className="text-slate-600">Kota Asal: {shipment.origin_city}</div>
            <div className="text-slate-600">Alamat: {shipment.sender_address || '-'}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Penerima (Consignee)
            </div>
            <div className="font-bold text-sm text-gray-900">{shipment.receiver_name}</div>
            <div className="text-slate-600">Telp: {shipment.receiver_phone || '-'}</div>
            <div className="text-slate-600">
              Kota Tujuan:{' '}
              <span className="font-bold text-brand">{shipment.destination_city}</span>
              {shipment.delivery_province ? ` (${shipment.delivery_province})` : ''}
            </div>
            <div className="text-slate-600">Alamat: {shipment.receiver_address || '-'}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-gray-900 uppercase tracking-wider text-xs">
              Rincian Koli Muatan Fisik ({items.length} Koli)
            </span>
            <div className="text-slate-500 text-xs">
              Barang: <span className="text-gray-900 font-bold">{shipment.goods_description}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Koli #</th>
                  <th className="py-2.5 px-3">Jenis Kemasan</th>
                  <th className="py-2.5 px-3">Dimensi (P × L × T cm)</th>
                  <th className="py-2.5 px-3">Berat Aktual</th>
                  <th className="py-2.5 px-3">Volumetrik (Kg)</th>
                  <th className="py-2.5 px-3">Kubikasi (CBM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                {items.map((it) => {
                  const volKg = calculateVolumetricKg(it.dim_p, it.dim_l, it.dim_t);

                  return (
                    <tr key={it.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-brand">#{it.koli_index}</td>
                      <td className="py-2.5 px-3 text-gray-900">{it.package_type}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {it.dim_p} × {it.dim_l} × {it.dim_t} cm
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{it.actual_kg} Kg</td>
                      <td className="py-2.5 px-3 text-slate-600">{volKg} Kg</td>
                      <td className="py-2.5 px-3 text-slate-500">{it.volume_cbm} CBM</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs tabular-nums">
            <div>
              Total Aktual: <span className="text-gray-900 font-bold">{totalActualKg} Kg</span>
            </div>
            <div>
              Total Volumetrik:{' '}
              <span className="text-gray-900 font-bold">{totalVolumetricKg.toFixed(1)} Kg</span>
            </div>
            <div>
              Total Volume:{' '}
              <span className="text-gray-900 font-bold">{totalCBM.toFixed(3)} CBM</span>
            </div>
            <div className="text-brand font-bold">
              Chargeable: {Math.max(totalActualKg, totalVolumetricKg).toFixed(1)} Kg
            </div>
          </div>
        </div>

        {/* Billing & Relations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Rincian Biaya Tagihan (Billing)
            </div>
            <div className="space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-500">Ongkir Pokok:</span>
                <span className="text-gray-900 font-semibold">{formatRupiah(shipment.shipping_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biaya Packing:</span>
                <span className="text-gray-900">{formatRupiah(shipment.packing_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Premi Asuransi:</span>
                <span className="text-gray-900">{formatRupiah(shipment.insurance_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biaya Lain-Lain:</span>
                <span className="text-gray-900">{formatRupiah(shipment.other_cost)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-brand">
                <span>Total Tagihan:</span>
                <span>{formatRupiah(shipment.total_bill)}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Tipe / Status Bayar:</span>
              <span
                className={`px-2.5 py-0.5 rounded-xl font-bold border ${
                  shipment.payment_status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {shipment.payment_type} • {shipment.payment_status}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Daftar Muat Kapal & Invoice
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Manifest Muatan (Daftar Muat):</span>
              {shipment.manifest ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-brand font-mono">
                      {shipment.manifest.manifest_number}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Vendor: {shipment.manifest.vendor_name} ({shipment.manifest.vessel_name || '-'})
                    </div>
                  </div>
                  <Link
                    href={`/manifests/${shipment.manifest.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-gray-800 border border-slate-200 text-xs font-semibold"
                  >
                    Buka Manifest
                  </Link>
                </div>
              ) : (
                <div className="text-slate-400 italic">
                  Belum di-assign ke Daftar Muat Kapal manapun.
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Faktur Tagihan (Invoice):</span>
              {shipment.invoice_id ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="font-bold text-gray-900">
                    Tercakup dalam Invoice Penagihan
                  </div>
                  <Link
                    href={`/invoices/${shipment.invoice_id}`}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-gray-800 border border-slate-200 text-xs font-semibold"
                  >
                    Buka Invoice
                  </Link>
                </div>
              ) : (
                <div className="text-slate-400 italic">
                  {shipment.payment_type === 'Invoice'
                    ? 'Belum digabungkan ke Invoice penagihan member.'
                    : 'Bukan pembayaran invoice (Cash/COD).'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
