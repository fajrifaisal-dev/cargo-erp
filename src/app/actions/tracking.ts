'use server';

import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { formatSupabaseError } from '@/lib/utils';

export interface PublicTrackingData {
  receipt_number: string;
  booking_date: string;
  pickup_date: string | null;
  origin_city: string;
  destination_city: string;
  delivery_province: string | null;
  service_type: string;
  transport_via: string;
  goods_description: string;
  shipment_status:
    | 'Pending'
    | 'Muat Kapal'
    | 'Tiba Pelabuhan'
    | 'Diterima Cabang';
  received_date: string | null;
  receiver_person: string | null;
  total_koli: number;
  total_weight_kg: number;
  total_cbm: number;
  company_name: string;
  company_logo_url: string | null;
  brand_color: string;
  vessel_name: string | null;
  departure_date: string | null;
  manifest_status: string | null;
}

interface RawPublicShipmentRow {
  receipt_number: string;
  booking_date: string;
  pickup_date?: string | null;
  origin_city: string;
  destination_city: string;
  delivery_province: string | null;
  service_type: string;
  transport_via: string;
  goods_description: string;
  shipment_status: PublicTrackingData['shipment_status'];
  received_date: string | null;
  receiver_person: string | null;
  company?: {
    name?: string | null;
    logo_url?: string | null;
    brand_color?: string | null;
  } | null;
  manifest?: {
    vessel_name?: string | null;
    departure_date?: string | null;
    status?: string | null;
  } | null;
  items?: Array<{
    actual_kg?: number | null;
    volume_cbm?: number | null;
  }> | null;
}

function escapeIlikeExact(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function getPublicShipmentTracking(
  rawReceipt: string
): Promise<PublicTrackingData | null> {
  const clean = rawReceipt.trim();
  if (!clean || clean.length > 64) {
    return null;
  }
  if (!hasAdminKey()) {
    console.error('[getPublicShipmentTracking] Admin key unavailable.');
    return null;
  }

  const admin = createAdminClient();
  const exactPattern = escapeIlikeExact(clean);

  const selectFields = `
    receipt_number,
    booking_date,
    pickup_date,
    origin_city,
    destination_city,
    delivery_province,
    service_type,
    transport_via,
    goods_description,
    shipment_status,
    received_date,
    receiver_person,
    company:companies(name, logo_url, brand_color),
    manifest:manifest_shipments(vessel_name, departure_date, status),
    items:shipment_items(actual_kg, volume_cbm)
  `;

  let { data, error } = await admin
    .from('shipments')
    .select(selectFields)
    .ilike('receipt_number', exactPattern)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (error && error.message?.includes('deleted_at')) {
    const retry = await admin
      .from('shipments')
      .select(selectFields)
      .ilike('receipt_number', exactPattern)
      .limit(1)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    if (error) {
      console.warn('[getPublicShipmentTracking]', formatSupabaseError(error));
    }
    return null;
  }

  const row = data as unknown as RawPublicShipmentRow;
  const items = row.items || [];
  const totalWeight = items.reduce(
    (sum, it) => sum + Number(it.actual_kg || 0),
    0
  );
  const totalCbm = items.reduce(
    (sum, it) => sum + Number(it.volume_cbm || 0),
    0
  );

  return {
    receipt_number: row.receipt_number,
    booking_date: row.booking_date,
    pickup_date: row.pickup_date || null,
    origin_city: row.origin_city,
    destination_city: row.destination_city,
    delivery_province: row.delivery_province,
    service_type: row.service_type,
    transport_via: row.transport_via,
    goods_description: row.goods_description,
    shipment_status: row.shipment_status,
    received_date: row.received_date,
    receiver_person: row.receiver_person,
    total_koli: items.length,
    total_weight_kg: Math.round(totalWeight * 100) / 100,
    total_cbm: Math.round(totalCbm * 1000) / 1000,
    company_name: row.company?.name || 'Ekspedisi Cargo',
    company_logo_url: row.company?.logo_url || null,
    brand_color: row.company?.brand_color || '#0284C7',
    vessel_name: row.manifest?.vessel_name || null,
    departure_date: row.manifest?.departure_date || null,
    manifest_status: row.manifest?.status || null,
  };
}
