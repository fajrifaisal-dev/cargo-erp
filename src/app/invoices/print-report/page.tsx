import { getInvoices } from '@/app/actions/invoices';
import { getCompanySettings } from '@/app/actions/companies';
import { ReportPrintShell } from '@/components/print/ReportPrintShell';
import {
  buildFilterSummaryText,
  computeInvoicesTotals,
} from '@/lib/report-summary';
import { formatDateIndo, formatRupiah } from '@/lib/utils';

export const revalidate = 0;

interface InvoicesPrintReportPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function InvoicesPrintReportPage({
  searchParams,
}: InvoicesPrintReportPageProps) {
  const params = await searchParams;
  const [invoices, company] = await Promise.all([
    getInvoices(params),
    getCompanySettings(),
  ]);

  const totals = computeInvoicesTotals(invoices);

  return (
    <ReportPrintShell
      company={company}
      reportTitle="REKAP INVOICE & PIUTANG MEMBER"
      filterSummary={buildFilterSummaryText(params)}
      backHref="/invoices"
      recordCountLabel={`${invoices.length} Invoice`}
    >
      <table className="w-full text-left border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-gray-100 border-b border-black font-bold uppercase">
            <th className="p-1.5 border-r border-black w-7 text-center">No</th>
            <th className="p-1.5 border-r border-black">No. Invoice</th>
            <th className="p-1.5 border-r border-black">Tgl Terbit</th>
            <th className="p-1.5 border-r border-black">Jatuh Tempo</th>
            <th className="p-1.5 border-r border-black">Member / PT</th>
            <th className="p-1.5 border-r border-black text-center">Resi</th>
            <th className="p-1.5 border-r border-black text-right">Subtotal</th>
            <th className="p-1.5 border-r border-black text-right">Diskon</th>
            <th className="p-1.5 border-r border-black text-right">Total Tagihan</th>
            <th className="p-1.5 border-r border-black text-right">Terbayar</th>
            <th className="p-1.5 border-r border-black text-right">Sisa Piutang</th>
            <th className="p-1.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={12} className="p-6 text-center text-gray-500">
                Tidak ada data invoice sesuai filter yang dipilih.
              </td>
            </tr>
          ) : (
            invoices.map((inv, idx) => {
              const total = Number(inv.total_amount || 0);
              const paid = Number(inv.paid_amount || 0);
              const remaining = Math.max(0, total - paid);
              return (
                <tr key={inv.id} className="border-b border-gray-300">
                  <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                  <td className="p-1.5 border-r border-black font-bold font-mono">
                    {inv.invoice_number}
                  </td>
                  <td className="p-1.5 border-r border-black tabular-nums">
                    {formatDateIndo(inv.invoice_date)}
                  </td>
                  <td className="p-1.5 border-r border-black tabular-nums">
                    {inv.due_date ? formatDateIndo(inv.due_date) : '-'}
                  </td>
                  <td className="p-1.5 border-r border-black font-semibold">
                    {inv.member?.name || '-'}
                  </td>
                  <td className="p-1.5 border-r border-black text-center tabular-nums">
                    {inv.shipments?.length || 0}
                  </td>
                  <td className="p-1.5 border-r border-black text-right tabular-nums">
                    {formatRupiah(inv.subtotal_amount)}
                  </td>
                  <td className="p-1.5 border-r border-black text-right tabular-nums">
                    {formatRupiah(inv.discount_amount)}
                  </td>
                  <td className="p-1.5 border-r border-black text-right font-bold tabular-nums">
                    {formatRupiah(total)}
                  </td>
                  <td className="p-1.5 border-r border-black text-right tabular-nums">
                    {formatRupiah(paid)}
                  </td>
                  <td className="p-1.5 border-r border-black text-right font-bold tabular-nums">
                    {formatRupiah(remaining)}
                  </td>
                  <td className="p-1.5 font-semibold">{inv.status}</td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black bg-gray-100 font-bold">
            <td colSpan={6} className="p-1.5 border-r border-black text-right">
              TOTAL ({invoices.length} INVOICE):
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.subtotal)}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.discount)}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.totalAmount)}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.paidAmount)}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.remainingAmount)}
            </td>
            <td className="p-1.5"></td>
          </tr>
        </tfoot>
      </table>
    </ReportPrintShell>
  );
}
