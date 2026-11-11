import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCBM,
  calculateVolumetricKg,
  formatDateDDMMYYYY,
  getTenantPrefix,
  safeActionErrorMessage,
} from '../utils';
import {
  canRoleManageInvoices,
  canRoleManageSystem,
  computeValidatedInvoiceTotal,
  resolveAuthorizedCompany,
  sanitizeNonNegativeAmount,
  sanitizeNonNegativeFloat,
} from '../security-rules';
import {
  buildMemberImportPreview,
  mapHeaderToField,
  normalizeMemberName,
  parseIntegerCell,
} from '../member-import';
import {
  buildReportQueryString,
  detectProofMimeFromBytes,
  isSafeTenantProofPath,
  MAX_PROOF_FILE_BYTES,
  sanitizeExcelCell,
  validateProofUploadMetadata,
} from '../report-filters';

describe('Cargo Calculations & Tenant Formatting', () => {
  it('calculates volumetric weight (P x L x T / 4000)', () => {
    assert.equal(calculateVolumetricKg(40, 30, 30), 9);
    assert.equal(calculateVolumetricKg(0, 30, 30), 0);
  });

  it('calculates CBM volume (P x L x T / 1,000,000)', () => {
    assert.equal(calculateCBM(100, 100, 100), 1);
    assert.equal(calculateCBM(50, 40, 20), 0.04);
  });

  it('builds tenant prefix from slug or company name and formats STT dates', () => {
    assert.equal(
      getTenantPrefix({ slug: 'gema-trans', name: 'PT. Gema Tunggal' }),
      'GT'
    );
    assert.equal(
      getTenantPrefix({ slug: '', name: 'PT. Cahaya Mandiri Jaya' }),
      'CMJ'
    );
    assert.equal(formatDateDDMMYYYY('2026-11-11'), '11-11-2026');
  });
});

