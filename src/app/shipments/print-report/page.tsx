import { getShipments } from '@/app/actions/shipments';
import { getCompanySettings } from '@/app/actions/companies';
import { ReportPrintShell } from '@/components/print/ReportPrintShell';
import {
  buildFilterSummaryText,
  computeShipmentMetrics,
  computeShipmentsTotals,
} from '@/lib/report-summary';
import { formatDateIndo, formatRupiah } from '@/lib/utils';

export const revalidate = 0;

interface ShipmentsPrintReportPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    trash?: string;
  }>;
}

export default async function ShipmentsPrintReportPage({
  searchParams,
}: ShipmentsPrintReportPageProps) {
  const params = await searchParams;
  const isTrash = params.trash === '1';

  const [shipments, company] = await Promise.all([
    getShipments({
      search: params.search,
      status: params.status,
      paymentStatus: params.paymentStatus,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      onlyDeleted: isTrash,
    }),
    getCompanySettings(),
  ]);

  const totals = computeShipmentsTotals(shipments);

  return (
    <ReportPrintShell
      company={company}
      reportTitle="REKAP DATA PENGIRIMAN (STT)"
      filterSummary={buildFilterSummaryText({ ...params, trash: isTrash })}
      backHref={isTrash ? '/shipments?trash=1' : '/shipments'}
      recordCountLabel={`${shipments.length} Resi`}
    >
      <table className="w-full text-left border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-gray-100 border-b border-black font-bold uppercase">
            <th className="p-1.5 border-r border-black w-7 text-center">No</th>
            <th className="p-1.5 border-r border-black">No. STT / Tgl</th>
            <th className="p-1.5 border-r border-black">Pengirim / Member</th>
            <th className="p-1.5 border-r border-black">Penerima</th>
            <th className="p-1.5 border-r border-black">Rute / Via</th>
            <th className="p-1.5 border-r border-black text-center">Koli</th>
            <th className="p-1.5 border-r border-black text-right">Berat</th>
            <th className="p-1.5 border-r border-black text-right">CBM</th>
            <th className="p-1.5 border-r border-black text-right">Ongkir (Rp)</th>
            <th className="p-1.5 border-r border-black">Bayar</th>
            <th className="p-1.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {shipments.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-6 text-center text-gray-500">
                Tidak ada data pengiriman sesuai filter yang dipilih.
              </td>
            </tr>
          ) : (
            shipments.map((s, idx) => {
              const m = computeShipmentMetrics(s);
              return (
                <tr key={s.id} className="border-b border-gray-300">
                  <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="font-bold font-mono">{s.receipt_number}</div>
                    <div className="text-[9px] text-gray-600">{formatDateIndo(s.booking_date)}</div>
                  </td>
                  <td className="p-1.5 border-r border-black font-semibold">
                    {s.member?.name || s.sender_name}
                  </td>
                  <td className="p-1.5 border-r border-black">{s.receiver_name}</td>
                  <td className="p-1.5 border-r border-black">
                    <div>
                      {s.origin_city} → {s.destination_city}
                    </div>
                    <div className="text-[9px] text-gray-600">
                      {s.service_type} ({s.transport_via})
                    </div>
                  </td>
                  <td className="p-1.5 border-r border-black text-center tabular-nums">
                    {m.koli}
                  </td>
                  <td className="p-1.5 border-r border-black text-right tabular-nums">
                    {m.actualKg} Kg
                  </td>
                  <td className="p-1.5 border-r border-black text-right tabular-nums">
                    {m.cbm}
                  </td>
                  <td className="p-1.5 border-r border-black text-right font-bold tabular-nums">
                    {formatRupiah(m.totalBill)}
                  </td>
                  <td className="p-1.5 border-r border-black">
                    {s.payment_type} ({s.payment_status})
                  </td>
                  <td className="p-1.5 font-semibold">{s.shipment_status}</td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black bg-gray-100 font-bold">
            <td colSpan={5} className="p-1.5 border-r border-black text-right">
              TOTAL ({shipments.length} RESI):
            </td>
            <td className="p-1.5 border-r border-black text-center tabular-nums">
              {totals.koli}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {totals.actualKg} Kg
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {totals.cbm}
            </td>
            <td className="p-1.5 border-r border-black text-right tabular-nums">
              {formatRupiah(totals.totalBill)}
            </td>
            <td colSpan={2} className="p-1.5"></td>
          </tr>
        </tfoot>
      </table>
    </ReportPrintShell>
  );
}
