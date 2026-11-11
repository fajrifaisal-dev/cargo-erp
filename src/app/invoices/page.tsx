import Link from 'next/link';
import { Receipt, Plus, Eye, Printer, Calendar } from 'lucide-react';
import { getInvoices } from '@/app/actions/invoices';
import { getAuthContext } from '@/lib/auth';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { ExportButtons } from '@/components/layout/ExportButtons';

export const revalidate = 0;

interface InvoicesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const hasActiveFilter = Boolean(
    params.search ||
      (params.status && params.status !== 'all') ||
      params.dateFrom ||
      params.dateTo
  );
  const [invoices, auth] = await Promise.all([
    getInvoices({
      search: params.search,
      status: params.status,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    getAuthContext(),
  ]);
  const canManageInvoices = Boolean(auth?.canManageInvoices);

  return (
    <div>
      <ControlPanel
        title="Invoice & Faktur Penagihan Member"
        subtitle="Rekap tagihan resmi resi non-tunai per langganan/shipper dengan jatuh tempo (TOP)."
        badge={
          canManageInvoices
            ? `${invoices.length} Invoice`
            : `${invoices.length} Invoice • Lihat Saja`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              excelPath="/api/invoices/export"
              pdfPath="/invoices/print-report"
              filters={{
                search: params.search,
                status: params.status,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
              }}
            />
            {canManageInvoices && (
              <Link
                href="/invoices/new"
                className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold rounded-xl bg-brand transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Invoice Baru</span>
              </Link>
            )}
          </div>
        }
      >
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs items-center">
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Cari No Invoice..."
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand"
          />

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              name="dateFrom"
              title="Dari Tanggal Invoice"
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
              title="Sampai Tanggal Invoice"
              defaultValue={params.dateTo || ''}
              className="w-full bg-transparent text-gray-900 focus:outline-none"
            />
          </div>

          <select
            name="status"
            defaultValue={params.status || 'all'}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
          >
            <option value="all">Semua Status Bayar</option>
            <option value="Unpaid">Belum Lunas (Unpaid)</option>
            <option value="Partial">Sebagian (Partial)</option>
            <option value="Paid">Lunas (Paid)</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 h-9 px-4 rounded-xl bg-brand font-bold transition-colors"
            >
              Filter
            </button>
            {hasActiveFilter && (
              <Link
                href="/invoices"
                className="px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 font-semibold border border-slate-200 inline-flex items-center"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </ControlPanel>

      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto text-xs">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-900">Belum ada faktur tagihan</div>
              <div className="text-xs text-slate-500 mt-1">
                Buat invoice untuk menagih resi-resi member bertempo.
              </div>
              {canManageInvoices && (
                <Link
                  href="/invoices/new"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-brand shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Buat Invoice Sekarang
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">No. Invoice</th>
                    <th className="py-3 px-3">Member / Shipper</th>
                    <th className="py-3 px-3">Tgl Terbit</th>
                    <th className="py-3 px-3">Jatuh Tempo</th>
                    <th className="py-3 px-3">Total Tagihan</th>
                    <th className="py-3 px-3">Sudah Dibayar</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-brand">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">
                          {inv.member?.name || 'Member Terhapus'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          TOP: {inv.member?.payment_term_days || 14} hari
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                        {formatDateIndo(inv.invoice_date)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-800 font-semibold tabular-nums">
                        {formatDateIndo(inv.due_date)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900 tabular-nums">
                        {formatRupiah(inv.total_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-semibold tabular-nums">
                        {formatRupiah(inv.paid_amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold border ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.status === 'Partial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
                            title="Detail & Catat Bayar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/invoices/${inv.id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-xl bg-brand-soft text-brand border border-brand-soft"
                            title="Cetak Faktur Tagihan"
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
