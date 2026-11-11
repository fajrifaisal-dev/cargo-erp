import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { sanitizeExcelCell } from '@/lib/report-filters';

export interface ExcelExportColumn {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  align?: 'left' | 'center' | 'right';
}

export interface BuildStyledExcelOptions {
  fileName: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelExportColumn[];
  rows: Array<Record<string, unknown>>;
  summaryRow?: Record<string, unknown>;
}

/**
 * Creates a styled .xlsx download response with formula-injection protection,
 * tenant title banner, numeric formatting, and optional summary total row.
 */
export async function buildStyledExcelResponse({
  fileName,
  sheetName,
  title,
  subtitle,
  columns,
  rows,
  summaryRow,
}: BuildStyledExcelOptions): Promise<NextResponse> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cargo ERP';
  workbook.created = new Date();

  const headerRowIndex = subtitle ? 4 : 3;
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: headerRowIndex }],
  });

  const colCount = Math.max(1, columns.length);

  // Row 1: Company / Report Title
  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = sanitizeExcelCell(title);
  titleRow.font = { bold: true, size: 13, color: { argb: 'FF0F172A' } };
  titleRow.height = 22;
  if (colCount > 1) {
    sheet.mergeCells(1, 1, 1, colCount);
  }

  // Row 2: Subtitle / Filter summary
  if (subtitle) {
    const subRow = sheet.getRow(2);
    subRow.getCell(1).value = sanitizeExcelCell(subtitle);
    subRow.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
    subRow.height = 18;
    if (colCount > 1) {
      sheet.mergeCells(2, 1, 2, colCount);
    }
  }

  // Set column widths cleanly (without writing default header on row 1)
  columns.forEach((col, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = col.width;
  });

  // Header row
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: col.align || 'left',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'thin', color: { argb: 'FF0F172A' } },
    };
  });
  headerRow.height = 24;

  // Data rows
  rows.forEach((item, rowOffset) => {
    const row = sheet.getRow(headerRowIndex + 1 + rowOffset);
    columns.forEach((col, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = sanitizeExcelCell(item[col.key]);
      if (col.numFmt) {
        cell.numFmt = col.numFmt;
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || 'left',
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Summary row
  if (summaryRow) {
    const sumRowIdx = headerRowIndex + 1 + rows.length;
    const sumRow = sheet.getRow(sumRowIdx);
    columns.forEach((col, colIndex) => {
      const cell = sumRow.getCell(colIndex + 1);
      cell.value = sanitizeExcelCell(summaryRow[col.key] ?? '');
      if (col.numFmt && summaryRow[col.key] !== undefined) {
        cell.numFmt = col.numFmt;
      }
      cell.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || 'left',
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF334155' } },
      };
    });
    sumRow.height = 22;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
