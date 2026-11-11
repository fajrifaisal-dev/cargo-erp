'use client';

import { Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = 'Cetak Sekarang (Ctrl + P)' }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 bg-brand font-bold rounded-xl flex items-center gap-2 cursor-pointer text-xs transition-colors shadow-sm"
    >
      <Printer className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
