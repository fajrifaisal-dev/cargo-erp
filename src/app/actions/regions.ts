'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireMasterAdmin } from '@/lib/auth';
import { INDONESIA_CITIES, IndonesiaCity } from '@/lib/indonesia-regions';
import { Region } from '@/types/database';
import { formatSupabaseError, safeActionErrorMessage } from '@/lib/utils';

export async function getActiveRegions(): Promise<IndonesiaCity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('regions')
    .select('city, province')
    .eq('is_active', true)
    .order('city', { ascending: true });

  if (!error && data && data.length > 0) {
    return data as IndonesiaCity[];
  }

  // Fallback to built-in region list if `regions` table is not migrated/seeded yet
  return INDONESIA_CITIES;
}

export async function getRegionsForAdmin(options?: {
  search?: string;
  province?: string;
}): Promise<{ regions: Region[]; tableReady: boolean }> {
  await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from('regions')
    .select('*')
    .order('province', { ascending: true })
    .order('city', { ascending: true });

  if (options?.province && options.province !== 'all') {
    query = query.eq('province', options.province);
  }

  if (options?.search && options.search.trim() !== '') {
    const q = options.search.trim();
    query = query.or(`city.ilike.%${q}%,province.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Warning fetching regions:', formatSupabaseError(error));
    return { regions: [], tableReady: false };
  }

  return { regions: (data || []) as Region[], tableReady: true };
}

export async function createRegion(payload: {
  province: string;
  city: string;
}): Promise<Region> {
  await requireMasterAdmin();
  const province = payload.province.trim();
  const city = payload.city.trim();

  if (!province || !city) {
    throw new Error('Provinsi dan Nama Kota/Kabupaten wajib diisi.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('regions')
    .insert({ province, city, is_active: true })
    .select()
    .single();

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'createRegion',
        error,
        'Gagal menambah wilayah baru.'
      )
    );
  }

  revalidatePath('/admin/regions');
  revalidatePath('/shipments/new');
  return data as Region;
}

export async function toggleRegionStatus(
  id: string,
  isActive: boolean
): Promise<void> {
  await requireMasterAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('regions')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'toggleRegionStatus',
        error,
        'Gagal mengubah status wilayah.'
      )
    );
  }

  revalidatePath('/admin/regions');
  revalidatePath('/shipments/new');
}

export async function deleteRegion(id: string): Promise<void> {
  await requireMasterAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('regions').delete().eq('id', id);
  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'deleteRegion',
        error,
        'Gagal menghapus wilayah.'
      )
    );
  }

  revalidatePath('/admin/regions');
  revalidatePath('/shipments/new');
}

export async function seedDefaultRegions(): Promise<{ inserted: number }> {
  await requireMasterAdmin();
  const supabase = await createClient();

  const rows = INDONESIA_CITIES.map((item) => ({
    province: item.province,
    city: item.city,
    is_active: true,
  }));

  const CHUNK_SIZE = 200;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('regions')
      .upsert(chunk, { onConflict: 'province,city', ignoreDuplicates: true });

    if (error) {
      throw new Error(
        safeActionErrorMessage(
          'seedDefaultRegions',
          error,
          'Gagal menyinkronkan data wilayah default.'
        )
      );
    }
  }

  revalidatePath('/admin/regions');
  revalidatePath('/shipments/new');
  return { inserted: rows.length };
}
