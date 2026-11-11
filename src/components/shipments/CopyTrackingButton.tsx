'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface CopyTrackingButtonProps {
  receiptNumber: string;
}

export function CopyTrackingButton({ receiptNumber }: CopyTrackingButtonProps) {
  const [copied, setCopied] = useState(false);
  const trackingPath = `/track/${encodeURIComponent(receiptNumber)}`;

  const handleCopy = async () => {
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${trackingPath}`
        : trackingPath;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Salin URL Tracking Resi:', fullUrl);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors"
        title="Salin link tracking publik untuk customer"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Link Disalin</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Link Track</span>
          </>
        )}
      </button>

      <Link
        href={trackingPath}
        target="_blank"
        className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
        title="Buka halaman tracking publik"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Tracking</span>
      </Link>
    </div>
  );
}
