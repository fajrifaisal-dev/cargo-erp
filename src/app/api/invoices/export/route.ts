import { NextRequest, NextResponse } from 'next/server';
import { getInvoices } from '@/app/actions/invoices';
import { getCompanySettings } from '@/app/actions/companies';
import { buildStyledExcelResponse } from '@/lib/excel-export';
import {
  buildFilterSummaryText,
  computeInvoicesTotals,
} from '@/lib/report-summary';

export async function GET(request: NextRequest) {
  let invoices;
  let company;
  const sp = request.nextUrl.searchParams;
  const filters = {
    search: sp.get('search') || undefined,
    status: sp.get('status') || undefined,
    dateFrom: sp.get('dateFrom') || undefined,
    dateTo: sp.get('dateTo') || undefined,
  };

  try {
    [invoices, company] = await Promise.all([
      getInvoices(filters),
      getCompanySettings(),
    ]);
  } catch {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }

  const totals = computeInvoicesTotals(invoices);
  const rows = invoices.map((inv) => {
    const total = Number(inv.total_amount || 0);
    const paid = Number(inv.paid_amount || 0);
    const remaining = Math.max(0, total - paid);
    return {
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date || '-',
      member_name: inv.member?.name || '-',
      shipments_count: inv.shipments?.length || 0,
      subtotal_amount: Number(inv.subtotal_amount || 0),
      discount_amount: Number(inv.discount_amount || 0),
      total_amount: total,
      paid_amount: paid,
      remaining_amount: remaining,
      status: inv.status,
      paid_at: inv.paid_at ? inv.paid_at.slice(0, 10) : '-',
    };
  });

  const stamp = new Date().toISOString().slice(0, 10);

  return buildStyledExcelResponse({
    fileName: `rekap-invoice-${stamp}.xlsx`,
    sheetName: 'Rekap Invoice',
    title: `${company?.name || 'CARGO ERP'} — REKAP INVOICE PENAGIHAN`,
    subtitle: `${buildFilterSummaryText(filters)} • Total ${invoices.length} Invoice`,
    columns: [
      { header: 'No. Invoice', key: 'invoice_number', width: 22 },
      { header: 'Tgl Terbit', key: 'invoice_date', width: 13 },
      { header: 'Jatuh Tempo', key: 'due_date', width: 13 },
      { header: 'Member / PT', key: 'member_name', width: 28 },
      { header: 'Jml Resi', key: 'shipments_count', width: 10, numFmt: '#,##0', align: 'center' },
      { header: 'Subtotal (Rp)', key: 'subtotal_amount', width: 16, numFmt: '#,##0', align: 'right' },
      { header: 'Diskon (Rp)', key: 'discount_amount', width: 14, numFmt: '#,##0', align: 'right' },
      { header: 'Total Tagihan (Rp)', key: 'total_amount', width: 18, numFmt: '#,##0', align: 'right' },
      { header: 'Sudah Dibayar (Rp)', key: 'paid_amount', width: 18, numFmt: '#,##0', align: 'right' },
      { header: 'Sisa Piutang (Rp)', key: 'remaining_amount', width: 18, numFmt: '#,##0', align: 'right' },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Tgl Lunas', key: 'paid_at', width: 13 },
    ],
    rows,
    summaryRow: {
      invoice_number: `TOTAL (${invoices.length} INVOICE)`,
      subtotal_amount: totals.subtotal,
      discount_amount: totals.discount,
      total_amount: totals.totalAmount,
      paid_amount: totals.paidAmount,
      remaining_amount: totals.remainingAmount,
    },
  });
}
