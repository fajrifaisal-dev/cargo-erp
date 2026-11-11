'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Member, Shipment } from '@/types/database';
import { createInvoice } from '@/app/actions/invoices';
import { formatRupiah, formatDateIndo } from '@/lib/utils';
import { ArrowLeft, Save, Receipt } from 'lucide-react';
import Link from 'next/link';

interface CreateInvoiceFormProps {
  members: Member[];
  unbilledShipments: Shipment[];
}

export function CreateInvoiceForm({
  members,
  unbilledShipments,
}: CreateInvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const selectedMember = members.find((m) => m.id === memberId);

  const availableShipments = unbilledShipments.filter(
    (s) => s.member_id === memberId && !s.invoice_id
  );

  const toggleSelect = (id: string) => {
    if (selectedShipmentIds.includes(id)) {
      setSelectedShipmentIds(selectedShipmentIds.filter((item) => item !== id));
    } else {
      setSelectedShipmentIds([...selectedShipmentIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedShipmentIds.length === availableShipments.length) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(availableShipments.map((s) => s.id));
    }
  };

  const selectedShipments = availableShipments.filter((s) =>
    selectedShipmentIds.includes(s.id)
  );

  const subtotal = selectedShipments.reduce(
    (sum, s) => sum + Number(s.total_bill || 0),
    0
  );
  const total = Math.max(0, subtotal - Number(discountAmount || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!memberId) {
      setErrorMsg('Pilih member langganan');
      return;
    }

    if (selectedShipmentIds.length === 0) {
      setErrorMsg('Pilih minimal satu resi STT untuk ditagihkan');
      return;
    }

    startTransition(async () => {
      try {
        const inv = await createInvoice({
          member_id: memberId,
          shipment_ids: selectedShipmentIds,
          discount_amount: Number(discountAmount || 0),
          notes: notes.trim() || undefined,
        });

        router.push(`/invoices/${inv.id}`);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat invoice');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl mx-auto text-xs">
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl px-5 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link
            href="/invoices"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-brand" />
            Buat Faktur Penagihan Member Baru
          </span>
        </div>

        <button
          type="submit"
          disabled={selectedShipmentIds.length === 0 || isPending}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isPending ? 'Menerbitkan...' : 'Terbitkan Invoice'}</span>
        </button>
      </div>

      {/* Section 1 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
        <div className="text-brand font-bold uppercase text-xs pb-2 border-b border-slate-100">
          1. Pilih Member / Langganan Korporat
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Nama Member</label>
            <select
              value={memberId}
              onChange={(e) => {
                setMemberId(e.target.value);
                setSelectedShipmentIds([]);
              }}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 font-semibold focus:outline-none focus:bg-white focus:border-brand"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Termin Pembayaran (TOP)</label>
            <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-800 flex items-center font-semibold">
              {selectedMember?.payment_term_days || 14} Hari Kerja
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Plafon Kredit</label>
            <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-800 flex items-center font-semibold tabular-nums">
              {formatRupiah(selectedMember?.credit_limit || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="text-brand font-bold uppercase text-xs">
            2. Pilih Resi STT yang Ditagihkan ({availableShipments.length} Tersedia)
          </div>
          {availableShipments.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="text-brand hover:underline font-bold text-xs"
            >
              {selectedShipmentIds.length === availableShipments.length
                ? 'Batalkan Semua'
                : 'Pilih Semua Resi'}
            </button>
          )}
        </div>

        {availableShipments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Tidak ada resi STT berstatus Invoice yang belum ditagihkan untuk member ini.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold">
                <tr>
                  <th className="p-2.5 w-10 text-center">Pilih</th>
                  <th className="p-2.5">No. STT</th>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Tujuan</th>
                  <th className="p-2.5">Barang</th>
                  <th className="p-2.5 text-right">Tagihan STT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {availableShipments.map((s) => {
                  const isChecked = selectedShipmentIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggleSelect(s.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-brand-soft' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(s.id)}
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-brand">
                        {s.receipt_number}
                      </td>
                      <td className="p-2.5 text-slate-500 tabular-nums">
                        {formatDateIndo(s.booking_date)}
                      </td>
                      <td className="p-2.5 text-gray-900 font-semibold">
                        {s.destination_city}
                      </td>
                      <td className="p-2.5 text-slate-600">{s.goods_description}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900 tabular-nums">
                        {formatRupiah(s.total_bill)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
        <div className="text-brand font-bold uppercase text-xs pb-2 border-b border-slate-100">
          3. Total Penagihan & Potongan
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Catatan Tagihan / Keterangan Transfer
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Tagihan periode awal bulan, pembayaran transfer ke BCA..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            />
          </div>

          <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({selectedShipments.length} Resi):</span>
              <span className="text-gray-900 font-bold">{formatRupiah(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Potongan / Diskon:</span>
              <input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-32 h-8 px-2.5 text-right bg-white border border-slate-200 rounded-xl text-gray-900"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-brand">
              <span>Total Tagihan Bersih:</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
