'use server';

import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTenantAccess } from '@/lib/auth';
import { safeActionErrorMessage } from '@/lib/utils';
import {
  buildMemberImportPreview,
  DuplicateStrategy,
  mapHeaderToField,
  MemberImportInput,
  MemberImportPreviewResult,
  RawMappedMemberRow,
  sanitizeCellText,
} from '@/lib/member-import';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 2000;

export type PreviewMemberImportResponse =
  | { ok: true; preview: MemberImportPreviewResult; fileName: string }
  | { ok: false; error: string };

export type CommitMemberImportResponse =
  | { ok: true; inserted: number; updated: number; skipped: number }
  | { ok: false; error: string };

export async function previewMemberImport(
  formData: FormData
): Promise<PreviewMemberImportResponse> {
  try {
    const auth = await requireTenantAccess();
    const supabase = await createClient();
    const companyId = auth.activeCompanyId;

    const entry = formData.get('file');
    if (!entry || typeof entry === 'string' || typeof entry.arrayBuffer !== 'function') {
      return { ok: false, error: 'Silakan pilih file Excel (.xlsx) atau .csv terlebih dahulu.' };
    }

    const fileName = entry.name || 'upload.xlsx';
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.xls')) {
      return {
        ok: false,
        error: 'Format .xls lama tidak didukung. Silakan Save As ke format .xlsx atau .csv.',
      };
    }
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
      return {
        ok: false,
        error: 'Format file harus .xlsx atau .csv.',
      };
    }

    if (entry.size <= 0 || entry.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: 'Ukuran file maksimal 5 MB dan tidak boleh kosong.',
      };
    }

    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = new ExcelJS.Workbook();

    if (lowerName.endsWith('.csv')) {
      const sampleLine = buffer.toString('utf8', 0, Math.min(buffer.length, 2048)).split(/\r?\n/)[0] || '';
      const semiCount = (sampleLine.match(/;/g) || []).length;
      const commaCount = (sampleLine.match(/,/g) || []).length;
      const delimiter = semiCount > commaCount ? ';' : ',';
      await workbook.csv.read(Readable.from(buffer), {
        parserOptions: { delimiter },
      });
    } else {
      // ExcelJS accepts Node Buffer directly at runtime
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      return {
        ok: false,
        error: 'Sheet pertama kosong atau hanya berisi header tanpa data.',
      };
    }

    type FieldKey = 'name' | 'phone' | 'address' | 'payment_term_days' | 'credit_limit';
    let headerRowIndex = -1;
    const colToField = new Map<number, FieldKey>();

    const maxHeaderScan = Math.min(5, worksheet.rowCount);
    for (let r = 1; r <= maxHeaderScan; r++) {
      const row = worksheet.getRow(r);
      const candidateMap = new Map<number, FieldKey>();
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = sanitizeCellText(cell.value);
        const mapped = mapHeaderToField(text);
        if (mapped && !Array.from(candidateMap.values()).includes(mapped)) {
          candidateMap.set(colNumber, mapped);
        }
      });

      if (Array.from(candidateMap.values()).includes('name')) {
        headerRowIndex = r;
        candidateMap.forEach((v, k) => colToField.set(k, v));
        break;
      }
    }

    if (headerRowIndex === -1 || colToField.size === 0) {
      return {
        ok: false,
        error:
          'Kolom "Nama Perusahaan" / "Nama" tidak ditemukan di baris header. Gunakan template resmi agar kolom terbaca.',
      };
    }

    const rawRows: RawMappedMemberRow[] = [];
    for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const mapped: RawMappedMemberRow = { rowNumber: r };
      let hasAnyCell = false;

      colToField.forEach((field, colNumber) => {
        const cellVal = row.getCell(colNumber).value;
        if (sanitizeCellText(cellVal) !== '') {
          hasAnyCell = true;
        }
        mapped[field] = cellVal;
      });

      if (!hasAnyCell) continue;
      rawRows.push(mapped);

      if (rawRows.length > MAX_ROWS) {
        return {
          ok: false,
          error: `Maksimal ${MAX_ROWS} baris per sekali import. Silakan bagi file menjadi beberapa bagian.`,
        };
      }
    }

    if (rawRows.length === 0) {
      return {
        ok: false,
        error: 'Tidak ada baris data yang terbaca di bawah header.',
      };
    }

    const { data: existingMembers, error: fetchError } = await supabase
      .from('members')
      .select('id, name')
      .eq('company_id', companyId);

    if (fetchError) {
      return {
        ok: false,
        error: safeActionErrorMessage(
          'previewMemberImport.fetchMembers',
          fetchError,
          'Gagal membaca data member eksisting untuk pengecekan duplikat.'
        ),
      };
    }

    const preview = buildMemberImportPreview(rawRows, existingMembers || []);
    return { ok: true, preview, fileName };
  } catch (err) {
    return {
      ok: false,
      error: safeActionErrorMessage(
        'previewMemberImport',
        err,
        'Gagal membaca file Excel. Pastikan file .xlsx/.csv valid dan tidak terproteksi password.'
      ),
    };
  }
}

