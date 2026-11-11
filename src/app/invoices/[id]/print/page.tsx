import { notFound } from 'next/navigation';
import { getInvoiceById } from '@/app/actions/invoices';
import { getCompanySettings } from '@/app/actions/companies';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { PrintButton } from '@/components/print/PrintButton';

export const revalidate = 0;

interface PrintInvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PrintInvoicePage({
  params,
}: PrintInvoicePageProps) {
  const { id } = await params;
  const [invoice, company] = await Promise.all([
    getInvoiceById(id),
    getCompanySettings(),
  ]);

  if (!invoice) notFound();

  const shipments = invoice.shipments || [];

  return (
    <div className="bg-white text-black min-h-screen p-6 font-mono text-[11px] leading-tight">
      {/* Print Controls (hidden on print) */}
      <div className="no-print font-sans max-w-4xl mx-auto mb-6 p-4 rounded-3xl bg-white border border-slate-200 text-gray-900 flex items-center justify-between shadow-sm">
        <div>
          <div className="font-bold text-sm text-brand">
            Cetak Faktur Penagihan Resmi (Invoice)
          </div>
          <div className="text-xs text-slate-500">
            Dokumen penagihan resmi ekspedisi kepada member.
          </div>
        </div>
        <PrintButton label="Cetak Faktur (Ctrl + P)" />
      </div>

      <div className="max-w-4xl mx-auto border-2 border-black p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div className="flex items-start gap-3">
            {company?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-12 h-12 object-contain border border-black/20 p-0.5 flex-shrink-0"
              />
            )}
            <div>
              <div className="text-base font-black uppercase">
                {company?.name || 'PT. GEMA TUNGGAL PERKASA'}
              </div>
              <div className="text-[10px]">
                {company?.address || 'Jl. Kalimas Baru No.87, Surabaya'}
              </div>
              <div className="text-[10px]">
                Telp: {company?.phone || '031-1234567'} • Rek: {company?.bank_account || 'BCA 0123456789'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-black border border-black px-2 py-0.5">
              FAKTUR TAGIHAN (INVOICE)
            </div>
            <div className="text-sm font-bold mt-1">NO: {invoice.invoice_number}</div>
            <div className="text-[10px]">Tgl Terbit: {formatDateIndo(invoice.invoice_date)}</div>
          </div>
        </div>

        {/* Member & Due Date */}
        <div className="grid grid-cols-2 gap-4 border-b border-black pb-3 text-[10px]">
          <div className="space-y-1">
            <div className="font-bold underline uppercase">DITAGIHKAN KEPADA:</div>
            <div className="font-bold text-xs">{invoice.member?.name}</div>
            <div>Alamat: {invoice.member?.address || '-'}</div>
            <div>Telp: {invoice.member?.phone || '-'}</div>
          </div>

          <div className="space-y-1 text-right">
            <div>
              <span className="font-bold">JATUH TEMPO (DUE DATE): </span>
              <span className="font-black text-xs">{formatDateIndo(invoice.due_date)}</span>
            </div>
            <div>
              <span className="font-bold">STATUS PEMBAYARAN: </span>
              <span className="font-bold">{invoice.status.toUpperCase()}</span>
            </div>
            <div>
              <span className="font-bold">REKENING TRANSFER: </span>
              <span>{company?.bank_account || 'BCA 0123456789 a.n PT Gema Tunggal Perkasa'}</span>
            </div>
          </div>
        </div>

        {/* Tabel Rincian Resi */}
        <table className="w-full text-left border border-black text-[10px]">
          <thead>
            <tr className="border-b border-black bg-gray-100 font-bold">
              <th className="p-1.5 border-r border-black w-8 text-center">No</th>
              <th className="p-1.5 border-r border-black w-24">No. STT</th>
              <th className="p-1.5 border-r border-black w-24">Tanggal</th>
              <th className="p-1.5 border-r border-black w-32">Penerima & Kota</th>
              <th className="p-1.5 border-r border-black">Deskripsi Muatan</th>
              <th className="p-1.5 border-r border-black w-14 text-center">Koli</th>
              <th className="p-1.5 border-r border-black w-16 text-right">Berat</th>
              <th className="p-1.5 w-24 text-right">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, idx) => {
              const sItems = s.items || [];
              const sKg = sItems.reduce((acc, it) => acc + Number(it.actual_kg || 0), 0);

              return (
                <tr key={s.id} className="border-b border-black">
                  <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                  <td className="p-1.5 border-r border-black font-bold">{s.receipt_number}</td>
                  <td className="p-1.5 border-r border-black">{formatDateIndo(s.booking_date)}</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="font-bold">{s.receiver_name}</div>
                    <div className="text-[9px]">{s.destination_city}</div>
                  </td>
                  <td className="p-1.5 border-r border-black">{s.goods_description}</td>
                  <td className="p-1.5 border-r border-black text-center">{sItems.length}</td>
                  <td className="p-1.5 border-r border-black text-right">{sKg} Kg</td>
                  <td className="p-1.5 text-right font-bold">{formatRupiah(s.total_bill)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals & Notes */}
        <div className="grid grid-cols-2 gap-4 border-t border-black pt-3 text-[10px]">
          <div>
            <div className="font-bold underline">INSTRUKSI PEMBAYARAN:</div>
            <div className="mt-1 text-[9px] space-y-1">
              <div>1. Mohon transfer pembayaran ke rekening resmi di atas.</div>
              <div>2. Cantumkan Nomor Invoice pada berita transfer bank.</div>
              <div>3. Catatan: {invoice.notes || 'Pembayaran tepat waktu sangat dihargai.'}</div>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="flex justify-between">
              <span>Subtotal ({shipments.length} Resi):</span>
              <span>{formatRupiah(invoice.subtotal_amount)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span>Potongan / Diskon:</span>
                <span>-{formatRupiah(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs border-t border-black pt-1">
              <span>TOTAL TAGIHAN:</span>
              <span>{formatRupiah(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sudah Dibayar:</span>
              <span>{formatRupiah(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-1">
              <span>SISA PELUNASAN:</span>
              <span>
                {formatRupiah(
                  Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount))
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 gap-4 border-t border-black pt-4 text-center text-[10px]">
          <div>
            <div>Diterima Oleh (Pelanggan / Member),</div>
            <div className="h-16"></div>
            <div className="border-t border-dotted border-black pt-0.5">
              ( {invoice.member?.name} )
            </div>
          </div>
          <div>
            <div>Hormat Kami (Gema Trans),</div>
            <div className="h-16"></div>
            <div className="border-t border-dotted border-black pt-0.5">
              ( Bagian Keuangan & Penagihan )
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
