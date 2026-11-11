'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2 } from 'lucide-react';
import {
  deleteShipment,
  restoreShipment,
  softDeleteShipment,
} from '@/app/actions/shipments';

interface ShipmentDeleteButtonProps {
  shipmentId: string;
  receiptNumber: string;
  mode: 'soft' | 'restore' | 'permanent';
  variant?: 'icon' | 'button';
  redirectTo?: string;
}

export function ShipmentDeleteButton({
  shipmentId,
  receiptNumber,
  mode,
  variant = 'icon',
  redirectTo,
}: ShipmentDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRestore = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await restoreShipment(shipmentId);
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal memulihkan resi');
        setConfirmOpen(true);
      }
    });
  };

  const handleConfirmDelete = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        if (mode === 'soft') {
          await softDeleteShipment(shipmentId);
        } else {
          await deleteShipment(shipmentId);
        }
        setConfirmOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus resi');
      }
    });
  };

  if (mode === 'restore') {
    return (
      <>
        <button
          type="button"
          onClick={handleRestore}
          disabled={isPending}
          title="Pulihkan Resi STT"
          className={
            variant === 'button'
              ? 'flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors disabled:opacity-50'
              : 'inline-flex items-center gap-1 px-2.5 h-7 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors disabled:opacity-50'
          }
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isPending ? 'Memulihkan...' : 'Pulihkan'}</span>
        </button>

        {confirmOpen && errorMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 text-xs">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 space-y-3 shadow-xl">
              <div className="font-bold text-rose-700">Gagal Memulihkan Resi</div>
              <div className="text-slate-600">{errorMsg}</div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMsg(null);
          setConfirmOpen(true);
        }}
        title={mode === 'soft' ? 'Hapus Resi (Soft Delete)' : 'Hapus Permanen'}
        className={
          variant === 'button'
            ? 'flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors'
            : mode === 'permanent'
            ? 'inline-flex items-center gap-1 px-2.5 h-7 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors'
            : 'p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors'
        }
      >
        <Trash2 className="w-3.5 h-3.5" />
        {(variant === 'button' || mode === 'permanent') && (
          <span>{mode === 'soft' ? 'Hapus Resi' : 'Hapus Permanen'}</span>
        )}
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 text-xs text-left">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">
                {mode === 'soft'
                  ? `Pindahkan Resi ${receiptNumber} ke Tong Sampah?`
                  : `Hapus Permanen Resi ${receiptNumber}?`}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {mode === 'soft'
                  ? 'Resi akan disembunyikan dari daftar aktif (soft delete) dan masih dapat dipulihkan dari tab Tong Sampah.'
                  : 'Data resi beserta seluruh rincian koli akan dihapus permanen dan tidak bisa dikembalikan.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold break-words">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
                className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
              >
                {isPending
                  ? 'Memproses...'
                  : mode === 'soft'
                  ? 'Ya, Hapus (Soft Delete)'
                  : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
