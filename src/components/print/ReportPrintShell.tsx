import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Company } from '@/types/database';
import { PrintButton } from '@/components/print/PrintButton';
import { formatDateIndo } from '@/lib/utils';

interface ReportPrintShellProps {
  company: Company | null;
  reportTitle: string;
  filterSummary: string;
  backHref: string;
  recordCountLabel: string;
  children: React.ReactNode;
}

export function ReportPrintShell({
  company,
  reportTitle,
  filterSummary,
  backHref,
  recordCountLabel,
  children,
}: ReportPrintShellProps) {
  const printedAt = formatDateIndo(new Date().toISOString());

  return (
    <div className="bg-white text-black min-h-screen p-4 sm:p-6 text-[11px] leading-tight">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Screen-only Print Toolbar */}
      <div className="no-print max-w-6xl mx-auto mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-gray-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </Link>
          <div>
            <div className="text-xs font-bold text-gray-900">{reportTitle}</div>
            <div className="text-[11px] text-slate-500">
              {recordCountLabel} • Pilih &ldquo;Save as PDF&rdquo; pada dialog cetak untuk menyimpan file PDF.
            </div>
          </div>
        </div>

        <PrintButton label="Cetak / Simpan PDF (Ctrl + P)" />
      </div>

      {/* Printable Report Sheet */}
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-start justify-between border-b-2 border-black pb-3 gap-4">
          <div className="flex items-start gap-3">
            {company?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-11 h-11 object-contain border border-black/15 p-0.5 flex-shrink-0"
              />
            )}
            <div>
              <div className="text-sm font-black uppercase">
                {company?.name || 'EKSPEDISI CARGO'}
              </div>
              <div className="text-[10px] text-gray-700">
                {company?.address || '-'}
              </div>
              <div className="text-[10px] text-gray-700">
                Telp: {company?.phone || '-'}
                {company?.bank_account ? ` • Rek: ${company.bank_account}` : ''}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-sm font-black uppercase tracking-wide">
              {reportTitle}
            </div>
            <div className="text-[10px] text-gray-700 mt-0.5">{filterSummary}</div>
            <div className="text-[10px] text-gray-600 font-mono mt-0.5">
              {recordCountLabel} • Dicetak: {printedAt}
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
