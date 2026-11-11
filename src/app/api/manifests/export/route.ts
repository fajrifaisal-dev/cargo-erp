import { NextRequest, NextResponse } from 'next/server';
import { getManifests } from '@/app/actions/manifests';
import { getCompanySettings } from '@/app/actions/companies';
import { buildStyledExcelResponse } from '@/lib/excel-export';
import {
  buildFilterSummaryText,
  computeManifestsTotals,
} from '@/lib/report-summary';

export async function GET(request: NextRequest) {
  let manifests;
  let company;
  const sp = request.nextUrl.searchParams;
  const filters = {
    search: sp.get('search') || undefined,
    status: sp.get('status') || undefined,
    dateFrom: sp.get('dateFrom') || undefined,
    dateTo: sp.get('dateTo') || undefined,
  };

  try {
    [manifests, company] = await Promise.all([
      getManifests(filters),
      getCompanySettings(),
    ]);
  } catch {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }

  const totals = computeManifestsTotals(manifests);
  const rows = manifests.map((m) => ({
    manifest_number: m.manifest_number,
    departure_date: m.departure_date,
    vendor_name: m.vendor_name,
    vessel_name: m.vessel_name || '-',
    destination_city: m.destination_city,
    shipments_count: Number(m.shipments_count || 0),
    total_packages: Number(m.total_packages || 0),
    total_weight: Number(m.total_weight || 0),
    total_cbm: Number(m.total_cbm || 0),
    vendor_cost: Number(m.vendor_cost || 0),
    status: m.status,
  }));

  const stamp = new Date().toISOString().slice(0, 10);

  return buildStyledExcelResponse({
    fileName: `rekap-daftar-muat-dm-${stamp}.xlsx`,
    sheetName: 'Daftar Muat Manifest',
    title: `${company?.name || 'CARGO ERP'} — REKAP DAFTAR MUAT (MANIFEST)`,
    subtitle: `${buildFilterSummaryText(filters)} • Total ${manifests.length} Manifest`,
    columns: [
      { header: 'No. Manifest (DM)', key: 'manifest_number', width: 22 },
      { header: 'Tgl Berangkat', key: 'departure_date', width: 14 },
      { header: 'Vendor Pelayaran', key: 'vendor_name', width: 24 },
      { header: 'Nama Kapal', key: 'vessel_name', width: 22 },
      { header: 'Kota Tujuan', key: 'destination_city', width: 18 },
      { header: 'Jml Resi', key: 'shipments_count', width: 10, numFmt: '#,##0', align: 'center' },
      { header: 'Total Koli', key: 'total_packages', width: 11, numFmt: '#,##0', align: 'center' },
      { header: 'Berat (Kg)', key: 'total_weight', width: 13, numFmt: '#,##0.00', align: 'right' },
      { header: 'Volume (CBM)', key: 'total_cbm', width: 13, numFmt: '#,##0.000', align: 'right' },
      { header: 'Biaya Vendor (Rp)', key: 'vendor_cost', width: 18, numFmt: '#,##0', align: 'right' },
      { header: 'Status', key: 'status', width: 14 },
    ],
    rows,
    summaryRow: {
      manifest_number: `TOTAL (${manifests.length} DM)`,
      shipments_count: totals.resi,
      total_packages: totals.koli,
      total_weight: totals.weightKg,
      total_cbm: totals.cbm,
      vendor_cost: totals.vendorCost,
    },
  });
}
