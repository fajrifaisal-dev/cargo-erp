export const ALLOWED_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedProofMime = (typeof ALLOWED_PROOF_MIME_TYPES)[number];

export const MAX_PROOF_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Neutralizes spreadsheet formula injection when exporting untrusted user text
 * to Excel/CSV while leaving finite numeric cells untouched.
 */
export function sanitizeExcelCell(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const str = String(value).trim();
  if (!str) return '';
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Builds a deterministic query string preserving non-empty, non-"all" filter params.
 */
export function buildReportQueryString(
  params: Record<string, string | undefined | null>
): string {
  const sp = new URLSearchParams();
  for (const [key, rawVal] of Object.entries(params)) {
    if (!rawVal) continue;
    const val = rawVal.trim();
    if (!val || val === 'all') continue;
    sp.set(key, val);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Detects actual file signature (magic bytes) for JPEG, PNG, WEBP, or PDF.
 */
export function detectProofMimeFromBytes(
  bytes: Uint8Array
): AllowedProofMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 // F
  ) {
    return 'application/pdf';
  }
  return null;
}

export function extensionForProofMime(mime: AllowedProofMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
  }
}

export function validateProofUploadMetadata(
  fileSize: number,
  declaredMime: string,
  magicBytes?: Uint8Array
): { ok: true; mime: AllowedProofMime } | { ok: false; error: string } {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { ok: false, error: 'File bukti pembayaran kosong.' };
  }
  if (fileSize > MAX_PROOF_FILE_BYTES) {
    return { ok: false, error: 'Ukuran file maksimal 5 MB.' };
  }

  if (magicBytes) {
    const detected = detectProofMimeFromBytes(magicBytes);
    if (!detected) {
      return {
        ok: false,
        error: 'Format file tidak didukung. Gunakan foto JPG, PNG, WEBP, atau PDF.',
      };
    }
    return { ok: true, mime: detected };
  }

  if (
    ALLOWED_PROOF_MIME_TYPES.includes(declaredMime as AllowedProofMime)
  ) {
    return { ok: true, mime: declaredMime as AllowedProofMime };
  }

  return {
    ok: false,
    error: 'Format file harus JPG, PNG, WEBP, atau PDF.',
  };
}

/**
 * Ensures storage object path strictly stays within `<companyId>/<invoiceId>/<filename>`.
 */
export function isSafeTenantProofPath(
  path: string,
  companyId: string,
  invoiceId: string
): boolean {
  if (!path || path.includes('..') || path.includes('\\')) return false;
  const expectedPrefix = `${companyId}/${invoiceId}/`;
  if (!path.startsWith(expectedPrefix)) return false;
  const filename = path.slice(expectedPrefix.length);
  return /^[a-zA-Z0-9._-]+$/.test(filename);
}

export function isPdfProofUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return /\.pdf($|[?&#])/i.test(decodeURIComponent(url));
  } catch {
    return /\.pdf($|[?&#])/i.test(url);
  }
}
