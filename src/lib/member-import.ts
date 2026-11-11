export type DuplicateStrategy = 'skip' | 'update';

export type MemberPreviewStatus =
  | 'new'
  | 'duplicate_db'
  | 'duplicate_file'
  | 'invalid';

export interface MemberImportInput {
  rowNumber: number;
  name: string;
  phone: string | null;
  address: string | null;
  payment_term_days: number;
  credit_limit: number;
}

export interface MemberImportPreviewRow extends MemberImportInput {
  normalizedName: string;
  status: MemberPreviewStatus;
  errors: string[];
  note?: string;
  existingMemberId?: string;
  existingMemberName?: string;
}

export interface MemberImportSummary {
  total: number;
  validNew: number;
  duplicateDb: number;
  duplicateFile: number;
  invalid: number;
}

export interface MemberImportPreviewResult {
  rows: MemberImportPreviewRow[];
  summary: MemberImportSummary;
}

export function normalizeMemberName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[./*()+[\]_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const MEMBER_HEADER_ALIASES: Record<
  'name' | 'phone' | 'address' | 'payment_term_days' | 'credit_limit',
  string[]
> = {
  name: [
    'nama',
    'nama member',
    'nama perusahaan',
    'nama pelanggan',
    'nama shipper',
    'member',
    'shipper',
    'customer',
    'perusahaan',
    'name',
    'company',
    'company name',
  ],
  phone: [
    'telepon',
    'no telepon',
    'nomor telepon',
    'no telp',
    'telp',
    'hp',
    'no hp',
    'nomor hp',
    'no hp whatsapp',
    'no hp wa',
    'hp whatsapp',
    'telepon whatsapp',
    'whatsapp',
    'wa',
    'no wa',
    'kontak',
    'phone',
  ],
  address: [
    'alamat',
    'alamat lengkap',
    'alamat kantor',
    'alamat gudang',
    'address',
    'lokasi',
  ],
  payment_term_days: [
    'top',
    'top hari',
    'termin',
    'termin hari',
    'termin pembayaran',
    'termin pembayaran hari',
    'jatuh tempo',
    'payment term',
    'payment term days',
    'term',
  ],
  credit_limit: [
    'plafon',
    'plafon kredit',
    'plafond',
    'plafond kredit',
    'limit',
    'limit kredit',
    'kredit',
    'credit limit',
  ],
};

export function mapHeaderToField(
  header: string
): keyof typeof MEMBER_HEADER_ALIASES | null {
  const normalized = normalizeHeaderKey(header);
  if (!normalized) return null;

  for (const [field, aliases] of Object.entries(MEMBER_HEADER_ALIASES) as Array<
    [keyof typeof MEMBER_HEADER_ALIASES, string[]]
  >) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }
  return null;
}

export function sanitizeCellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text.trim();
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) =>
          part && typeof part === 'object' && 'text' in part
            ? String((part as { text?: unknown }).text ?? '')
            : ''
        )
        .join('')
        .trim();
    }
    if ('result' in obj) {
      return sanitizeCellText(obj.result);
    }
  }
  return '';
}

export function parseIntegerCell(
  value: unknown,
  fallback: number
): { value: number; valid: boolean } {
  if (value === null || value === undefined) {
    return { value: fallback, valid: true };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { value: fallback, valid: false };
    return { value: Math.round(value), valid: true };
  }

  const raw = sanitizeCellText(value);
  if (!raw) return { value: fallback, valid: true };

  // Strip common currency/unit suffixes (Rp, IDR, hari) and thousand separators
  let cleaned = raw.replace(/^(rp\.?|idr)\s*/i, '').replace(/\s*hari$/i, '').trim();
  // Indonesian format like 5.000.000 or 5,000,000 -> strip grouping separators
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/\s+/g, '');
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return { value: fallback, valid: false };
  }
  return { value: Math.round(parsed), valid: true };
}

export interface RawMappedMemberRow {
  rowNumber: number;
  name?: unknown;
  phone?: unknown;
  address?: unknown;
  payment_term_days?: unknown;
  credit_limit?: unknown;
}

