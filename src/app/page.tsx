import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Ship,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  Package,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { getAuthContext } from '@/lib/auth';
import { getShipments } from '@/app/actions/shipments';
import { getManifests } from '@/app/actions/manifests';
import { getInvoices } from '@/app/actions/invoices';
import { checkDatabaseStatus } from '@/app/actions/companies';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }
  if (auth.needsMfaVerification) {
    redirect('/login?mfa=1');
  }
  if (!auth.activeCompanyId || !auth.activeRole) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-xs text-amber-900 space-y-2">
          <div className="font-bold text-sm">Belum Ada Akses Tenant Ekspedisi</div>
          <p>
            Akun Anda ({auth.email}) belum ditugaskan ke ekspedisi mana pun, atau belum ada data ekspedisi di database. Silakan hubungi Master Admin untuk menambahkan akses role Anda.
          </p>
        </div>
      </div>
    );
  }

  const [shipments, manifests, invoices, dbStatus] = await Promise.all([
    getShipments({ limit: 10 }),
    getManifests({ status: 'Transit' }),
    getInvoices(),
    checkDatabaseStatus(),
  ]);

  const totalShipments = shipments.length;
  const pendingManifests = manifests.length;
  const unpaidInvoices = invoices.filter((i) => i.status !== 'Paid');
  const unpaidTotal = unpaidInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total_amount) - Number(inv.paid_amount)),
    0
  );

  let totalKoli = 0;
  let totalWeight = 0;
  shipments.forEach((s) => {
    (s.items || []).forEach((item) => {
      totalKoli += 1;
      totalWeight += Number(item.actual_kg || 0);
    });
  });

  return (
    <div>
      {/* Odoo 19 Control Panel */}
      <ControlPanel
        title="Ringkasan Operasional Hari Ini"
        subtitle="Operasional Pelabuhan Kalimas Baru — Surabaya ke Kawasan Timur Indonesia"
        badge="Live"
        actions={
          <>
            <Link
              href="/shipments/new"
              className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold rounded-xl bg-brand transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat STT Baru</span>
            </Link>
            <Link
              href="/manifests/new"
              className="flex items-center gap-1.5 px-4 h-9 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-gray-900 border border-slate-200 transition-colors"
            >
              <Ship className="w-3.5 h-3.5 text-brand" />
              <span>Daftar Muat Baru</span>
            </Link>
          </>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Database Diagnostic Banner (only shown if Supabase returns an error) */}
        {!dbStatus.ok && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Layanan Data Sedang Terganggu</div>
              <div className="mt-0.5 text-amber-800 text-[11px]">
                {dbStatus.error ||
                  'Terjadi kendala saat memuat data. Silakan muat ulang halaman atau hubungi administrator sistem.'}
              </div>
            </div>
          </div>
        )}

        {/* Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Total Resi STT</span>
              <div className="w-8 h-8 rounded-xl bg-brand-soft flex items-center justify-center">
                <FileText className="w-4 h-4 text-brand" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-gray-900 tabular-nums">
                {totalShipments}
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xl">
                Aktif
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {totalKoli} Koli ({totalWeight.toFixed(1)} Kg)
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Kapal Dalam Transit</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                <Ship className="w-4 h-4 text-sky-600" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-gray-900 tabular-nums">
                {pendingManifests}
              </div>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-xl">
                Pelayaran
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Rute Kawasan Timur Indonesia
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Tagihan Member Terbuka</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-gray-900 tabular-nums">
                {unpaidInvoices.length}
              </div>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-xl">
                Belum Lunas
              </span>
            </div>
            <div className="mt-2 text-xs font-bold text-rose-600 tabular-nums">
              {formatRupiah(unpaidTotal)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Status Pengiriman</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Pending di Gudang:</span>
                <span className="font-bold text-amber-700 tabular-nums">
                  {shipments.filter((s) => s.shipment_status === 'Pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Muat Kapal:</span>
                <span className="font-bold text-sky-700 tabular-nums">
                  {shipments.filter((s) => s.shipment_status === 'Muat Kapal').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Selesai (POD):</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  {shipments.filter((s) => s.shipment_status === 'Diterima Cabang').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Shipments Card */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-gray-900">
                Resi Pengiriman Terkini (STT)
              </h3>
            </div>
            <Link
              href="/shipments"
              className="text-xs text-brand hover:underline flex items-center gap-1 font-bold"
            >
              Lihat Semua STT <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {shipments.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-medium text-slate-500">
                Belum ada resi STT yang dibuat.
              </div>
              <Link
                href="/shipments/new"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-brand shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Resi Pertama
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">No. STT</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Pengirim / Member</th>
                    <th className="py-2.5 px-3">Penerima & Tujuan</th>
                    <th className="py-2.5 px-3">Muatan & Koli</th>
                    <th className="py-2.5 px-3">Total Tagihan</th>
                    <th className="py-2.5 px-3">Status Kirim</th>
                    <th className="py-2.5 px-3">Bayar</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipments.map((s) => {
                    const koliCount = (s.items || []).length;
                    const totalKg = (s.items || []).reduce(
                      (sum, item) => sum + Number(item.actual_kg || 0),
                      0
                    );

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-brand">
                          <Link href={`/shipments/${s.id}`} className="hover:underline">
                            {s.receipt_number}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                          {formatDateIndo(s.booking_date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900">
                            {s.sender_name}
                          </div>
                          {s.member && (
                            <span className="inline-block text-[10px] text-brand font-semibold">
                              [{s.member.name}]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900">
                            {s.receiver_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {s.destination_city}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-gray-800 truncate max-w-[150px]">
                            {s.goods_description}
                          </div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {koliCount} Koli • {totalKg} Kg
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
                            {s.payment_type} ({s.payment_status})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/shipments/${s.id}`}
                              className="px-2.5 py-1 text-[11px] rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold"
                            >
                              Detail
                            </Link>
                            <Link
                              href={`/shipments/${s.id}/print`}
                              target="_blank"
                              className="px-2.5 py-1 text-[11px] rounded-xl bg-brand-soft text-brand border border-brand-soft font-semibold"
                            >
                              Cetak
                            </Link>
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
