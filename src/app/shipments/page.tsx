import Link from 'next/link';
import {
  FileText,
  Plus,
  Printer,
  Tag,
  Search,
  Eye,
  Pencil,
  Calendar,
  Trash2,
} from 'lucide-react';
import { getShipments } from '@/app/actions/shipments';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { ExportButtons } from '@/components/layout/ExportButtons';
import { ShipmentDeleteButton } from '@/components/shipments/ShipmentDeleteButton';

export const revalidate = 0;

interface ShipmentsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    trash?: string;
  }>;
}

export default async function ShipmentsPage({ searchParams }: ShipmentsPageProps) {
  const params = await searchParams;
  const isTrash = params.trash === '1';
  const hasActiveFilter = Boolean(
    params.search ||
      (params.status && params.status !== 'all') ||
      (params.paymentStatus && params.paymentStatus !== 'all') ||
      params.dateFrom ||
      params.dateTo
  );
  const shipments = await getShipments({
    search: params.search,
    status: params.status,
    paymentStatus: params.paymentStatus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    onlyDeleted: isTrash,
  });

  return (
    <div>
      <ControlPanel
        title={isTrash ? 'Tong Sampah Resi (Soft Deleted)' : 'Daftar Resi Pengiriman (STT)'}
        subtitle={
          isTrash
            ? 'Resi yang dihapus sementara karena salah input. Anda dapat memulihkannya atau menghapus permanen.'
            : 'Kelola Surat Tanda Terima, status muatan kapal, dan bukti serah terima (POD).'
        }
        badge={`${shipments.length} Resi`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              excelPath="/api/shipments/export"
              pdfPath="/shipments/print-report"
              filters={{
                search: params.search,
                status: params.status,
                paymentStatus: params.paymentStatus,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
                trash: params.trash,
              }}
            />
            <Link
              href={isTrash ? '/shipments' : '/shipments?trash=1'}
              className={`flex items-center gap-1.5 px-3.5 h-9 text-xs font-semibold rounded-xl border transition-colors ${
                isTrash
                  ? 'bg-brand-soft text-brand border-brand-soft'
                  : 'bg-slate-100 hover:bg-slate-200 text-gray-700 border-slate-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isTrash ? 'Lihat Resi Aktif' : 'Tong Sampah'}</span>
            </Link>
            <Link
              href="/shipments/new"
              className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold rounded-xl bg-brand transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat STT Baru</span>
            </Link>
          </div>
        }
      >
        <form
          method="GET"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs items-center"
        >
          {isTrash && <input type="hidden" name="trash" value="1" />}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={params.search || ''}
              placeholder="Cari No. STT / Pengirim / Penerima / Kota..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              name="dateFrom"
              title="Dari Tanggal Booking"
              defaultValue={params.dateFrom || ''}
              className="w-full bg-transparent text-gray-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9">
            <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
              s/d
            </span>
            <input
              type="date"
              name="dateTo"
              title="Sampai Tanggal Booking"
              defaultValue={params.dateTo || ''}
              className="w-full bg-transparent text-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <select
              name="status"
              defaultValue={params.status || 'all'}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            >
              <option value="all">Semua Status Muatan</option>
              <option value="Pending">Pending di Gudang</option>
              <option value="Muat Kapal">Muat Kapal (DM)</option>
              <option value="Tiba Pelabuhan">Tiba di Pelabuhan</option>
              <option value="Diterima Cabang">Diterima Cabang (POD)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              name="paymentStatus"
              defaultValue={params.paymentStatus || 'all'}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            >
              <option value="all">Semua Bayar</option>
              <option value="Paid">Lunas (Paid)</option>
              <option value="Unpaid">Belum Lunas</option>
            </select>
            <button
              type="submit"
              className="px-3.5 h-9 rounded-xl bg-brand font-bold transition-colors flex-shrink-0"
            >
              Filter
            </button>
            {hasActiveFilter && (
              <Link
                href={isTrash ? '/shipments?trash=1' : '/shipments'}
                title="Reset Filter"
                className="px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 font-semibold border border-slate-200 inline-flex items-center flex-shrink-0"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </ControlPanel>

      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {shipments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-900">Tidak ada resi STT ditemukan</div>
              <div className="text-xs text-slate-500 mt-1">
                Coba sesuaikan kata kunci atau buat resi pengiriman baru.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">No. STT</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Pengirim</th>
                    <th className="py-3 px-3">Penerima & Rute</th>
                    <th className="py-3 px-3">Muatan / Koli</th>
                    <th className="py-3 px-3">Total Biaya</th>
                    <th className="py-3 px-3">Status Kirim</th>
                    <th className="py-3 px-3">Bayar</th>
                    <th className="py-3 px-4 text-right">Cetak & Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipments.map((s) => {
                    const items = s.items || [];
                    const totalKg = items.reduce((acc, i) => acc + Number(i.actual_kg || 0), 0);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-brand">
                          <Link href={`/shipments/${s.id}`} className="hover:underline">
                            {s.receipt_number}
                          </Link>
                          {s.ref_number && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              Ref: {s.ref_number}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                          {formatDateIndo(s.booking_date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{s.sender_name}</div>
                          {s.member && (
                            <span className="text-[10px] text-brand font-semibold">
                              [{s.member.name}]
                            </span>
                          )}
                          {s.sender_phone && (
                            <div className="text-[10px] text-slate-400">{s.sender_phone}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{s.receiver_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <span>{s.origin_city}</span>
                            <span>→</span>
                            <span className="text-brand font-bold">{s.destination_city}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-gray-800 truncate max-w-[140px]">
                            {s.goods_description}
                          </div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {items.length} Koli • {totalKg} Kg
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 tabular-nums">
                          {formatRupiah(s.total_bill)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold border ${
                              s.shipment_status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : s.shipment_status === 'Muat Kapal'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : s.shipment_status === 'Tiba Pelabuhan'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {s.shipment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold border ${
                              s.payment_status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {s.payment_type} • {s.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isTrash ? (
                              <>
                                <ShipmentDeleteButton
                                  shipmentId={s.id}
                                  receiptNumber={s.receipt_number}
                                  mode="restore"
                                />
                                <ShipmentDeleteButton
                                  shipmentId={s.id}
                                  receiptNumber={s.receipt_number}
                                  mode="permanent"
                                />
                              </>
                            ) : (
                              <>
                                <Link
                                  href={`/shipments/${s.id}`}
                                  title="Lihat Detail & Update Status"
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                  href={`/shipments/${s.id}/edit`}
                                  title="Edit Data Resi STT"
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                  href={`/shipments/${s.id}/print`}
                                  target="_blank"
                                  title="Cetak STT Continuous Form"
                                  className="p-1.5 rounded-xl bg-brand-soft text-brand border border-brand-soft"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                  href={`/shipments/${s.id}/print-thermal`}
                                  target="_blank"
                                  title="Cetak Thermal Barcode Label"
                                  className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200"
                                >
                                  <Tag className="w-3.5 h-3.5" />
                                </Link>
                                <ShipmentDeleteButton
                                  shipmentId={s.id}
                                  receiptNumber={s.receipt_number}
                                  mode="soft"
                                  variant="icon"
                                />
                              </>
                            )}
                          </div>
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
