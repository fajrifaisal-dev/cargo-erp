import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireTenantAccess } from '@/lib/auth';

export async function GET() {
  try {
    await requireTenantAccess();
  } catch {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cargo ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Template Import Member', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Nama Perusahaan *', key: 'name', width: 34 },
    { header: 'No. HP / WhatsApp', key: 'phone', width: 22 },
    { header: 'Alamat', key: 'address', width: 42 },
    { header: 'TOP (Hari)', key: 'payment_term_days', width: 14 },
    { header: 'Plafon Kredit', key: 'credit_limit', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 24;

  sheet.addRow({
    name: 'PT. Contoh Pelanggan Nusantara',
    phone: '081234567890',
    address: 'Jl. Perak Barat No. 10, Surabaya',
    payment_term_days: 14,
    credit_limit: 10000000,
  });
  sheet.addRow({
    name: 'CV. Maju Bersama',
    phone: '082233445566',
    address: 'Jl. Sultan Hasanuddin No. 5, Makassar',
    payment_term_days: 30,
    credit_limit: 25000000,
  });

  // Format numeric columns cleanly while keeping phone as text
  sheet.getColumn('phone').numFmt = '@';
  sheet.getColumn('payment_term_days').numFmt = '#,##0';
  sheet.getColumn('credit_limit').numFmt = '#,##0';

  const guide = workbook.addWorksheet('Panduan');
  guide.columns = [
    { header: 'Kolom / Aturan', key: 'rule', width: 28 },
    { header: 'Keterangan', key: 'desc', width: 72 },
  ];
  guide.getRow(1).font = { bold: true };
  guide.addRows([
    {
      rule: 'Nama Perusahaan *',
      desc: 'Wajib diisi. Sistem mengecek data ganda berdasarkan nama perusahaan (tidak sensitif huruf besar/kecil & spasi ganda).',
    },
    {
      rule: 'No. HP / WhatsApp',
      desc: 'Opsional. Disarankan format teks agar angka 0 di depan tidak hilang (contoh: 081234567890).',
    },
    {
      rule: 'Alamat',
      desc: 'Opsional. Alamat lengkap kantor atau gudang pengirim.',
    },
    {
      rule: 'TOP (Hari)',
      desc: 'Opsional (default 14 hari). Isi angka 0 - 365.',
    },
    {
      rule: 'Plafon Kredit',
      desc: 'Opsional (default 0). Isi angka tanpa simbol atau format rupiah.',
    },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="template-import-member.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
