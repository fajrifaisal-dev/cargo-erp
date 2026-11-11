import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-extrabold text-gray-900">
            Halaman Tidak Ditemukan (404)
          </h1>
          <p className="text-xs text-slate-500">
            Data atau alamat halaman yang Anda cari tidak tersedia atau telah dihapus.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-brand text-xs font-bold shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