export async function commitMemberImport(
  rows: MemberImportInput[],
  strategy: DuplicateStrategy
): Promise<CommitMemberImportResponse> {
  try {
    const auth = await requireTenantAccess();
    const supabase = await createClient();
    const companyId = auth.activeCompanyId;

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: 'Tidak ada data member yang siap diimport.' };
    }
    if (rows.length > MAX_ROWS) {
      return { ok: false, error: `Maksimal ${MAX_ROWS} baris per proses import.` };
    }

    const cleanStrategy: DuplicateStrategy = strategy === 'update' ? 'update' : 'skip';

    // Re-fetch authoritative member list at commit time
    const { data: existingMembers, error: fetchError } = await supabase
      .from('members')
      .select('id, name')
      .eq('company_id', companyId);

    if (fetchError) {
      return {
        ok: false,
        error: safeActionErrorMessage(
          'commitMemberImport.fetchMembers',
          fetchError,
          'Gagal memeriksa data member eksisting.'
        ),
      };
    }

    const validated = buildMemberImportPreview(rows, existingMembers || []);
    const toInsert = validated.rows
      .filter((r) => r.status === 'new')
      .map((r) => ({
        company_id: companyId,
        name: r.name,
        phone: r.phone,
        address: r.address,
        payment_term_days: r.payment_term_days,
        credit_limit: r.credit_limit,
      }));

    const toUpdate =
      cleanStrategy === 'update'
        ? validated.rows.filter((r) => r.status === 'duplicate_db' && r.existingMemberId)
        : [];

    let inserted = 0;
    const chunkSize = 100;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error: insertError } = await supabase.from('members').insert(chunk);
      if (insertError) {
        return {
          ok: false,
          error: safeActionErrorMessage(
            'commitMemberImport.insert',
            insertError,
            'Gagal menyimpan sebagian data member baru ke database.'
          ),
        };
      }
      inserted += chunk.length;
    }

    let updated = 0;
    for (const row of toUpdate) {
      const { error: updateError } = await supabase
        .from('members')
        .update({
          name: row.name,
          phone: row.phone,
          address: row.address,
          payment_term_days: row.payment_term_days,
          credit_limit: row.credit_limit,
        })
        .eq('company_id', companyId)
        .eq('id', row.existingMemberId!);

      if (updateError) {
        return {
          ok: false,
          error: safeActionErrorMessage(
            'commitMemberImport.update',
            updateError,
            'Gagal memperbarui data member duplikat.'
          ),
        };
      }
      updated += 1;
    }

    const skipped =
      validated.summary.duplicateFile +
      validated.summary.invalid +
      (cleanStrategy === 'skip' ? validated.summary.duplicateDb : 0);

    revalidatePath('/members');
    revalidatePath('/shipments/new');

    return { ok: true, inserted, updated, skipped };
  } catch (err) {
    return {
      ok: false,
      error: safeActionErrorMessage(
        'commitMemberImport',
        err,
        'Terjadi kendala saat menyimpan data import member.'
      ),
    };
  }
}
