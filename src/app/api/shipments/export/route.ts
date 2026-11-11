import { NextRequest, NextResponse } from 'next/server';
import { getShipments } from '@/app/actions/shipments';
import { getCompanySettings } from '@/app/actions/companies';
import { buildStyledExcelResponse } from '@/lib/excel-export';
import {
  buildFilterSummaryText,
  computeShipmentMetrics,
  computeShipmentsTotals,
} from '@/lib/report-summary';

export async function GET(request: NextRequest) {
  let company;
  let shipments;
  const sp = request.nextUrl.searchParams;
  const filters = {
    search: sp.get('search') || undefined,
    status: sp.get('status') || undefined,
    paymentStatus: sp.get('paymentStatus') || undefined,
    dateFrom: sp.get('dateFrom') || undefined,
    dateTo: sp.get('dateTo') || undefined,
    trash: sp.get('trash') === '1',
  };

  try {
    [shipments, company] = await Promise.all([
      getShipments({
        search: filters.search,
        status: filters.status,
        paymentStatus: filters.paymentStatus,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        onlyDeleted: filters.trash,
      }),
      getCompanySettings(),
    ]);
  } catch {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }

  const totals = computeShipmentsTotals(shipments);
  const rows = shipments.map((s) => {
    const m = computeShipmentMetrics(s);
    return {
      receipt_number: s.receipt_number,
      booking_date: s.booking_date,
      sender_name: s.member?.name || s.sender_name,
      receiver_name: s.receiver_name,
      route: `${s.origin_city} - ${s.destination_city}`,
      service_via: `${s.service_type} (${s.transport_via})`,
      koli: m.koli,
      actual_kg: m.actualKg,
      cbm: m.cbm,
      total_bill: m.totalBill,
      payment_type: s.payment_type,
      payment_status: s.payment_status,
      shipment_status: s.shipment_status,
      manifest_number: s.manifest?.manifest_number || '-',
      invoice_number: s.invoice?.invoice_number || '-',
    };
  });

  const stamp = new Date().toISOString().slice(0, 10);

  return buildStyledExcelResponse({
    fileName: `rekap-pengiriman-stt-${stamp}.xlsx`,
    sheetName: 'Data Pengiriman STT',
    title: `${company?.name || 'CARGO ERP'} — REKAP DATA PENGIRIMAN (STT)`,
    subtitle: `${buildFilterSummaryText(filters)} • Total ${shipments.length} Resi`,
    columns: [
      { header: 'No. STT', key: 'receipt_number', width: 20 },
      { header: 'Tgl Booking', key: 'booking_date', width: 13 },
      { header: 'Pengirim / Member', key: 'sender_name', width: 26 },
      { header: 'Penerima', key: 'receiver_name', width: 24 },
      { header: 'Rute', key: 'route', width: 24 },
      { header: 'Layanan / Via', key: 'service_via', width: 20 },
      { header: 'Koli', key: 'koli', width: 8, numFmt: '#,##0', align: 'center' },
      { header: 'Berat (Kg)', key: 'actual_kg', width: 12, numFmt: '#,##0.00', align: 'right' },
      { header: 'Volume (CBM)', key: 'cbm', width: 13, numFmt: '#,##0.000', align: 'right' },
      { header: 'Total Ongkir (Rp)', key: 'total_bill', width: 18, numFmt: '#,##0', align: 'right' },
      { header: 'Tipe Bayar', key: 'payment_type', width: 12 },
      { header: 'Status Bayar', key: 'payment_status', width: 13 },
      { header: 'Status Muatan', key: 'shipment_status', width: 16 },
      { header: 'No. Manifest', key: 'manifest_number', width: 18 },
      { header: 'No. Invoice', key: 'invoice_number', width: 18 },
    ],
    rows,
    summaryRow: {
      receipt_number: `TOTAL (${shipments.length} RESI)`,
      koli: totals.koli,
      actual_kg: totals.actualKg,
      cbm: totals.cbm,
      total_bill: totals.totalBill,
    },
  });
}
