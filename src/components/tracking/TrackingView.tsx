'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Package,
  MapPin,
  Anchor,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PublicTrackingData } from '@/app/actions/tracking';

interface TrackingViewProps {
  initialQuery?: string;
  trackingData?: PublicTrackingData | null;
  searched?: boolean;
}

interface TimelineStep {
  date: string;
  title: string;
  description: string;
  done: boolean;
}

function buildTimeline(data: PublicTrackingData): TimelineStep[] {
  const rank: Record<PublicTrackingData['shipment_status'], number> = {
    Pending: 0,
    'Muat Kapal': 1,
    'Tiba Pelabuhan': 2,
    'Diterima Cabang': 3,
  };
  const currentRank = rank[data.shipment_status] ?? 0;

  const steps: TimelineStep[] = [
    {
      date: data.booking_date?.slice(0, 10) || '-',
      title: 'Pesanan Dibuat',
      description: `Resi STT ${data.receipt_number} tercatat di gudang asal (${data.origin_city})`,
      done: true,
    },
  ];

  if (data.pickup_date || currentRank >= 0) {
    steps.push({
      date: (data.pickup_date || data.booking_date)?.slice(0, 10) || '-',
      title: 'Pengiriman Telah Diatur untuk Dikirim',
      description:
        currentRank === 0
          ? 'Sedang Diproses / Menunggu Jadwal Muat'
          : `Diproses dari ${data.origin_city} (${data.service_type} • ${data.transport_via})`,
      done: true,
    });
  }

  if (currentRank >= 1) {
    steps.push({
      date:
        data.departure_date?.slice(0, 10) ||
        data.booking_date?.slice(0, 10) ||
        '-',
      title: 'Muat Kapal / Dalam Perjalanan',
      description: data.vessel_name
        ? `Armada / Kapal: ${data.vessel_name} menuju ${data.destination_city}`
        : `Dalam perjalanan menuju ${data.destination_city}`,
      done: true,
    });
  }

  if (currentRank >= 2) {
    steps.push({
      date:
        data.received_date?.slice(0, 10) ||
        data.departure_date?.slice(0, 10) ||
        '-',
      title: 'Tiba di Pelabuhan / Cabang Tujuan',
      description: `Muatan tiba di ${data.destination_city}${
        data.delivery_province ? `, ${data.delivery_province}` : ''
      }`,
      done: true,
    });
  }

  if (currentRank >= 3) {
    steps.push({
      date: data.received_date?.slice(0, 10) || '-',
      title: 'Barang Telah Diterima (POD)',
      description: data.receiver_person
        ? `Diterima oleh: ${data.receiver_person}`
        : 'Telah diterima di tujuan',
      done: true,
    });
  }

  // Show newest milestone at top just like reference
  return steps.reverse();
}

export function TrackingView({
  initialQuery = '',
  trackingData = null,
  searched = false,
}: TrackingViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    router.push(`/track/${encodeURIComponent(clean)}`);
  };

  const timeline = trackingData ? buildTimeline(trackingData) : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Company Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          {trackingData?.company_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trackingData.company_logo_url}
              alt={trackingData.company_name}
              className="h-12 object-contain"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-[#FACC15] flex items-center justify-center shadow-sm">
              <Anchor className="w-5 h-5 text-gray-900" />
            </div>
          )}

          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Tracking Resi
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="h-1 w-10 rounded-full bg-[#0284C7]" />
              <span className="h-1 w-14 rounded-full bg-[#38BDF8]" />
            </div>
          </div>
        </div>

        {/* Search Input Box */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masukkan No. Resi / STT (cth: GT-0001-11-11-2026)"
              className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-mono font-semibold text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
            />
          </div>
          <button
            type="submit"
            className="h-11 px-6 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm transition-colors flex-shrink-0"
          >
            Lacak Resi
          </button>
        </form>

        {/* Not Found State */}
        {searched && !trackingData && (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm space-y-2">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div className="text-base font-bold text-gray-900">
              Resi &ldquo;{initialQuery}&rdquo; Tidak Ditemukan
            </div>
            <p className="text-xs text-slate-500">
              Pastikan nomor STT yang Anda masukkan sudah benar dan lengkap sesuai
              pada surat tanda terima.
            </p>
          </div>
        )}

        {/* Tracking Result */}
        {trackingData && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Shipment Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-5 border-b border-slate-100 text-xs">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">
                  No. Resi STT
                </div>
                <div className="font-mono font-extrabold text-gray-900 mt-0.5">
                  {trackingData.receipt_number}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">
                  Rute Pengiriman
                </div>
                <div className="font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0284C7] flex-shrink-0" />
                  <span>
                    {trackingData.origin_city} → {trackingData.destination_city}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">
                  Muatan
                </div>
                <div className="font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {trackingData.total_koli} Koli ({trackingData.total_weight_kg} Kg)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">
                  Status Terakhir
                </div>
                <div className="mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    {trackingData.shipment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Timeline (matching gematrans.id reference) */}
            <div className="pl-2">
              {timeline.map((step, idx) => (
                <div
                  key={`${step.title}-${idx}`}
                  className="relative pl-8 pb-8 last:pb-2"
                >
                  {idx < timeline.length - 1 && (
                    <div className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-300" />
                  )}

                  <div
                    className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                      idx === 0 ? 'border-emerald-600' : 'border-gray-900'
                    }`}
                  >
                    {idx === 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-emerald-600 tabular-nums">
                      {step.date}
                    </div>
                    <div className="text-sm font-extrabold text-gray-900">
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>Ekspedisi: {trackingData.company_name}</span>
              <span>
                Layanan: {trackingData.service_type} ({trackingData.transport_via})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
