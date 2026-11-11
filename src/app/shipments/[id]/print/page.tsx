import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getShipmentById } from '@/app/actions/shipments';
import { getCompanySettings } from '@/app/actions/companies';
import {
  formatRupiah,
  formatDateIndo,
  calculateVolumetricKg,
} from '@/lib/utils';
import { PrintButton } from '@/components/print/PrintButton';
import { ShipmentItem } from '@/types/database';

export const revalidate = 0;

interface PrintShipmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface GroupedItemSummary {
  labelRange: string;
  count: number;
  packageType: string;
  dims: string;
  actualKgEach: number;
  volKgEach: number;
  cbmEach: number;
}

function groupShipmentItems(items: ShipmentItem[]): GroupedItemSummary[] {
  const groups: GroupedItemSummary[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const dims = `${it.dim_p} x ${it.dim_l} x ${it.dim_t} cm`;
    const volKg = calculateVolumetricKg(it.dim_p, it.dim_l, it.dim_t);
    const cbm = Number(it.volume_cbm || 0);
    const actual = Number(it.actual_kg || 0);
    const prev = groups[groups.length - 1];

    if (
      prev &&
      prev.packageType === it.package_type &&
      prev.dims === dims &&
      prev.actualKgEach === actual
    ) {
      prev.count += 1;
      const startIdx = i - prev.count + 2;
      prev.labelRange = `${startIdx} - ${i + 1}`;
    } else {
      groups.push({
        labelRange: `${i + 1}`,
        count: 1,
        packageType: it.package_type,
        dims,
        actualKgEach: actual,
        volKgEach: volKg,
        cbmEach: cbm,
      });
    }
  }
  return groups;
}

