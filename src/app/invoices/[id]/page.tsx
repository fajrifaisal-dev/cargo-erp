import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { getInvoiceById } from '@/app/actions/invoices';
import { getAuthContext } from '@/lib/auth';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { isPdfProofUrl } from '@/lib/report-filters';
import { InvoicePaymentModal } from '@/components/invoices/InvoicePaymentModal';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;
  const [invoice, auth] = await Promise.all([
    getInvoiceById(id),
    getAuthContext(),
  ]);

  if (!invoice) notFound();
  const canManageInvoices = Boolean(auth?.canManageInvoices);

  const shipments = invoice.shipments || [];
  const remaining = Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount));

  return (
    <div>
      <ControlPanel
        title={`Invoice ${invoice.invoice_number}`}
        subtitle={`Member: ${invoice.member?.name || '-'} • Jatuh Tempo: ${formatDateIndo(invoice.due_date)}`}
        badge={invoice.status}
        actions={
          <>
            <Link
              href="/invoices"
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 border border-slate-200 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>

            {canManageInvoices && invoice.status !== 'Paid' && (
              <InvoicePaymentModal
                invoiceId={invoice.id}
                totalAmount={Number(invoice.total_amount)}
                paidAmount={Number(invoice.paid_amount)}
              />
            )}

            <Link
              href={`/invoices/${invoice.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold text-xs transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Invoice</span>
            </Link>
          </>
        }
      />

      <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 max-w-5xl mx-auto text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1.5 shadow-sm">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Ditagihkan Kepada (Member)
            </div>
            <div className="text-base font-bold text-gray-900">{invoice.member?.name}</div>
            <div className="text-slate-600">Telp: {invoice.member?.phone || '-'}</div>
            <div className="text-slate-600">Alamat: {invoice.member?.address || '-'}</div>
            <div className="text-brand font-semibold text-[11px] pt-1">
              Termin: {invoice.member?.payment_term_days} Hari Kerja
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Tanggal & Jatuh Tempo
            </div>
            <div>
              <span className="text-slate-500">Tanggal Faktur:</span>
              <div className="text-gray-900 font-bold">{formatDateIndo(invoice.invoice_date)}</div>
            </div>
            <div>
              <span className="text-slate-500">Batas Jatuh Tempo (Due Date):</span>
              <div className="text-rose-600 font-bold">{formatDateIndo(invoice.due_date)}</div>
            </div>
            {invoice.paid_at && (
              <div className="pt-1 text-emerald-700 font-semibold text-[11px]">
                Dilunasi Pada: {formatDateIndo(invoice.paid_at)}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm tabular-nums">
            <div className="text-brand font-bold uppercase text-[11px] pb-1.5 border-b border-slate-100">
              Status Pembayaran
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="text-gray-900">{formatRupiah(invoice.subtotal_amount)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Diskon:</span>
                <span className="text-rose-600">-{formatRupiah(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-slate-100 pt-1.5 text-gray-900">
              <span>Total Tagihan:</span>
              <span className="text-brand">{formatRupiah(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Telah Dibayar:</span>
              <span>{formatRupiah(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-rose-600 border-t border-slate-100 pt-1.5">
              <span>Sisa Pelunasan:</span>
              <span>{formatRupiah(remaining)}</span>
            </div>
          </div>
        </div>

        {invoice.payment_proof_url && (
          <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Bukti transfer pembayaran telah diunggah.</span>
              </div>
              <a
                href={invoice.payment_proof_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline flex items-center gap-1 font-bold text-[11px]"
              >
                Buka Ukuran Penuh <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {isPdfProofUrl(invoice.payment_proof_url) ? (
              <a
                href={invoice.payment_proof_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-200 text-gray-800 font-bold hover:bg-emerald-100/40 transition-colors"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Lihat Dokumen Bukti Bayar (PDF)</span>
              </a>
            ) : (
              <a
                href={invoice.payment_proof_url}
                target="_blank"
                rel="noreferrer"
                className="block max-w-xs rounded-2xl overflow-hidden border border-emerald-200 bg-white shadow-xs hover:opacity-95 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invoice.payment_proof_url}
                  alt={`Bukti transfer ${invoice.invoice_number}`}
                  className="max-h-48 w-full object-contain bg-slate-50"
                />
              </a>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 font-bold text-gray-900 uppercase text-xs">
            Rincian STT Terlampir ({shipments.length} Resi)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-4">No. STT</th>
                  <th className="py-2.5 px-3">Tgl Booking</th>
                  <th className="py-2.5 px-3">Penerima & Kota Tujuan</th>
                  <th className="py-2.5 px-3">Muatan</th>
                  <th className="py-2.5 px-3">Koli / Kg</th>
                  <th className="py-2.5 px-4 text-right">Tagihan Resi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => {
                  const sItems = s.items || [];
                  const sKg = sItems.reduce((acc, it) => acc + Number(it.actual_kg || 0), 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-brand">
                        <Link href={`/shipments/${s.id}`} className="hover:underline">
                          {s.receipt_number}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                        {formatDateIndo(s.booking_date)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-900">
                        <div className="font-semibold">{s.receiver_name}</div>
                        <div className="text-[11px] text-slate-500">{s.destination_city}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{s.goods_description}</td>
                      <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                        {sItems.length} Koli • {sKg} Kg
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-gray-900 tabular-nums">
                        {formatRupiah(s.total_bill)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