describe('Error Sanitization Security', () => {
  it('never leaks raw SQL, table names, or env details to clients', () => {
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      const msg = safeActionErrorMessage(
        'test.context',
        {
          code: '42P01',
          message: 'relation "public.profiles" does not exist in SUPABASE_SECRET_KEY',
          details: 'ALTER TABLE shipments ADD COLUMN deleted_at',
        },
        'Terjadi kendala sistem. Silakan hubungi administrator.'
      );

      assert.equal(msg, 'Terjadi kendala sistem. Silakan hubungi administrator.');
      assert.ok(!msg.includes('profiles'));
      assert.ok(!msg.includes('SUPABASE_SECRET_KEY'));
      assert.ok(!msg.includes('ALTER TABLE'));
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('maps known safe database codes to clean Indonesian messages', () => {
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      assert.match(
        safeActionErrorMessage('dup', { code: '23505', message: 'unique' }, 'fallback'),
        /duplikat/i
      );
      assert.match(
        safeActionErrorMessage('fk', { code: '23503', message: 'fk' }, 'fallback'),
        /digunakan/i
      );
      assert.match(
        safeActionErrorMessage('rls', { code: '42501', message: 'rls' }, 'fallback'),
        /ditolak/i
      );
    } finally {
      console.error = originalConsoleError;
    }
  });
});

describe('Server Financial Validation & RBAC Guards', () => {
  it('rejects negative or non-finite monetary and dimension inputs', () => {
    assert.equal(sanitizeNonNegativeAmount(10500.6, 'Ongkir'), 10501);
    assert.equal(sanitizeNonNegativeFloat(12.5, 'Berat'), 12.5);
    assert.throws(() => sanitizeNonNegativeAmount(-1, 'Ongkir'), /tidak valid/i);
    assert.throws(() => sanitizeNonNegativeAmount(Number.NaN, 'Diskon'), /tidak valid/i);
    assert.throws(() => sanitizeNonNegativeFloat(-0.5, 'Berat'), /tidak valid/i);
  });

  it('prevents invoice discounts greater than subtotal', () => {
    const ok = computeValidatedInvoiceTotal(100000, 25000);
    assert.deepEqual(ok, { discount: 25000, total: 75000 });
    assert.throws(
      () => computeValidatedInvoiceTotal(100000, 150000),
      /melebihi subtotal/i
    );
  });

  it('enforces invoice & system permissions per role (marketing read-only on invoices)', () => {
    assert.equal(canRoleManageInvoices('master_admin'), true);
    assert.equal(canRoleManageInvoices('finance'), true);
    assert.equal(canRoleManageInvoices('marketing'), false);
    assert.equal(canRoleManageInvoices(null), false);

    assert.equal(canRoleManageSystem(true), true);
    assert.equal(canRoleManageSystem(false), false);
  });

  it('blocks tenant cookie spoofing via allowlist resolution', () => {
    const allowed = [{ id: 'tenant-a' }, { id: 'tenant-b' }];
    assert.equal(resolveAuthorizedCompany(allowed, 'tenant-b')?.id, 'tenant-b');
    assert.equal(resolveAuthorizedCompany(allowed, 'tenant-hack')?.id, 'tenant-a');
    assert.equal(resolveAuthorizedCompany([], 'tenant-a'), null);
  });
});

describe('Member Excel Import Deduplication & Parsing', () => {
  it('normalizes member names case-insensitively with collapsed whitespace', () => {
    assert.equal(normalizeMemberName('  PT.  Maju   Jaya '), 'pt. maju jaya');
    assert.equal(normalizeMemberName('pt. maju jaya'), 'pt. maju jaya');
  });

  it('maps Indonesian and English Excel headers accurately', () => {
    assert.equal(mapHeaderToField('Nama Perusahaan *'), 'name');
    assert.equal(mapHeaderToField('No. HP / WhatsApp'), 'phone');
    assert.equal(mapHeaderToField('Alamat'), 'address');
    assert.equal(mapHeaderToField('TOP (Hari)'), 'payment_term_days');
    assert.equal(mapHeaderToField('Plafon Kredit'), 'credit_limit');
    assert.equal(mapHeaderToField('Kolom Tidak Dikenal'), null);
  });

  it('parses integer TOP and formatted Rupiah credit limits safely', () => {
    assert.deepEqual(parseIntegerCell('14 hari', 14), { value: 14, valid: true });
    assert.deepEqual(parseIntegerCell('Rp 15.000.000', 0), { value: 15000000, valid: true });
    assert.deepEqual(parseIntegerCell('bukan-angka', 0), { value: 0, valid: false });
  });

  it('detects DB duplicates, intra-file duplicates, and invalid rows by normalized name', () => {
    const existing = [
      { id: 'm-1', name: 'PT. Sinar Harapan' },
    ];
    const preview = buildMemberImportPreview(
      [
        {
          rowNumber: 2,
          name: '  pt. sinar   harapan ',
          phone: '08123456789',
          address: 'Surabaya',
          payment_term_days: 30,
          credit_limit: '25.000.000',
        },
        {
          rowNumber: 3,
          name: 'CV. Bintang Timur',
          phone: '08111222333',
          address: 'Makassar',
          payment_term_days: 14,
          credit_limit: 0,
        },
        {
          rowNumber: 4,
          name: 'cv. bintang timur',
          phone: '089999999',
          address: 'Kendari',
          payment_term_days: 7,
          credit_limit: 0,
        },
        {
          rowNumber: 5,
          name: '',
          phone: '08123',
          address: 'Jakarta',
          payment_term_days: 14,
          credit_limit: 0,
        },
      ],
      existing
    );

    assert.equal(preview.summary.total, 4);
    assert.equal(preview.summary.duplicateDb, 1);
    assert.equal(preview.summary.validNew, 1);
    assert.equal(preview.summary.duplicateFile, 1);
    assert.equal(preview.summary.invalid, 1);
    assert.equal(preview.rows[0].status, 'duplicate_db');
    assert.equal(preview.rows[0].existingMemberId, 'm-1');
    assert.equal(preview.rows[1].status, 'new');
    assert.equal(preview.rows[2].status, 'duplicate_file');
    assert.equal(preview.rows[3].status, 'invalid');
  });
});

describe('Excel Export Sanitization & Payment Proof Upload Security', () => {
  it('neutralizes spreadsheet formula injection while keeping numeric cells numeric', () => {
    assert.equal(sanitizeExcelCell('=CMD|"/C calc"!A0'), '\'=CMD|"/C calc"!A0');
    assert.equal(sanitizeExcelCell('+1+1'), '\'+1+1');
    assert.equal(sanitizeExcelCell('-100'), '\'-100');
    assert.equal(sanitizeExcelCell('@SUM(A1:A2)'), '\'@SUM(A1:A2)');
    assert.equal(sanitizeExcelCell(250000), 250000);
    assert.equal(sanitizeExcelCell('PT. Maju Jaya'), 'PT. Maju Jaya');
  });

  it('builds deterministic export query strings omitting default "all" values', () => {
    assert.equal(
      buildReportQueryString({
        search: 'INV-001',
        status: 'all',
        dateFrom: '2026-11-01',
        dateTo: '',
      }),
      '?search=INV-001&dateFrom=2026-11-01'
    );
    assert.equal(buildReportQueryString({ status: 'all' }), '');
  });

  it('validates real magic bytes for image/PDF proofs and blocks spoofing or >5MB files', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const htmlSpoofBytes = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]); // <html>

    assert.equal(detectProofMimeFromBytes(pngBytes), 'image/png');
    assert.equal(detectProofMimeFromBytes(jpegBytes), 'image/jpeg');
    assert.equal(detectProofMimeFromBytes(htmlSpoofBytes), null);

    const okRes = validateProofUploadMetadata(1024, 'image/png', pngBytes);
    assert.equal(okRes.ok, true);

    const spoofRes = validateProofUploadMetadata(1024, 'image/png', htmlSpoofBytes);
    assert.equal(spoofRes.ok, false);

    const sizeRes = validateProofUploadMetadata(MAX_PROOF_FILE_BYTES + 1, 'image/png', pngBytes);
    assert.equal(sizeRes.ok, false);
  });

  it('enforces tenant and invoice isolation on payment proof storage paths', () => {
    assert.equal(
      isSafeTenantProofPath('comp-1/inv-1/proof-123.png', 'comp-1', 'inv-1'),
      true
    );
    assert.equal(
      isSafeTenantProofPath('comp-2/inv-1/proof-123.png', 'comp-1', 'inv-1'),
      false
    );
    assert.equal(
      isSafeTenantProofPath('comp-1/inv-1/../../secret.png', 'comp-1', 'inv-1'),
      false
    );
  });
});
