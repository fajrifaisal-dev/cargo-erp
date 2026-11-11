import { Invoice, ManifestShipment, Shipment } from '@/types/database';
import { formatDateIndo } from '@/lib/utils';

export function buildFilterSummaryText(filters: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  trash?: boolean;
}): string {
  const parts: string[] = [];
  if (filters.trash) parts.push('Mode: Tong Sampah');
  if (filters.dateFrom || filters.dateTo) {
    parts.push(
      `Periode: ${filters.dateFrom ? formatDateIndo(filters.dateFrom) : 'Awal'} s/d ${
        filters.dateTo ? formatDateIndo(filters.dateTo) : 'Sekarang'
      }`
    );
  } else {
    parts.push('Periode: Semua Tanggal');
  }
  if (filters.status && filters.status !== 'all') {
    parts.push(`Status: ${filters.status}`);
  }
  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    parts.push(`Bayar: ${filters.paymentStatus}`);
  }
  if (filters.search) {
    parts.push(`Cari: "${filters.search}"`);
  }
  return parts.join(' • ');
}

export interface ShipmentReportMetrics {
  koli: number;
  actualKg: number;
  cbm: number;
  totalBill: number;
}

export function computeShipmentMetrics(s: Shipment): ShipmentReportMetrics {
  const items = s.items || [];
  let actualKg = 0;
  let cbm = 0;
  for (const it of items) {
    actualKg += Number(it.actual_kg || 0);
    cbm += Number(it.volume_cbm || 0);
  }
  return {
    koli: items.length,
    actualKg: Math.round(actualKg * 100) / 100,
    cbm: Math.round(cbm * 1000) / 1000,
    totalBill: Number(s.total_bill || 0),
  };
}

export function computeShipmentsTotals(shipments: Shipment[]): ShipmentReportMetrics {
  return shipments.reduce<ShipmentReportMetrics>(
    (acc, s) => {
      const m = computeShipmentMetrics(s);
      return {
        koli: acc.koli + m.koli,
        actualKg: Math.round((acc.actualKg + m.actualKg) * 100) / 100,
        cbm: Math.round((acc.cbm + m.cbm) * 1000) / 1000,
        totalBill: acc.totalBill + m.totalBill,
      };
    },
    { koli: 0, actualKg: 0, cbm: 0, totalBill: 0 }
  );
}

export interface ManifestsTotals {
  resi: number;
  koli: number;
  weightKg: number;
  cbm: number;
  vendorCost: number;
}

export function computeManifestsTotals(
  manifests: ManifestShipment[]
): ManifestsTotals {
  return manifests.reduce<ManifestsTotals>(
    (acc, m) => ({
      resi: acc.resi + Number(m.shipments_count || 0),
      koli: acc.koli + Number(m.total_packages || 0),
      weightKg: Math.round((acc.weightKg + Number(m.total_weight || 0)) * 100) / 100,
      cbm: Math.round((acc.cbm + Number(m.total_cbm || 0)) * 1000) / 1000,
      vendorCost: acc.vendorCost + Number(m.vendor_cost || 0),
    }),
    { resi: 0, koli: 0, weightKg: 0, cbm: 0, vendorCost: 0 }
  );
}

export interface InvoicesTotals {
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export function computeInvoicesTotals(invoices: Invoice[]): InvoicesTotals {
  return invoices.reduce<InvoicesTotals>(
    (acc, inv) => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      return {
        subtotal: acc.subtotal + Number(inv.subtotal_amount || 0),
        discount: acc.discount + Number(inv.discount_amount || 0),
        totalAmount: acc.totalAmount + total,
        paidAmount: acc.paidAmount + paid,
        remainingAmount: acc.remainingAmount + Math.max(0, total - paid),
      };
    },
    {
      subtotal: 0,
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
    }
  );
}
