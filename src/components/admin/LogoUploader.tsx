'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, Upload } from 'lucide-react';
import { getContrastTextColor } from '@/lib/utils';

interface LogoUploaderProps {
  value: string;
  onChange: (nextUrl: string) => void;
  companyName?: string;
  brandColor?: string;
}

const MAX_RAW_BYTES = 5 * 1024 * 1024; // 5MB raw upload limit
const MAX_SVG_BYTES = 150 * 1024; // 150KB limit for inline SVG
const MAX_LOGO_DIM = 256;

/**
 * Compresses raster logos onto a 256px max canvas Data URL so logos persist
 * directly in `companies.logo_url` without requiring Storage bucket setup.
 */
async function fileToOptimizedDataUrl(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    if (file.size > MAX_SVG_BYTES) {
      throw new Error('Ukuran file SVG maksimal 150 KB.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca file SVG.'));
      reader.readAsDataURL(file);
    });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_LOGO_DIM / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser tidak mendukung pemrosesan gambar.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    // Keep PNG transparency for PNG/WebP logos; use WebP compression for JPEG photos
    const outputMime =
      file.type === 'image/png' || file.type === 'image/webp'
        ? 'image/png'
        : 'image/webp';
    return canvas.toDataURL(outputMime, 0.88);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function LogoUploader({
  value,
  onChange,
  companyName = 'PT',
  brandColor = '#4F46E5',
}: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(
    Boolean(value && !value.startsWith('data:'))
  );
  const [previewFailed, setPreviewFailed] = useState(false);

  const initials = (companyName.trim() || 'PT').slice(0, 2).toUpperCase();
  const badgeText = getContrastTextColor(brandColor);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setPreviewFailed(false);

    if (!file.type.startsWith('image/')) {
      setUploadError('Pilih file gambar (PNG, JPG, WebP, atau SVG).');
      return;
    }
    if (file.size > MAX_RAW_BYTES) {
      setUploadError('Ukuran file maksimal 5 MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      onChange(dataUrl);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal memproses file logo.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-slate-600 font-semibold">
          Logo Perusahaan (Opsional)
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
        >
          <Link2 className="w-3 h-3" />
          <span>{showUrlInput ? 'Sembunyikan input URL' : 'Atau pakai URL'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
        {/* Live Preview */}
        {value && !previewFailed ? (
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={companyName}
              onError={() => setPreviewFailed(true)}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-sm"
            style={{ backgroundColor: brandColor, color: badgeText }}
          >
            {initials}
          </div>
        )}

        {/* Upload Actions */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-gray-800 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {value ? (
                <Upload className="w-3.5 h-3.5 text-brand" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5 text-brand" />
              )}
              <span>
                {isProcessing
                  ? 'Memproses...'
                  : value
                  ? 'Ganti File Logo'
                  : 'Upload File Logo'}
              </span>
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setPreviewFailed(false);
                  setUploadError(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            PNG, JPG, WebP, atau SVG (maks. 5 MB, otomatis dioptimalkan ke 256px).
          </p>
        </div>
      </div>

      {showUrlInput && (
        <input
          type="url"
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => {
            setPreviewFailed(false);
            onChange(e.target.value);
          }}
          placeholder="https://contoh.com/logo.png"
          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
        />
      )}

      {uploadError && (
        <div className="text-[11px] font-semibold text-rose-600">{uploadError}</div>
      )}
    </div>
  );
}
