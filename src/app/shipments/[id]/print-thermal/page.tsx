import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getShipmentById } from '@/app/actions/shipments';
import { getCompanySettings } from '@/app/actions/companies';
import { PrintButton } from '@/components/print/PrintButton';

export const revalidate = 0;

interface PrintThermalPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

export default async function PrintThermalPage({
  params,
  searchParams,
}: PrintThermalPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [shipment, activeCompany] = await Promise.all([
    getShipmentById(id),
    getCompanySettings(),
  ]);

  if (!shipment) notFound();

  const company = shipment.company || activeCompany;
  const companyName = company?.name || 'EKSPEDISI CARGO';
  const companyAddress = company?.address || '-';
  const items = shipment.items || [];
  const totalKoli = items.length;

  const defaultMax = totalKoli > 150 ? 150 : totalKoli;
  const fromKoli =
    totalKoli === 0 ? 0 : Math.max(1, parseInt(query.from || '1', 10) || 1);
  const toKoli =
    totalKoli === 0
      ? 0
      : Math.min(
          totalKoli,
          Math.max(
            fromKoli,
            parseInt(query.to || String(defaultMax), 10) || defaultMax
          )
        );

  const visibleItems =
    totalKoli === 0 ? [] : items.slice(fromKoli - 1, toKoli);
  const reqHeaders = await headers();
  const forwardedHost =
    reqHeaders.get('x-forwarded-host') || reqHeaders.get('host');
  const forwardedProto =
    reqHeaders.get('x-forwarded-proto') ||
    (forwardedHost?.includes('localhost') || forwardedHost?.startsWith('127.')
      ? 'http'
      : 'https');
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const baseUrl =
    envBase || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '');
  const trackingPath = `/track/${encodeURIComponent(shipment.receipt_number)}`;
  const qrPayload = baseUrl ? `${baseUrl}${trackingPath}` : trackingPath;
  const qrSvg = await QRCode.toString(qrPayload, {
    type: 'svg',
    margin: 0,
    width: 112,
  });

  return (
    <div className="bg-slate-100 min-h-screen p-4 font-sans text-black">
      {/* Control panel (hidden on print) */}
      <div className="no-print max-w-md mx-auto mb-5 p-4 bg-white border border-slate-200 rounded-3xl text-gray-900 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-xs text-brand">
              Cetak Marking / Thermal QR ({totalKoli} Koli)
            </div>
            <div className="text-[11px] text-slate-500">
              Menampilkan label #{fromKoli} s/d #{toKoli} (format 100×90mm).
            </div>
          </div>
          <PrintButton label="Cetak Thermal" />
        </div>

        {totalKoli > 1 && (
          <form
            method="GET"
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs"
          >
            <span className="text-slate-500 font-semibold">Rentang Koli:</span>
            <input
              type="number"
              name="from"
              min={1}
              max={totalKoli}
              defaultValue={fromKoli}
              className="w-16 h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold tabular-nums"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="number"
              name="to"
              min={1}
              max={totalKoli}
              defaultValue={toKoli}
              className="w-16 h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold tabular-nums"
            />
            <button
              type="submit"
              className="px-3 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold"
            >
              Terapkan
            </button>
            {toKoli < totalKoli && (
              <Link
                href={`/shipments/${shipment.id}/print-thermal?from=1&to=${totalKoli}`}
                className="text-brand font-bold hover:underline ml-auto"
              >
                Tampilkan Semua ({totalKoli})
              </Link>
            )}
          </form>
        )}
      </div>

      {/* Labels List (Matching Gema Trans Marking Style with QR) */}
      <div className="max-w-[390px] mx-auto space-y-6">
        {visibleItems.map((item, idx) => {
          const koliNumber = fromKoli + idx;

          return (
            <div
              key={item.id || koliNumber}
              className="bg-white text-black px-5 py-4 space-y-2.5 page-break-after border border-slate-300 print:border-0 shadow-sm print:shadow-none"
              style={{ width: '100mm', minHeight: '88mm' }}
            >
              {/* Top Company Header */}
              <div className="flex items-center justify-center gap-3">
                {company?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt={companyName}
                    className="w-14 h-14 object-contain flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 border-2 border-black flex items-center justify-center font-black text-sm flex-shrink-0">
                    {companyName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-center leading-tight min-w-0">
                  <div className="font-extrabold text-sm uppercase tracking-wide">
                    {companyName}
                  </div>
                  <div className="text-[9px] text-gray-800 line-clamp-2 mt-0.5">
                    {companyAddress}
                  </div>
                </div>
              </div>

              {/* Huge Receipt Number */}
              <div className="text-center text-3xl font-black tracking-wide leading-none pt-1">
                {shipment.receipt_number}
              </div>

              {/* Route + Sender + Receiver */}
              <div className="text-center space-y-0.5">
                <div className="font-extrabold text-xs uppercase tracking-wide">
                  {shipment.origin_city} - {shipment.destination_city}
                </div>
                <div className="text-[10px] font-semibold uppercase truncate">
                  PENGIRIM : {shipment.sender_name}
                </div>
                <div className="text-[10px] font-semibold uppercase truncate">
                  PENERIMA : {shipment.receiver_name}
                </div>
              </div>

              {/* QR Code + Koli Counter */}
              <div className="flex items-center justify-center gap-5 pt-1">
                <div
                  className="w-[104px] h-[104px] flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div className="text-3xl font-black tracking-tight tabular-nums whitespace-nowrap">
                  {koliNumber} / {totalKoli}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-1 space-y-0.5">
                <div className="text-[9px] font-extrabold tracking-wider truncate">
                  {qrPayload}
                </div>
                <div className="text-[9px] text-gray-700 font-mono">
                  {item.package_type} • {item.actual_kg} Kg • {item.dim_p}×{item.dim_l}×{item.dim_t} cm
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
