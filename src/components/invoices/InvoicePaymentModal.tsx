'use client';

import React, { useState, useTransition } from 'react';
import { updateInvoicePayment } from '@/app/actions/invoices';
import { CreditCard } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface InvoicePaymentModalProps {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
}

export function InvoicePaymentModal({
  invoiceId,
  totalAmount,
  paidAmount,
}: InvoicePaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number>(totalAmount - paidAmount);
  const [proofUrl, setProofUrl] = useState('');

  const remaining = Math.max(0, totalAmount - paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await updateInvoicePayment({
        invoiceId,
        paid_amount: Number(paidAmount) + Number(amount),
        payment_proof_url: proofUrl.trim() || undefined,
      });
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Catat Pembayaran</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Catat Pembayaran Invoice
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-gray-900 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 tabular-nums">
                <div className="flex justify-between text-slate-500">
                  <span>Total Tagihan:</span>
                  <span className="text-gray-900 font-semibold">{formatRupiah(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Sudah Dibayar:</span>
                  <span className="text-emerald-700 font-semibold">{formatRupiah(paidAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-extrabold border-t border-slate-200 pt-1.5">
                  <span>Sisa Pelunasan:</span>
                  <span className="text-brand">{formatRupiah(remaining)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nominal Pembayaran (Rp) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={remaining}
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-brand tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  URL Bukti Transfer / Resi Bank
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending || amount <= 0}
                className="px-4 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : 'Konfirmasi Pelunasan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
