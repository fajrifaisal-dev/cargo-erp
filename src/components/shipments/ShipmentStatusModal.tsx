'use client';

import React, { useState, useTransition } from 'react';
import { updateShipmentStatus } from '@/app/actions/shipments';
import { Shipment } from '@/types/database';
import { RefreshCw, CheckCircle2, Truck, Ship, PackageCheck } from 'lucide-react';

type ShipmentStatus = Shipment['shipment_status'];

interface ShipmentStatusModalProps {
  shipmentId: string;
  currentStatus: ShipmentStatus;
  receivedDate: string | null;
  receiverPerson: string | null;
  podPhotoUrl: string | null;
}

export function ShipmentStatusModal({
  shipmentId,
  currentStatus,
  receivedDate,
  receiverPerson,
  podPhotoUrl,
}: ShipmentStatusModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ShipmentStatus>(currentStatus);
  const [receiver, setReceiver] = useState(receiverPerson || '');
  const [date, setDate] = useState(
    receivedDate || new Date().toISOString().slice(0, 10)
  );
  const [photoUrl, setPhotoUrl] = useState(podPhotoUrl || '');

  const handleUpdate = () => {
    startTransition(async () => {
      await updateShipmentStatus(
        shipmentId,
        status,
        status === 'Diterima Cabang'
          ? {
              received_date: date,
              receiver_person: receiver,
              pod_photo_url: photoUrl || undefined,
            }
          : undefined
      );
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white hover:bg-slate-50 text-gray-900 border border-slate-200 text-xs font-bold transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5 text-brand" />
        <span>Update Status</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand" />
                Update Status Siklus Operasional
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-gray-900 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">
                  Status Pengiriman Saat Ini
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { val: 'Pending', label: 'Pending Gudang', icon: Truck },
                      { val: 'Muat Kapal', label: 'Muat Kapal', icon: Ship },
                      { val: 'Tiba Pelabuhan', label: 'Tiba Pelabuhan', icon: CheckCircle2 },
                      { val: 'Diterima Cabang', label: 'Diterima (POD)', icon: PackageCheck },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setStatus(s.val)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors ${
                        status === s.val
                          ? 'bg-brand-soft border-brand-soft text-brand font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <s.icon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {status === 'Diterima Cabang' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 mt-2">
                  <div className="font-bold text-brand text-[11px]">
                    Data Bukti Penerimaan Barang (POD)
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Nama Orang yang Menerima
                    </label>
                    <input
                      type="text"
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      placeholder="Misal: Bapak Budi (Gudang)"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tanggal Diterima</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      URL Foto POD / Tanda Terima
                    </label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-gray-900 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isPending}
                className="px-4 h-9 rounded-xl bg-brand font-bold text-xs disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : 'Perbarui Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
