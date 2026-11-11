'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  formatDateDDMMYYYY,
  formatSupabaseError,
  getTenantPrefix,
  safeActionErrorMessage,
} from '@/lib/utils';
import {
  requireInvoiceManager,
  requireTenantAccess,
} from '@/lib/auth';
import {
  sanitizeNonNegativeAmount as sanitizeNonNegative,
  sanitizeNonNegativeFloat as sanitizePositiveOrZeroFloat,
} from '@/lib/security-rules';
import { Shipment } from '@/types/database';

function validateShipmentFinancials(payload: CreateShipmentPayload) {
  sanitizeNonNegative(payload.rate_per_unit, 'Tarif per unit');
  sanitizeNonNegative(payload.shipping_cost, 'Ongkir utama');
  sanitizeNonNegative(payload.packing_cost, 'Biaya packing');
  sanitizeNonNegative(payload.insurance_cost, 'Biaya asuransi');
  sanitizeNonNegative(payload.other_cost, 'Biaya lain-lain');

  for (let i = 0; i < (payload.items || []).length; i++) {
    const it = payload.items[i];
    sanitizePositiveOrZeroFloat(it.dim_p, `Panjang koli #${i + 1}`);
    sanitizePositiveOrZeroFloat(it.dim_l, `Lebar koli #${i + 1}`);
    sanitizePositiveOrZeroFloat(it.dim_t, `Tinggi koli #${i + 1}`);
    sanitizePositiveOrZeroFloat(it.actual_kg, `Berat koli #${i + 1}`);
  }
}

export interface CreateShipmentPayload {
  receipt_number?: string;
  member_id?: string | null;
  booking_date: string;
  pickup_date?: string;
  ref_number?: string;

  sender_name: string;
  sender_phone?: string;
  sender_address?: string;

  receiver_name: string;
  receiver_phone?: string;
  receiver_address?: string;

  origin_city: string;
  destination_city: string;
  delivery_province?: string;
  service_type: string;
  transport_via: string;

  goods_description: string;
  handling_instructions?: string;

  chargeable_type: 'Weight' | 'Volume' | 'Flat';
  rate_per_unit: number;
  shipping_cost: number;
  packing_cost?: number;
  insurance_cost?: number;
  other_cost?: number;

  payment_type: 'Cash' | 'COD' | 'Invoice';
  payment_status: 'Unpaid' | 'Paid';

  items: Array<{
    package_type: string;
    dim_p: number;
    dim_l: number;
    dim_t: number;
    actual_kg: number;
  }>;
}

interface GetShipmentsOptions {
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  onlyDeleted?: boolean;
  limit?: number;
}

function applyShipmentFilters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  options: GetShipmentsOptions | undefined,
  useDeletedFilter: boolean
) {
  let query = supabase
    .from('shipments')
    .select(`
      *,
      company:companies(*),
      member:members(*),
      manifest:manifest_shipments(*),
      items:shipment_items(*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (useDeletedFilter) {
    query = options?.onlyDeleted
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null);
  }

  if (options?.status && options.status !== 'all') {
    query = query.eq('shipment_status', options.status);
  }

  if (options?.paymentStatus && options.paymentStatus !== 'all') {
    query = query.eq('payment_status', options.paymentStatus);
  }

  if (options?.dateFrom) {
    query = query.gte('booking_date', options.dateFrom);
  }

  if (options?.dateTo) {
    query = query.lte('booking_date', options.dateTo);
  }

  if (options?.search) {
    const s = options.search;
    query = query.or(
      `receipt_number.ilike.%${s}%,sender_name.ilike.%${s}%,receiver_name.ilike.%${s}%,destination_city.ilike.%${s}%`
    );
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

export async function getShipments(options?: GetShipmentsOptions) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  let { data, error } = await applyShipmentFilters(
    supabase,
    companyId,
    options,
    true
  );

  // Graceful fallback if `deleted_at` column has not been migrated in Supabase yet
  if (error && error.message?.includes('deleted_at')) {
    if (options?.onlyDeleted) {
      return [] as Shipment[];
    }
    const retry = await applyShipmentFilters(
      supabase,
      companyId,
      options,
      false
    );
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.warn('Warning fetching shipments:', formatSupabaseError(error));
    return [];
  }
  return data as Shipment[];
}

export async function getShipmentById(id: string) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      company:companies(*),
      member:members(*),
      manifest:manifest_shipments(*),
      items:shipment_items(*)
    `)
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId)
    .single();

  if (error) {
    console.warn('Warning fetching shipment by id:', formatSupabaseError(error));
    return null;
  }
  return data as Shipment;
}

