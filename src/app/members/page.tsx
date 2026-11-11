import { Clock } from 'lucide-react';
import { getMembers } from '@/app/actions/members';
import { MemberModal } from '@/components/members/MemberModal';
import { ImportMemberModal } from '@/components/members/ImportMemberModal';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { ControlPanel } from '@/components/layout/ControlPanel';

export const revalidate = 0;

export default async function MembersPage() {
  const members = await getMembers();

  return (
    <div>
      <ControlPanel
        title="Master Member & Shipper Langganan"
        subtitle="Daftar pelanggan korporat repeat-shipper dengan plafon kredit dan termin pembayaran (TOP)."
        badge={`${members.length} Member`}
        actions={
          <div className="flex items-center gap-2">
            <ImportMemberModal />
            <MemberModal mode="create" />
          </div>
        }
      />

      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto text-xs">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {members.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Belum ada member terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Nama Perusahaan / Shipper</th>
                    <th className="py-3 px-3">Kontak & Telepon</th>
                    <th className="py-3 px-3">Alamat</th>
                    <th className="py-3 px-3">Termin (TOP)</th>
                    <th className="py-3 px-3">Plafon Kredit</th>
                    <th className="py-3 px-3">Terdaftar Sejak</th>
                    <th className="py-3 px-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-sm">{m.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {m.id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-800">{m.phone || '-'}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {m.address || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl font-bold bg-brand-soft text-brand border border-brand-soft">
                          <Clock className="w-3 h-3" />
                          {m.payment_term_days} Hari
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900 tabular-nums">
                        {formatRupiah(m.credit_limit)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 tabular-nums">
                        {formatDateIndo(m.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <MemberModal member={m} mode="edit" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
