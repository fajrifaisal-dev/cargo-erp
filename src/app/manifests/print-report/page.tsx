import { getManifests } from '@/app/actions/manifests';
import { getCompanySettings } from '@/app/actions/companies';
import { ReportPrintShell } from '@/components/print/ReportPrintShell';
import {
  buildFilterSummaryText,
  computeManifestsTotals,
} from '@/lib/report-summary';
import { formatDateIndo, formatRupiah } from '@/lib/utils';

export const revalidate = 0;

interface ManifestsPrintReportPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function ManifestsPrintReportPage({
  searchParams,
}: ManifestsPrintReportPageProps) {
  const params = await searchParams;
  const [manifests, company] = await Promise.all([
    getManifests(params),
    getCompanySettings(),
  ]);

  const totals = computeManifestsTotals(manifests);

  return (
    <ReportPrintShell
      company={company}
      reportTitle="REKAP DAFTAR MUAT KAPAL (MANIFEST)"
      filterSummary={buildFilterSummaryText(params)}
      backHref="/manifests"
      recordCountLabel={`${manifests.length} Manifest`}
    >
      <table className="w-full text-left border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-gray-100 border-b border-black font-bold uppercase">
            <th className="p-1.5 border-r border-black w-7 text-center">No</th>
            <th className="p-1.5 border-r border-black">No. Manifest</th>
            <th className="p-1.5 border-r border-black">Tgl Berangkat</th>
            <th className="p-1.5 border-r border-black">Vendor / Kapal</th>
            <th className="p-1.5 border-r border-black">Tujuan</th>
            <th className="p-1.5 border-r border-black text-center">Resi</th>
            <th className="p-1.5 border-r border-black text-center">Koli</th>
            <th className="p-1.5 border-r border-black text-right">Berat</th>
            <th className="p-1.5 border-r border-black text-right">CBM</th>
            <th className="p-1.5 border-r border-black text-right">Biaya Vendor</th>
            <th className="p-1.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {manifests.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-6 text-center text-gray-500">
                Tidak ada data manifest sesuai filter yang dipilih.
              </td>
            </tr>
          ) : (
            manifests.map((m, idx) => (
              <tr key={m.id} className="border-b border-gray-300">
                <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                <td className="p-1.5 border-r border-black font-bold font-mono">
                  {m.manifest_number}
                </td>
                <td className="p-1.5 border-r border-black tabular-nums">
                  {formatDateIndo(m.departure_date)}
                </td>
                <td className="p-1.5 border-r border-black">
                  <div className="font-semibold">{m.vendor_name}</div>
                  {m.vessel_name && (
                    <div className="text-[9px] text-gray-600">{m.vessel_name}</div>
                  )}
                </td>
                <td className="p-1.5 border-r border-black">{m.destination_city}</td>
                <td className="p-1.5 border-r border-black text-center tabular-nums">
                  {m.shipments_count || 0}
                </td>
                <td className="p-1.5 border-r border-black text-center tabular-nums">
                  {m.total_packages || 0}
                </td>
                <td className="p-1.5 border-r border-black text-right tabular-nums">
                  {m.total_weight || 0} Kg
                </td>
                <td className="p-1.5 border-r border-black text-right tabular-nums">
                  {m.total_cbm || 0}
                </td>
                <td className="p-1.5 border-r border-black text-right font-bold tabular-nums">
                  {formatRupiah(m.vendor_cost)}
                </td>
                <td className="p-1.5 font-semibold">{m.status}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black bg-gray-100 font-bold">
            <td colSpan={5} className="p-1.5 border-r border-black text-right">
              TOTAL ({manifests.length} MANIFEST):
            </td>
            <td className="p-1.5 border-r border-black text-center tabular-nums">
              {totals.resi}
            </td>
            <td className="p-1.5 border-r border-black text-center tabular-nums">
              {totals.koli}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {totals.weightKg} Kg
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {totals.cbm}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.vendorCost)}
            </td>
            <td className="p-1.5"></td>
          </tr>
        </tfoot>
      </table>
    </ReportPrintShell>
  );
}