function buildShipmentRecord(
  payload: CreateShipmentPayload,
  receiptNumber: string,
  includePickupDate: boolean
) {
  return {
    member_id: payload.member_id || null,
    receipt_number: receiptNumber,
    booking_date: payload.booking_date,
    ...(includePickupDate && payload.pickup_date
      ? { pickup_date: payload.pickup_date }
      : {}),
    ref_number: payload.ref_number || null,

    sender_name: payload.sender_name,
    sender_phone: payload.sender_phone || null,
    sender_address: payload.sender_address || null,

    receiver_name: payload.receiver_name,
    receiver_phone: payload.receiver_phone || null,
    receiver_address: payload.receiver_address || null,

    origin_city: payload.origin_city || 'Surabaya',
    destination_city: payload.destination_city,
    delivery_province: payload.delivery_province || null,
    service_type: payload.service_type || 'Reguler',
    transport_via: payload.transport_via || 'Laut',

    goods_description: payload.goods_description || 'General Cargo',
    handling_instructions: payload.handling_instructions || null,

    chargeable_type: payload.chargeable_type || 'Weight',
    rate_per_unit: sanitizeNonNegative(payload.rate_per_unit, 'Tarif per unit'),
    shipping_cost: sanitizeNonNegative(payload.shipping_cost, 'Ongkir utama'),
    packing_cost: sanitizeNonNegative(payload.packing_cost, 'Biaya packing'),
    insurance_cost: sanitizeNonNegative(payload.insurance_cost, 'Biaya asuransi'),
    other_cost: sanitizeNonNegative(payload.other_cost, 'Biaya lain-lain'),

    payment_type: payload.payment_type || 'Invoice',
    payment_status:
      payload.payment_status ||
      (payload.payment_type === 'Cash' ? 'Paid' : 'Unpaid'),
  };
}

async function replaceShipmentItems(
  shipmentId: string,
  items: CreateShipmentPayload['items'],
  clearExisting: boolean
) {
  const supabase = await createClient();
  if (clearExisting) {
    const { error: delError } = await supabase
      .from('shipment_items')
      .delete()
      .eq('shipment_id', shipmentId);
    if (delError) {
      console.warn('Warning clearing shipment items:', formatSupabaseError(delError));
    }
  }

  if (items && items.length > 0) {
    const itemsToInsert = items.map((item, index) => ({
      shipment_id: shipmentId,
      koli_index: index + 1,
      package_type: item.package_type || 'Koli',
      dim_p: item.dim_p || 0,
      dim_l: item.dim_l || 0,
      dim_t: item.dim_t || 0,
      actual_kg: item.actual_kg || 0,
    }));

    const CHUNK_SIZE = 250;
    for (let i = 0; i < itemsToInsert.length; i += CHUNK_SIZE) {
      const chunk = itemsToInsert.slice(i, i + CHUNK_SIZE);
      const { error: itemsError } = await supabase
        .from('shipment_items')
        .insert(chunk);

      if (itemsError) {
        console.warn('Warning inserting shipment items:', formatSupabaseError(itemsError));
        break;
      }
    }
  }
}