export default async function PrintShipmentPage({
  params,
}: PrintShipmentPageProps) {
  const { id } = await params;
  const [shipment, activeCompany] = await Promise.all([
    getShipmentById(id),
    getCompanySettings(),
  ]);

  if (!shipment) notFound();

  const company = shipment.company || activeCompany;
  const companyName = company?.name || 'EKSPEDISI CARGO';
  const companySub = company?.slug
    ? `( ${company.slug.toUpperCase()} )`
    : '';
  const items = shipment.items || [];
  const totalKoli = items.length;

  const totalActualKg = items.reduce((sum, it) => sum + Number(it.actual_kg || 0), 0);
  const totalVolumetricKg = items.reduce(
    (sum, it) => sum + calculateVolumetricKg(Number(it.dim_p), Number(it.dim_l), Number(it.dim_t)),
    0
  );
  const totalCBM = items.reduce((sum, it) => sum + Number(it.volume_cbm || 0), 0);
  const chargeableWeight = Math.max(totalActualKg, totalVolumetricKg);

  const groupedItems = items.length > 20 ? groupShipmentItems(items) : null;
  const uniqueDimSummary = Array.from(
    new Set(items.map((it) => `${it.dim_p}x${it.dim_l}x${it.dim_t} cm`))
  ).slice(0, 3);

  const qrSvg = await QRCode.toString(
    `STT:${shipment.receipt_number}|${shipment.origin_city}-${shipment.destination_city}|KOLI:${totalKoli}`,
    { type: 'svg', margin: 0, width: 68 }
  );

  return (
    <div className="bg-white text-black min-h-screen p-6 font-sans text-[11px] leading-snug">
      {/* Print Controls (Hidden on Print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 p-4 rounded-3xl bg-white border border-slate-200 text-gray-900 flex items-center justify-between shadow-sm">
        <div>
          <div className="font-bold text-sm text-brand">
            Cetak Surat Tanda Terima (Resi #{shipment.receipt_number})
          </div>
          <div className="text-xs text-slate-500">
            Format resmi STT dengan rincian muatan, tarif, QR tracking, dan tanda tangan 3 pihak.
          </div>
        </div>
        <PrintButton label="Cetak Sekarang (Ctrl + P)" />
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Kop Surat */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="w-20 flex-shrink-0 flex items-center justify-start">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={companyName}
                className="w-16 h-16 object-contain"
              />
            ) : (
              <div className="w-14 h-14 border-2 border-black flex items-center justify-center font-black text-base">
                {companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 text-center">
            <div className="text-xl font-black uppercase tracking-wide leading-tight">
              {companyName}
            </div>
            <div className="text-xs font-bold tracking-wider mt-0.5">
              {companySub}
            </div>
            <div className="text-[10px] text-gray-800 mt-0.5">
              {company?.address || 'Jl. Kalimas Baru No.87, Perak Utara, Kec. Pabean Cantikan, Surabaya'}
              {company?.phone ? ` • Telp: ${company.phone}` : ''}
            </div>
          </div>

          <div
            className="w-16 h-16 flex-shrink-0 flex items-center justify-end"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        {/* Title Row */}
        <div className="flex items-end justify-between px-1">
          <div className="text-base font-black tracking-wide uppercase">
            SURAT TANDA TERIMA
          </div>
          <div className="text-base font-black tracking-wide uppercase">
            NO. {shipment.receipt_number}
          </div>
        </div>

        {/* Main Framed Grid (Matching Classic Gema STT Layout) */}
        <div className="border-2 border-black">
          {/* Upper 3 Columns */}
          <div className="grid grid-cols-12 border-b-2 border-black">
            {/* PENGIRIM */}
            <div className="col-span-4 border-r border-black flex flex-col">
              <div className="text-center font-bold border-b border-black py-1 uppercase bg-gray-50">
                PENGIRIM
              </div>
              <div className="p-2 space-y-2 flex-1 flex flex-col justify-between text-[11px]">
                <div className="space-y-1.5">
                  <div>
                    <span className="font-bold">Nama : </span>
                    <span className="font-semibold">{shipment.sender_name}</span>
                  </div>
                  <div className="border-t border-black/30 pt-1.5">
                    <span className="font-bold">Alamat : </span>
                    <span>{shipment.sender_address || shipment.origin_city}</span>
                  </div>
                </div>
                <div className="border-t border-black/30 pt-1">
                  <span className="font-bold">Tlp : </span>
                  <span>{shipment.sender_phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* PENERIMA */}
            <div className="col-span-4 border-r border-black flex flex-col">
              <div className="text-center font-bold border-b border-black py-1 uppercase bg-gray-50">
                PENERIMA
              </div>
              <div className="p-2 space-y-2 flex-1 flex flex-col justify-between text-[11px]">
                <div className="space-y-1.5">
                  <div>
                    <span className="font-bold">Nama : </span>
                    <span className="font-semibold">{shipment.receiver_name}</span>
                  </div>
                  <div className="border-t border-black/30 pt-1.5">
                    <span className="font-bold">Alamat : </span>
                    <span>
                      {shipment.receiver_address || shipment.destination_city}
                      {shipment.delivery_province
                        ? `, ${shipment.delivery_province}`
                        : ''}
                    </span>
                  </div>
                </div>
                <div className="border-t border-black/30 pt-1">
                  <span className="font-bold">Tlp : </span>
                  <span>{shipment.receiver_phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* META INFO STACK */}
            <div className="col-span-4 flex flex-col text-[10px]">
              <div className="px-2 py-1 border-b border-black flex justify-between">
                <span>
                  <span className="font-bold">TANGGAL : </span>
                  {formatDateIndo(shipment.booking_date)}
                </span>
                {shipment.pickup_date && (
                  <span>
                    <span className="font-bold">PICKUP: </span>
                    {formatDateIndo(shipment.pickup_date)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 border-b border-black text-center">
                <div className="border-r border-black p-1">
                  <div className="font-bold uppercase text-[9px]">ASAL</div>
                  <div className="font-extrabold text-xs">{shipment.origin_city}</div>
                </div>
                <div className="p-1">
                  <div className="font-bold uppercase text-[9px]">TUJUAN</div>
                  <div className="font-extrabold text-xs">
                    {shipment.destination_city}
                  </div>
                </div>
              </div>

              <div className="px-2 py-1 border-b border-black">
                <span className="font-bold">Surat Jalan / REF : </span>
                <span>{shipment.ref_number || '-'}</span>
              </div>
              <div className="px-2 py-1 border-b border-black">
                <span className="font-bold">Keterangan Isi Barang : </span>
                <span>{shipment.goods_description}</span>
              </div>
              <div className="px-2 py-1 border-b border-black">
                <span className="font-bold">Cara Packing / Catatan : </span>
                <span>{shipment.handling_instructions || '-'}</span>
              </div>

              <div className="py-1.5 border-b border-black text-center">
                <div className="text-[10px] font-bold uppercase">Jumlah Koli</div>
                <div className="text-lg font-black leading-tight">{totalKoli}</div>
              </div>

              <div className="grid grid-cols-2 border-b border-black text-center">
                <div className="border-r border-black p-1">
                  <div className="text-[9px] font-bold uppercase">Berat</div>
                  <div className="font-black text-xs">
                    {chargeableWeight.toFixed(1)} Kg
                  </div>
                  <div className="text-[9px] text-gray-600">
                    (Aktual: {totalActualKg} Kg)
                  </div>
                </div>
                <div className="p-1">
                  <div className="text-[9px] font-bold uppercase">Volume</div>
                  <div className="font-black text-xs">
                    {totalCBM.toFixed(3)} CBM
                  </div>
                  <div className="text-[9px] text-gray-600">
                    (Vol: {totalVolumetricKg.toFixed(1)} Kg)
                  </div>
                </div>
              </div>

              <div className="px-2 py-1 text-center">
                <div className="font-bold text-[9px]">
                  Dimensi Barang (P × L × T) Satuan Cm
                </div>
                <div className="font-mono text-[10px]">
                  {uniqueDimSummary.length > 0
                    ? uniqueDimSummary.join(', ')
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Service, Insurance, Payment & Pricing Detail */}
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-8 border-r border-black flex flex-col">
              <div className="text-center font-bold border-b border-black py-1 uppercase text-[10px] bg-gray-50">
                SERVICE, ASURANSI &amp; PEMBAYARAN
              </div>
              <div className="p-2.5 space-y-1.5 flex-1">
                <div className="font-semibold">
                  LAYANAN : <span className="font-bold">{shipment.service_type}</span> | VIA :{' '}
                  <span className="font-bold">{shipment.transport_via}</span> | ASURANSI :{' '}
                  <span className="font-bold">
                    {Number(shipment.insurance_cost) > 0 ? 'Ya' : 'Tidak'}
                  </span>{' '}
                  | PEMBAYARAN :{' '}
                  <span className="font-bold uppercase">
                    {shipment.payment_type} ({shipment.payment_status})
                  </span>
                </div>
                {company?.bank_account && (
                  <div className="text-[10px]">
                    <span className="font-bold">Rekening Resmi : </span>
                    <span className="font-mono">{company.bank_account}</span>
                  </div>
                )}
                <div className="text-[9px] text-gray-700 pt-1 border-t border-dotted border-black/30">
                  Syarat: Barang tunduk pada ketentuan ekspedisi yang berlaku. Klaim kekurangan/kerusakan maksimal 1×24 jam saat serah terima barang.
                </div>
              </div>
            </div>

            <div className="col-span-4 flex flex-col">
              <div className="grid grid-cols-2 text-center font-bold border-b border-black py-1 text-[10px] bg-gray-50">
                <span className="border-r border-black">Rincian Biaya</span>
                <span>Nominal</span>
              </div>
              <div className="p-2 space-y-0.5 text-[10px] tabular-nums">
                <div className="flex justify-between">
                  <span>
                    Ongkir ({shipment.chargeable_type} @{' '}
                    {formatRupiah(shipment.rate_per_unit)}):
                  </span>
                  <span className="font-semibold">
                    {formatRupiah(shipment.shipping_cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Biaya Packing:</span>
                  <span>{formatRupiah(shipment.packing_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Premi Asuransi:</span>
                  <span>{formatRupiah(shipment.insurance_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Biaya Lain-Lain:</span>
                  <span>{formatRupiah(shipment.other_cost)}</span>
                </div>
                <div className="flex justify-between font-black text-xs border-t border-black pt-1 mt-1">
                  <span>TOTAL HARGA:</span>
                  <span>{formatRupiah(shipment.total_bill)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Footer (3 Columns) */}
          <div className="grid grid-cols-3 text-center text-[10px]">
            <div className="border-r border-black p-2">
              <div className="font-bold uppercase">PETUGAS</div>
              <div className="h-14" />
              <div className="border-t border-dotted border-black pt-0.5">
                Cap &amp; Nama Jelas ({companyName.slice(0, 22)})
              </div>
            </div>
            <div className="border-r border-black p-2">
              <div className="font-bold uppercase">PENGIRIM</div>
              <div className="h-14" />
              <div className="border-t border-dotted border-black pt-0.5">
                Cap &amp; Nama Jelas ({shipment.sender_name.slice(0, 22)})
              </div>
            </div>
            <div className="p-2">
              <div className="font-bold uppercase">PENERIMA</div>
              <div className="h-14" />
              <div className="border-t border-dotted border-black pt-0.5">
                Cap &amp; Nama Jelas ({shipment.receiver_name.slice(0, 22)})
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Koli Breakdown Table */}
        {items.length > 0 && (
          <div className="border border-black p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span>
                Lampiran Rincian Fisik Koli ({totalKoli} Koli
                {groupedItems ? ` • Dirangkum ${groupedItems.length} Grup` : ''})
              </span>
              <span>
                Chargeable: {chargeableWeight.toFixed(1)} Kg • Kubikasi:{' '}
                {totalCBM.toFixed(3)} CBM
              </span>
            </div>

            <table className="w-full text-left border border-black text-[10px] tabular-nums">
              <thead>
                <tr className="border-b border-black bg-gray-100 font-bold">
                  <th className="p-1 border-r border-black w-20 text-center">
                    Koli #
                  </th>
                  <th className="p-1 border-r border-black w-20 text-center">
                    Qty
                  </th>
                  <th className="p-1 border-r border-black w-28">Kemasan</th>
                  <th className="p-1 border-r border-black">
                    Dimensi (P × L × T)
                  </th>
                  <th className="p-1 border-r border-black text-right">
                    Aktual / Koli
                  </th>
                  <th className="p-1 border-r border-black text-right">
                    Vol. / Koli
                  </th>
                  <th className="p-1 text-right">Total Berat</th>
                </tr>
              </thead>
              <tbody>
                {groupedItems
                  ? groupedItems.map((g, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="p-1 border-r border-black text-center font-semibold">
                          #{g.labelRange}
                        </td>
                        <td className="p-1 border-r border-black text-center font-bold">
                          {g.count}
                        </td>
                        <td className="p-1 border-r border-black">{g.packageType}</td>
                        <td className="p-1 border-r border-black">{g.dims}</td>
                        <td className="p-1 border-r border-black text-right">
                          {g.actualKgEach} Kg
                        </td>
                        <td className="p-1 border-r border-black text-right">
                          {g.volKgEach} Kg
                        </td>
                        <td className="p-1 text-right font-bold">
                          {(g.actualKgEach * g.count).toFixed(1)} Kg
                        </td>
                      </tr>
                    ))
                  : items.map((it, idx) => {
                      const volKg = calculateVolumetricKg(
                        it.dim_p,
                        it.dim_l,
                        it.dim_t
                      );
                      return (
                        <tr key={it.id} className="border-b border-black">
                          <td className="p-1 border-r border-black text-center">
                            #{idx + 1}
                          </td>
                          <td className="p-1 border-r border-black text-center">1</td>
                          <td className="p-1 border-r border-black">
                            {it.package_type}
                          </td>
                          <td className="p-1 border-r border-black">
                            {it.dim_p} x {it.dim_l} x {it.dim_t} cm
                          </td>
                          <td className="p-1 border-r border-black text-right">
                            {it.actual_kg} Kg
                          </td>
                          <td className="p-1 border-r border-black text-right">
                            {volKg} Kg
                          </td>
                          <td className="p-1 text-right font-bold">
                            {Math.max(Number(it.actual_kg), volKg)} Kg
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
