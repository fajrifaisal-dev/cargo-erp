'use client';

import React, { useState, useTransition } from 'react';
import { assignShipmentsToManifest } from '@/app/actions/manifests';
import { Shipment } from '@/types/database';
import { Plus, Search } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface AssignShipmentsModalProps {
  manifestId: string;
  destinationCity: string;
  availableShipments: Shipment[];
}

export function AssignShipmentsModal({
  manifestId,
  destinationCity,
  availableShipments,
}: AssignShipmentsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const filtered = availableShipments.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.receipt_number.toLowerCase().includes(q) ||
      s.sender_name.toLowerCase().includes(q) ||
      s.receiver_name.toLowerCase().includes(q) ||
      s.goods_description.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s.id));
    }
  };

  const handleAssign = () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      await assignShipmentsToManifest(manifestId, selectedIds);
      setSelectedIds([]);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white hover:bg-slate-50 text-gray-900 border border-slate-200 text-xs font-bold transition-colors"
      >
        <Plus className="w-3.5 h-3.5 text-brand" />
        <span>Assign STT ke Manifest Ini</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-xl text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Pilih STT untuk Dimuat ke Kapal
                </h3>
                <p className="text-[11px] text-slate-500">
                  Resi status Pending tujuan Pelabuhan {destinationCity}.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-gray-900 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari STT..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Tidak ada resi pending tujuan {destinationCity}.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filtered.length && filtered.length > 0}
                          onChange={selectAll}
                        />
                      </th>
                      <th className="p-2.5">No. STT</th>
                      <th className="p-2.5">Pengirim / Penerima</th>
                      <th className="p-2.5">Muatan</th>
                      <th className="p-2.5 text-right">Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((s) => {
                      const isSelected = selectedIds.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => toggleSelect(s.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-soft' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(s.id)}
                            />
                          </td>
                          <td className="p-2.5 font-mono font-bold text-brand">
                            {s.receipt_number}
                          </td>
                          <td className="p-2.5">
                            <div className="text-gray-900 font-semibold">{s.sender_name}</div>
                            <div className="text-[10px] text-slate-500">➔ {s.receiver_name}</div>
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
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-semibold">
                {selectedIds.length} STT dipilih
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={selectedIds.length === 0 || isPending}
                  className="px-4 h-9 rounded-xl bg-brand font-bold disabled:opacity-50"
                >
                  {isPending ? 'Memproses...' : 'Assign ke Kapal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
