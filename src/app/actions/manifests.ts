'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { formatSupabaseError, safeActionErrorMessage } from '@/lib/utils';
import { requireTenantAccess } from '@/lib/auth';
import { ManifestShipment } from '@/types/database';

interface RawManifestRow extends Omit<ManifestShipment, 'shipments'> {
  shipments?: Array<{
    id: string;
    receipt_number: string;
    destination_city: string;
    goods_description: string;
    total_bill: number;
    items?: Array<{
      id: string;
      package_type: string;
      actual_kg: number;
      volume_cbm: number;
    }>;
  }>;
}

export async function getManifests(options?: {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  let query = supabase
    .from('manifest_shipments')
    .select(`
      *,
      shipments:shipments(
        id,
        receipt_number,
        destination_city,
        goods_description,
        total_bill,
        items:shipment_items(id, package_type, actual_kg, volume_cbm)
      )
    `)
    .eq('company_id', companyId)
    .order('departure_date', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.dateFrom) {
    query = query.gte('departure_date', options.dateFrom);
  }

  if (options?.dateTo) {
    query = query.lte('departure_date', options.dateTo);
  }

  if (options?.search) {
    const s = options.search;
    query = query.or(`manifest_number.ilike.%${s}%,vendor_name.ilike.%${s}%,vessel_name.ilike.%${s}%,destination_city.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Warning fetching manifests:', formatSupabaseError(error));
    return [];
  }

  // Calculate summary counts per manifest
  return ((data || []) as RawManifestRow[]).map((m) => {
    const shipments = m.shipments || [];
    let totalPackages = 0;
    let totalWeight = 0;
    let totalCbm = 0;

    shipments.forEach((s) => {
      (s.items || []).forEach((item) => {
        totalPackages += 1;
        totalWeight += Number(item.actual_kg || 0);
        totalCbm += Number(item.volume_cbm || 0);
      });
    });

    return {
      ...m,
      shipments: undefined,
      shipments_count: shipments.length,
      total_packages: totalPackages,
      total_weight: Math.round(totalWeight * 100) / 100,
      total_cbm: Math.round(totalCbm * 1000) / 1000,
    } as ManifestShipment;
  });
}

export async function getManifestById(id: string) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('manifest_shipments')
    .select(`
      *,
      shipments:shipments(
        *,
        member:members(*),
        items:shipment_items(*)
      )
    `)
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId)
    .single();

  if (error) {
    console.warn('Warning fetching manifest by id:', formatSupabaseError(error));
    return null;
  }
  return data as ManifestShipment;
}

export async function createManifest(payload: {
  manifest_number: string;
  vendor_name: string;
  vessel_name?: string;
  destination_city: string;
  departure_date: string;
  vendor_cost: number;
}) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const vendorCost = Math.max(0, Math.round(Number(payload.vendor_cost || 0)));

  const { data, error } = await supabase
    .from('manifest_shipments')
    .insert({
      company_id: companyId,
      manifest_number: payload.manifest_number,
      vendor_name: payload.vendor_name,
      vessel_name: payload.vessel_name || null,
      destination_city: payload.destination_city,
      departure_date: payload.departure_date,
      vendor_cost: Number.isFinite(vendorCost) ? vendorCost : 0,
      status: 'Transit',
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'createManifest',
        error,
        'Gagal membuat manifest muatan baru.'
      )
    );
  }

  revalidatePath('/manifests');
  return data as ManifestShipment;
}

export async function assignShipmentsToManifest(
  manifestId: string,
  shipmentIds: string[]
) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from('shipments')
    .update({
      manifest_id: manifestId,
      shipment_status: 'Muat Kapal',
    })
    .in('id', shipmentIds)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'assignShipmentsToManifest',
        error,
        'Gagal menambahkan STT ke manifest.'
      )
    );
  }

  revalidatePath('/manifests');
  revalidatePath(`/manifests/${manifestId}`);
  revalidatePath('/shipments');
}

export async function removeShipmentFromManifest(
  shipmentId: string,
  manifestId: string
) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from('shipments')
    .update({
      manifest_id: null,
      shipment_status: 'Pending',
    })
    .eq('id', shipmentId)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'removeShipmentFromManifest',
        error,
        'Gagal mengeluarkan STT dari manifest.'
      )
    );
  }

  revalidatePath(`/manifests/${manifestId}`);
  revalidatePath('/manifests');
  revalidatePath('/shipments');
}

export async function updateManifestStatus(
  manifestId: string,
  status: 'Transit' | 'Arrived' | 'Completed'
) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from('manifest_shipments')
    .update({ status })
    .eq('id', manifestId)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'updateManifestStatus',
        error,
        'Gagal memperbarui status manifest.'
      )
    );
  }

  // If status is Arrived or Completed, optionally update assigned shipments status
  if (status === 'Arrived') {
    await supabase
      .from('shipments')
      .update({ shipment_status: 'Tiba Pelabuhan' })
      .eq('manifest_id', manifestId)
      .eq('company_id', auth.activeCompanyId);
  }

  revalidatePath('/manifests');
  revalidatePath(`/manifests/${manifestId}`);
  revalidatePath('/shipments');
}