async function generateTenantReceiptNumber(
  companyId: string,
  bookingDate?: string
): Promise<string> {
  const supabase = await createClient();
  const [{ data: company }, { count }] = await Promise.all([
    supabase
      .from('companies')
      .select('slug, name')
      .eq('id', companyId)
      .single(),
    supabase
      .from('shipments')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId),
  ]);

  const prefix = getTenantPrefix(company);
  const datePart = formatDateDDMMYYYY(bookingDate);
  let seq = (count || 0) + 1;

  for (let attempt = 0; attempt < 5; attempt++) {
    const numStr = String(seq + attempt).padStart(4, '0');
    const candidate = `${prefix}-${numStr}-${datePart}`;
    const { data: existing } = await supabase
      .from('shipments')
      .select('id')
      .eq('company_id', companyId)
      .eq('receipt_number', candidate)
      .maybeSingle();

    if (!existing) {
      return candidate;
    }
  }

  const fallbackRand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${fallbackRand}-${datePart}`;
}

export async function createShipment(payload: CreateShipmentPayload) {
  const auth = await requireTenantAccess();
  validateShipmentFinancials(payload);

  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  if (payload.member_id) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('id', payload.member_id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!member) {
      throw new Error('Member yang dipilih tidak valid untuk ekspedisi aktif.');
    }
  }

  // Marketing cannot force Unpaid/Invoice shipments to Paid without Finance/Admin
  const safePayload: CreateShipmentPayload = auth.canManagePaymentStatus
    ? payload
    : {
        ...payload,
        payment_status: payload.payment_type === 'Cash' ? 'Paid' : 'Unpaid',
      };

  // Generate tenant-aware receipt number: {PREFIX}-{UNIQUE_NUM}-{DD-MM-YYYY}
  const receiptNumber =
    safePayload.receipt_number && safePayload.receipt_number.trim() !== ''
      ? safePayload.receipt_number.trim()
      : await generateTenantReceiptNumber(companyId, safePayload.booking_date);

  let { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .insert({
      company_id: companyId,
      shipment_status: 'Pending',
      ...buildShipmentRecord(safePayload, receiptNumber, true),
    })
    .select()
    .single();

  if (shipmentError && shipmentError.message?.includes('pickup_date')) {
    const retry = await supabase
      .from('shipments')
      .insert({
        company_id: companyId,
        shipment_status: 'Pending',
        ...buildShipmentRecord(safePayload, receiptNumber, false),
      })
      .select()
      .single();
    shipment = retry.data;
    shipmentError = retry.error;
  }

  if (shipmentError || !shipment) {
    throw new Error(
      safeActionErrorMessage(
        'createShipment',
        shipmentError,
        'Gagal menyimpan data STT baru.'
      )
    );
  }

  await replaceShipmentItems(shipment.id, safePayload.items, false);

  revalidatePath('/shipments');
  revalidatePath('/');
  return shipment;
}

export async function updateShipment(
  id: string,
  payload: CreateShipmentPayload
) {
  const auth = await requireTenantAccess();
  validateShipmentFinancials(payload);

  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const { data: existingShipment } = await supabase
    .from('shipments')
    .select('id, payment_status')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();

  if (!existingShipment) {
    throw new Error('Resi tidak ditemukan pada ekspedisi aktif.');
  }

  if (payload.member_id) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('id', payload.member_id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!member) {
      throw new Error('Member yang dipilih tidak valid untuk ekspedisi aktif.');
    }
  }

  // Only Finance & Master Admin may override payment_status during edits
  const safePayload: CreateShipmentPayload = auth.canManagePaymentStatus
    ? payload
    : {
        ...payload,
        payment_status: existingShipment.payment_status as 'Unpaid' | 'Paid',
      };

  const receiptNumber =
    safePayload.receipt_number && safePayload.receipt_number.trim() !== ''
      ? safePayload.receipt_number.trim()
      : await generateTenantReceiptNumber(companyId, safePayload.booking_date);

  let { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .update(buildShipmentRecord(safePayload, receiptNumber, true))
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();

  if (shipmentError && shipmentError.message?.includes('pickup_date')) {
    const retry = await supabase
      .from('shipments')
      .update(buildShipmentRecord(safePayload, receiptNumber, false))
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    shipment = retry.data;
    shipmentError = retry.error;
  }

  if (shipmentError || !shipment) {
    throw new Error(
      safeActionErrorMessage(
        'updateShipment',
        shipmentError,
        'Gagal memperbarui data STT.'
      )
    );
  }

  await replaceShipmentItems(id, safePayload.items, true);

  revalidatePath('/shipments');
  revalidatePath(`/shipments/${id}`);
  revalidatePath('/');
  return shipment;
}

export async function updateShipmentStatus(
  id: string,
  status: 'Pending' | 'Muat Kapal' | 'Tiba Pelabuhan' | 'Diterima Cabang',
  extra?: {
    received_date?: string;
    receiver_person?: string;
    pod_photo_url?: string;
  }
) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    shipment_status: status,
  };

  if (extra?.received_date) updateData.received_date = extra.received_date;
  if (extra?.receiver_person) updateData.receiver_person = extra.receiver_person;
  if (extra?.pod_photo_url) updateData.pod_photo_url = extra.pod_photo_url;

  const { error } = await supabase
    .from('shipments')
    .update(updateData)
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'updateShipmentStatus',
        error,
        'Gagal memperbarui status pengiriman.'
      )
    );
  }

  revalidatePath('/shipments');
  revalidatePath(`/shipments/${id}`);
  revalidatePath('/');
}

export async function updateShipmentPaymentStatus(
  id: string,
  status: 'Unpaid' | 'Paid'
) {
  const auth = await requireInvoiceManager();
  const supabase = await createClient();

  const { error } = await supabase
    .from('shipments')
    .update({ payment_status: status })
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'updateShipmentPaymentStatus',
        error,
        'Gagal mengubah status pembayaran resi.'
      )
    );
  }

  revalidatePath('/shipments');
  revalidatePath(`/shipments/${id}`);
}

export async function softDeleteShipment(id: string) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const { error } = await supabase
    .from('shipments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'softDeleteShipment',
        error,
        'Gagal menghapus sementara resi.'
      )
    );
  }

  revalidatePath('/shipments');
  revalidatePath(`/shipments/${id}`);
  revalidatePath('/');
}

export async function restoreShipment(id: string) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const { error } = await supabase
    .from('shipments')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'restoreShipment',
        error,
        'Gagal memulihkan resi.'
      )
    );
  }

  revalidatePath('/shipments');
  revalidatePath(`/shipments/${id}`);
  revalidatePath('/');
}

export async function deleteShipment(id: string) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'deleteShipment',
        error,
        'Gagal menghapus permanen resi.'
      )
    );
  }

  revalidatePath('/shipments');
  revalidatePath('/');
}
