import React from 'react';
import Link from 'next/link';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { buildReportQueryString } from '@/lib/report-filters';

interface ExportButtonsProps {
  excelPath: string;
  pdfPath: string;
  filters?: Record<string, string | undefined | null>;
}

export function ExportButtons({
  excelPath,
  pdfPath,
  filters = {},
}: ExportButtonsProps) {
  const qs = buildReportQueryString(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`${excelPath}${qs}`}
        className="flex items-center gap-1.5 px-3 h-9 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
        title="Download rekap Excel (.xlsx) sesuai filter aktif"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>Excel</span>
      </a>

      <Link
        href={`${pdfPath}${qs}`}
        target="_blank"
        className="flex items-center gap-1.5 px-3 h-9 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors"
        title="Buka tampilan siap cetak / Simpan sebagai PDF"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>PDF / Cetak</span>
      </Link>
    </div>
  );
}
