import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { requireInvoiceManager, requireTenantAccess } from '@/lib/auth';
import { safeActionErrorMessage } from '@/lib/utils';
import {
  ALLOWED_PROOF_MIME_TYPES,
  extensionForProofMime,
  isSafeTenantProofPath,
  MAX_PROOF_FILE_BYTES,
  validateProofUploadMetadata,
} from '@/lib/report-filters';

const PROOF_BUCKET = 'payment-proofs';

async function getTenantInvoiceOrFail(invoiceId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, company_id')
    .eq('id', invoiceId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error || !data) return null;
  return data as { id: string; company_id: string };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireInvoiceManager();
    const { id: invoiceId } = await context.params;

    if (!hasAdminKey()) {
      return NextResponse.json(
        { error: 'Konfigurasi penyimpanan server belum siap. Hubungi administrator.' },
        { status: 503 }
      );
    }

    const invoice = await getTenantInvoiceOrFail(invoiceId, auth.activeCompanyId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice tidak ditemukan pada ekspedisi aktif.' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const entry = formData.get('file');
    if (!entry || typeof entry === 'string' || typeof entry.arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'Pilih foto bukti bayar terlebih dahulu.' },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await entry.arrayBuffer());
    const validation = validateProofUploadMetadata(entry.size, entry.type, bytes);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = extensionForProofMime(validation.mime);
    const storagePath = `${auth.activeCompanyId}/${invoiceId}/proof-${Date.now()}.${ext}`;
    const admin = createAdminClient();

    let { error: uploadError } = await admin.storage
      .from(PROOF_BUCKET)
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      });

    // Auto-provision private bucket on first upload if migration was not manually applied yet
    if (uploadError && /bucket.*not found/i.test(uploadError.message || '')) {
      await admin.storage.createBucket(PROOF_BUCKET, {
        public: false,
        fileSizeLimit: MAX_PROOF_FILE_BYTES,
        allowedMimeTypes: [...ALLOWED_PROOF_MIME_TYPES],
      });
      const retry = await admin.storage
        .from(PROOF_BUCKET)
        .upload(storagePath, bytes, {
          contentType: validation.mime,
          upsert: false,
        });
      uploadError = retry.error;
    }

    if (uploadError) {
      return NextResponse.json(
        {
          error: safeActionErrorMessage(
            'uploadInvoiceProof.storage',
            uploadError,
            'Gagal mengunggah foto bukti bayar.'
          ),
        },
        { status: 500 }
      );
    }

    const proofUrl = `/api/invoices/${invoiceId}/proof?file=${encodeURIComponent(
      storagePath
    )}`;

    return NextResponse.json({
      ok: true,
      proofUrl,
      mime: validation.mime,
    });
  } catch (err) {
    const message = safeActionErrorMessage(
      'POST /api/invoices/[id]/proof',
      err,
      'Akses ditolak atau gagal mengunggah bukti bayar.'
    );
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAccess();
    const { id: invoiceId } = await context.params;
    const fileParam = request.nextUrl.searchParams.get('file') || '';

    if (!isSafeTenantProofPath(fileParam, auth.activeCompanyId, invoiceId)) {
      return NextResponse.json({ error: 'Akses file ditolak.' }, { status: 403 });
    }

    const invoice = await getTenantInvoiceOrFail(invoiceId, auth.activeCompanyId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice tidak ditemukan.' }, { status: 404 });
    }

    if (!hasAdminKey()) {
      return NextResponse.json(
        { error: 'Layanan penyimpanan belum dikonfigurasi.' },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(PROOF_BUCKET)
      .download(fileParam);

    if (error || !data) {
      return NextResponse.json(
        { error: 'File bukti pembayaran tidak ditemukan.' },
        { status: 404 }
      );
    }

    const buffer = await data.arrayBuffer();
    const mime = detectSafeContentType(fileParam, data.type);
    const filename = fileParam.split('/').pop() || 'bukti-bayar';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
  }
}

function detectSafeContentType(path: string, blobType: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (
    ALLOWED_PROOF_MIME_TYPES.includes(blobType as (typeof ALLOWED_PROOF_MIME_TYPES)[number])
  ) {
    return blobType;
  }
  return 'application/octet-stream';
}