export function buildMemberImportPreview(
  rawRows: RawMappedMemberRow[],
  existingMembers: Array<{ id: string; name: string }>
): MemberImportPreviewResult {
  const existingMap = new Map<string, { id: string; name: string }>();
  for (const m of existingMembers) {
    const key = normalizeMemberName(m.name);
    if (key && !existingMap.has(key)) {
      existingMap.set(key, { id: m.id, name: m.name });
    }
  }

  const seenInFile = new Map<string, number>();
  const rows: MemberImportPreviewRow[] = [];

  for (const raw of rawRows) {
    const cleanName = sanitizeCellText(raw.name).replace(/\s+/g, ' ');
    const cleanPhone = sanitizeCellText(raw.phone) || null;
    const cleanAddress = sanitizeCellText(raw.address) || null;
    const topParsed = parseIntegerCell(raw.payment_term_days, 14);
    const creditParsed = parseIntegerCell(raw.credit_limit, 0);

    // Completely blank trailing rows are skipped by callers, but guard here too
    const hasAnyValue =
      cleanName ||
      cleanPhone ||
      cleanAddress ||
      sanitizeCellText(raw.payment_term_days) ||
      sanitizeCellText(raw.credit_limit);
    if (!hasAnyValue) continue;

    const errors: string[] = [];
    if (!cleanName) {
      errors.push('Nama member wajib diisi.');
    } else if (cleanName.length < 2) {
      errors.push('Nama member minimal 2 karakter.');
    } else if (cleanName.length > 200) {
      errors.push('Nama member maksimal 200 karakter.');
    }

    if (!topParsed.valid || topParsed.value < 0 || topParsed.value > 365) {
      errors.push('TOP (hari) harus angka antara 0 s/d 365.');
    }

    if (!creditParsed.valid || creditParsed.value < 0) {
      errors.push('Plafon kredit harus angka >= 0.');
    }

    const normalizedName = normalizeMemberName(cleanName);

    if (errors.length > 0) {
      rows.push({
        rowNumber: raw.rowNumber,
        name: cleanName || `(Baris ${raw.rowNumber})`,
        normalizedName,
        phone: cleanPhone,
        address: cleanAddress,
        payment_term_days: topParsed.valid ? Math.max(0, topParsed.value) : 14,
        credit_limit: creditParsed.valid ? Math.max(0, creditParsed.value) : 0,
        status: 'invalid',
        errors,
      });
      continue;
    }

    const firstRowInFile = seenInFile.get(normalizedName);
    if (firstRowInFile !== undefined) {
      rows.push({
        rowNumber: raw.rowNumber,
        name: cleanName,
        normalizedName,
        phone: cleanPhone,
        address: cleanAddress,
        payment_term_days: topParsed.value,
        credit_limit: creditParsed.value,
        status: 'duplicate_file',
        errors: [],
        note: `Nama ganda dalam file Excel (sudah ada di baris ${firstRowInFile}).`,
      });
      continue;
    }

    seenInFile.set(normalizedName, raw.rowNumber);

    const existing = existingMap.get(normalizedName);
    if (existing) {
      rows.push({
        rowNumber: raw.rowNumber,
        name: cleanName,
        normalizedName,
        phone: cleanPhone,
        address: cleanAddress,
        payment_term_days: topParsed.value,
        credit_limit: creditParsed.value,
        status: 'duplicate_db',
        errors: [],
        existingMemberId: existing.id,
        existingMemberName: existing.name,
        note: `Sudah terdaftar sebagai "${existing.name}".`,
      });
      continue;
    }

    rows.push({
      rowNumber: raw.rowNumber,
      name: cleanName,
      normalizedName,
      phone: cleanPhone,
      address: cleanAddress,
      payment_term_days: topParsed.value,
      credit_limit: creditParsed.value,
      status: 'new',
      errors: [],
    });
  }

  return {
    rows,
    summary: {
      total: rows.length,
      validNew: rows.filter((r) => r.status === 'new').length,
      duplicateDb: rows.filter((r) => r.status === 'duplicate_db').length,
      duplicateFile: rows.filter((r) => r.status === 'duplicate_file').length,
      invalid: rows.filter((r) => r.status === 'invalid').length,
    },
  };
}
