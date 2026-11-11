import { notFound } from 'next/navigation';
import { getManifestById } from '@/app/actions/manifests';
import { getCompanySettings } from '@/app/actions/companies';
import { formatDateIndo } from '@/lib/utils';
import { PrintButton } from '@/components/print/PrintButton';

export const revalidate = 0;

interface PrintManifestPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PrintManifestPage({
  params,
}: PrintManifestPageProps) {
  const { id } = await params;
  const [manifest, company] = await Promise.all([
    getManifestById(id),
    getCompanySettings(),
  ]);

  if (!manifest) notFound();

  const shipments = manifest.shipments || [];

  let totalKoli = 0;
  let totalWeight = 0;
  let totalCBM = 0;

  shipments.forEach((s) => {
    (s.items || []).forEach((item) => {
      totalKoli += 1;
      totalWeight += Number(item.actual_kg || 0);
      totalCBM += Number(item.volume_cbm || 0);
    });
  });

  return (
    <div className="bg-white text-black min-h-screen p-6 font-mono text-[11px] leading-tight">
      {/* Print bar */}
      <div className="no-print font-sans max-w-5xl mx-auto mb-6 p-4 rounded-3xl bg-white border border-slate-200 text-gray-900 flex items-center justify-between shadow-sm">
        <div>
          <div className="font-bold text-sm text-brand">
            Cetak Daftar Muat (DM) / Manifest Pelayaran
          </div>
          <div className="text-xs text-slate-500">
            Dokumen serah terima kontainer / breakbulk muatan kapal.
          </div>
        </div>
        <PrintButton label="Cetak Dokumen (Ctrl + P)" />
      </div>

      <div className="max-w-5xl mx-auto border-2 border-black p-5 space-y-4">
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
                Telp: {company?.phone || '031-1234567'} • Cabang Pelabuhan Tanjung Perak & Kalimas
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-black border border-black px-2 py-0.5">
              DAFTAR MUAT KAPAL (MANIFEST)
            </div>
            <div className="text-xs font-bold mt-1">NO: {manifest.manifest_number}</div>
            <div className="text-[10px]">Tgl Cetak: {formatDateIndo(new Date().toISOString())}</div>
          </div>
        </div>

        {/* Voyage Info */}
        <div className="grid grid-cols-2 gap-4 border-b border-black pb-3 text-[10px]">
          <div className="space-y-1">
            <div>
              <span className="font-bold">PELAYARAN (VENDOR): </span>
              {manifest.vendor_name}
            </div>
            <div>
              <span className="font-bold">KAPAL & VOYAGE: </span>
              {manifest.vessel_name || '-'}
            </div>
            <div>
              <span className="font-bold">TGL BERANGKAT (ETD): </span>
              {formatDateIndo(manifest.departure_date)}
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div>
              <span className="font-bold">PELABUHAN ASAL: </span>
              Tanjung Perak / Kalimas Surabaya
            </div>
            <div>
              <span className="font-bold">PELABUHAN TUJUAN: </span>
              <span className="font-extrabold text-xs">{manifest.destination_city}</span>
            </div>
            <div>
              <span className="font-bold">STATUS VOYAGE: </span>
              {manifest.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Tabel Resi */}
        <table className="w-full text-left border border-black text-[10px]">
          <thead>
            <tr className="border-b border-black bg-gray-100 font-bold">
              <th className="p-1.5 border-r border-black w-8 text-center">No</th>
              <th className="p-1.5 border-r border-black w-24">No. STT</th>
              <th className="p-1.5 border-r border-black w-36">Pengirim (Shipper)</th>
              <th className="p-1.5 border-r border-black w-36">Penerima (Consignee)</th>
              <th className="p-1.5 border-r border-black">Jenis Barang</th>
              <th className="p-1.5 border-r border-black w-14 text-center">Koli</th>
              <th className="p-1.5 border-r border-black w-16 text-right">Berat (Kg)</th>
              <th className="p-1.5 w-16 text-right">CBM</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, idx) => {
              const sItems = s.items || [];
              const sKg = sItems.reduce((acc, it) => acc + Number(it.actual_kg || 0), 0);
              const sCBM = sItems.reduce((acc, it) => acc + Number(it.volume_cbm || 0), 0);

              return (
                <tr key={s.id} className="border-b border-black">
                  <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                  <td className="p-1.5 border-r border-black font-bold">{s.receipt_number}</td>
                  <td className="p-1.5 border-r border-black truncate max-w-[140px]">{s.sender_name}</td>
                  <td className="p-1.5 border-r border-black truncate max-w-[140px]">{s.receiver_name}</td>
                  <td className="p-1.5 border-r border-black">{s.goods_description}</td>
                  <td className="p-1.5 border-r border-black text-center font-bold">{sItems.length}</td>
                  <td className="p-1.5 border-r border-black text-right">{sKg}</td>
                  <td className="p-1.5 text-right">{sCBM.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold bg-gray-100">
              <td colSpan={5} className="p-1.5 border-r border-black text-right">
                TOTAL MUATAN ({shipments.length} RESI):
              </td>
              <td className="p-1.5 border-r border-black text-center">{totalKoli} Koli</td>
              <td className="p-1.5 border-r border-black text-right">{totalWeight.toFixed(1)} Kg</td>
              <td className="p-1.5 text-right">{totalCBM.toFixed(3)} CBM</td>
            </tr>
          </tfoot>
        </table>

        {/* Tanda Tangan Serah Terima */}
        <div className="grid grid-cols-3 gap-4 border-t border-black pt-4 text-center text-[10px]">
          <div>
            <div>Yang Menyerahkan (Gema Trans),</div>
            <div className="h-16"></div>
            <div className="border-t border-dotted border-black pt-0.5">
              ( Kepala Gudang Kalimas )
            </div>
          </div>
          <div>
            <div>Mualim I / Pihak Pelayaran,</div>
            <div className="h-16"></div>
            <div className="border-t border-dotted border-black pt-0.5">
              ( {manifest.vendor_name} )
            </div>
          </div>
          <div>
            <div>Cabang / Penerima Pelabuhan,</div>
            <div className="h-16"></div>
            <div className="border-t border-dotted border-black pt-0.5">
              ( Agen {manifest.destination_city} )
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
