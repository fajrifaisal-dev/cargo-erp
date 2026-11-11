'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { updateInvoicePayment } from '@/app/actions/invoices';
import {
  CreditCard,
  Upload,
  FileText,
  X,
  AlertCircle,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import {
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_BYTES,
} from '@/lib/report-filters';

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
  const remaining = Math.max(0, totalAmount - paidAmount);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number>(remaining);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpen = () => {
    setErrorMsg(null);
    setAmount(remaining);
    clearSelectedFile();
    setIsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size <= 0 || file.size > MAX_PROOF_FILE_BYTES) {
      setErrorMsg('Ukuran foto/file bukti bayar maksimal 5 MB.');
      clearSelectedFile();
      return;
    }

    if (
      file.type &&
      !ALLOWED_PROOF_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_PROOF_MIME_TYPES)[number]
      )
    ) {
      setErrorMsg('Format file harus foto JPG, PNG, WEBP, atau PDF.');
      clearSelectedFile();
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        let uploadedProofUrl: string | undefined;

        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const res = await fetch(`/api/invoices/${invoiceId}/proof`, {
            method: 'POST',
            body: formData,
          });
          const data = (await res.json()) as {
            ok?: boolean;
            proofUrl?: string;
            error?: string;
          };

          if (!res.ok || !data.proofUrl) {
            setErrorMsg(data.error || 'Gagal mengunggah foto bukti bayar.');
            return;
          }
          uploadedProofUrl = data.proofUrl;
        }

        await updateInvoicePayment({
          invoiceId,
          paid_amount: Number(paidAmount) + Number(amount),
          payment_proof_url: uploadedProofUrl,
        });
        clearSelectedFile();
        setIsOpen(false);
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Gagal mencatat pembayaran invoice.'
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Catat Pembayaran</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl text-xs max-h-[90vh] overflow-y-auto"
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

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 tabular-nums">
                <div className="flex justify-between text-slate-500">
                  <span>Total Tagihan:</span>
                  <span className="text-gray-900 font-semibold">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Sudah Dibayar:</span>
                  <span className="text-emerald-700 font-semibold">
                    {formatRupiah(paidAmount)}
                  </span>
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
                <label className="block text-slate-600 font-semibold mb-1.5">
                  Upload Foto Bukti Transfer / Struk Bank (Opsional)
                </label>

                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-brand cursor-pointer transition-colors text-center">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-gray-800">
                      Pilih Foto atau Ambil dari HP
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG, WEBP, atau PDF (Maks. 5 MB)
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      disabled={isPending}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-bold text-gray-900 truncate">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          ({Math.max(1, Math.round(selectedFile.size / 1024))} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        disabled={isPending}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                        title="Hapus file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {previewUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Pratinjau bukti bayar"
                          className="max-h-44 w-full object-contain bg-slate-50"
                        />
                      </div>
                    )}
                  </div>
                )}
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
