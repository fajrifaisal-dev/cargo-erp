'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveCompany, deleteCompany } from '@/app/actions/companies';
import { CheckCircle2, Trash2, ArrowRightLeft } from 'lucide-react';

interface ExpeditionActionsProps {
  companyId: string;
  companyName: string;
  isActive: boolean;
  canDelete: boolean;
}

export function ExpeditionActions({
  companyId,
  companyName,
  isActive,
  canDelete,
}: ExpeditionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSetActive = () => {
    startTransition(async () => {
      await setActiveCompany(companyId);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Hapus ekspedisi "${companyName}"? Semua data terkait juga akan terhapus.`)) {
      return;
    }
    startTransition(async () => {
      await deleteCompany(companyId);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {isActive ? (
        <span className="inline-flex items-center gap-1 px-3 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sedang Aktif
        </span>
      ) : (
        <button
          type="button"
          onClick={handleSetActive}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl bg-brand text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{isPending ? 'Memilih...' : 'Aktifkan'}</span>
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title="Hapus Ekspedisi"
          className="p-2 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
