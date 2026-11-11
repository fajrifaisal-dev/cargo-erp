'use client';

import React, { useRef, useState, useTransition } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CopyCheck,
} from 'lucide-react';
import {
  DuplicateStrategy,
  MemberImportPreviewResult,
} from '@/lib/member-import';
import {
  commitMemberImport,
  previewMemberImport,
} from '@/app/actions/member-import';
import { formatRupiah } from '@/lib/utils';

export function ImportMemberModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<MemberImportPreviewResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<DuplicateStrategy>('skip');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetModalState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreview(null);
    setFileName(null);
    setStrategy('skip');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetModalState();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const res = await previewMemberImport(formData);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setPreview(res.preview);
      setFileName(res.fileName);
    });
  };

  const handleCommit = () => {
    if (!preview) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const payloadRows = preview.rows
      .filter((r) => r.status === 'new' || r.status === 'duplicate_db')
      .map((r) => ({
        rowNumber: r.rowNumber,
        name: r.name,
        phone: r.phone,
        address: r.address,
        payment_term_days: r.payment_term_days,
        credit_limit: r.credit_limit,
      }));

    startTransition(async () => {
      const res = await commitMemberImport(payloadRows, strategy);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg(
        `Import selesai: ${res.inserted} member baru ditambahkan, ${res.updated} diperbarui, ${res.skipped} dilewati.`
      );
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const actionableCount = preview
    ? preview.summary.validNew +
      (strategy === 'update' ? preview.summary.duplicateDb : 0)
    : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetModalState();
          setIsOpen(true);
        }}
        className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>Import Excel</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4 text-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Import Data Member via Excel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Deteksi duplikat otomatis berdasarkan nama member (case-insensitive).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-gray-900 font-bold text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Step 1: Download template + Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">
                      1. Download Template Excel
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format kolom resmi (.xlsx) beserta contoh pengisian.
                    </p>
                  </div>
                  <a
                    href="/api/members/template"
                    className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white hover:bg-slate-100 text-gray-800 border border-slate-200 font-bold whitespace-nowrap shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Template .xlsx</span>
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">
                      2. Upload File (.xlsx / .csv)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {fileName ? `Terpilih: ${fileName}` : 'Maks. 5 MB / 2.000 baris'}
                    </p>
                  </div>
                  <label className="cursor-pointer flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-brand font-bold whitespace-nowrap shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isPending ? 'Membaca...' : 'Pilih File'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange}
                      disabled={isPending}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-700" />
                  <div>
                    <div>{successMsg}</div>
                    <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                      Daftar member sudah diperbarui. Anda dapat menutup jendela ini atau upload file lain.
                    </p>
                  </div>
                </div>
              )}

              {/* Preview summary & duplicate policy */}
              {preview && (
                <div className="space-y-4">
                  {/* Summary Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-[10px] font-bold uppercase text-emerald-700">
                        Member Baru
                      </div>
                      <div className="text-lg font-extrabold text-emerald-900 tabular-nums">
                        {preview.summary.validNew}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                      <div className="text-[10px] font-bold uppercase text-amber-700">
                        Duplikat Database
                      </div>
                      <div className="text-lg font-extrabold text-amber-900 tabular-nums">
                        {preview.summary.duplicateDb}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200">
                      <div className="text-[10px] font-bold uppercase text-orange-700">
                        Ganda di File
                      </div>
                      <div className="text-lg font-extrabold text-orange-900 tabular-nums">
                        {preview.summary.duplicateFile}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
                      <div className="text-[10px] font-bold uppercase text-rose-700">
                        Data Tidak Valid
                      </div>
                      <div className="text-lg font-extrabold text-rose-900 tabular-nums">
                        {preview.summary.invalid}
                      </div>
                    </div>
                  </div>

                  {/* Duplicate handling policy */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <CopyCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-gray-900">
                          Kebijakan Jika Nama Member Sudah Ada di Database
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Baris ganda di dalam file Excel yang sama otomatis dilewati.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setStrategy('skip')}
                        className={`px-3 h-8 rounded-xl border font-bold transition-colors ${
                          strategy === 'skip'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Lewati Duplikat
                      </button>
                      <button
                        type="button"
                        onClick={() => setStrategy('update')}
                        className={`px-3 h-8 rounded-xl border font-bold transition-colors ${
                          strategy === 'update'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Perbarui Data Lama
                      </button>
                    </div>
                  </div>

                  {/* Preview table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Baris</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Nama Perusahaan</th>
                            <th className="px-3 py-2.5">Telepon</th>
                            <th className="px-3 py-2.5">TOP</th>
                            <th className="px-3 py-2.5 text-right">Plafon</th>
                            <th className="px-3 py-2.5">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.rows.map((row) => (
                            <tr key={`${row.rowNumber}-${row.name}`} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2 text-slate-400 tabular-nums">
                                #{row.rowNumber}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {row.status === 'new' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                    <CheckCircle2 className="w-3 h-3" /> Baru
                                  </span>
                                )}
                                {row.status === 'duplicate_db' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                    <AlertTriangle className="w-3 h-3" />{' '}
                                    {strategy === 'update' ? 'Akan Update' : 'Duplikat DB'}
                                  </span>
                                )}
                                {row.status === 'duplicate_file' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-bold">
                                    <AlertTriangle className="w-3 h-3" /> Ganda File
                                  </span>
                                )}
                                {row.status === 'invalid' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                    <XCircle className="w-3 h-3" /> Tidak Valid
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-bold text-gray-900">
                                {row.name}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.phone || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-700 tabular-nums">
                                {row.payment_term_days} hr
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                                {formatRupiah(row.credit_limit)}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-slate-500">
                                {row.errors.length > 0
                                  ? row.errors.join(' ')
                                  : row.note || 'Siap diimport'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
              <div className="text-[11px] text-slate-500">
                {preview
                  ? `${actionableCount} baris akan diproses ke database.`
                  : 'Upload file Excel atau CSV untuk melihat pratinjau data.'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isPending || !preview || actionableCount === 0}
                  onClick={handleCommit}
                  className="px-5 h-9 rounded-xl bg-brand font-bold shadow-sm disabled:opacity-50"
                >
                  {isPending
                    ? 'Memproses...'
                    : `Proses Import (${actionableCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
