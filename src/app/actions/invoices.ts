'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { formatSupabaseError, safeActionErrorMessage } from '@/lib/utils';
import { requireInvoiceManager, requireTenantAccess } from '@/lib/auth';
import {
  computeValidatedInvoiceTotal,
  sanitizeNonNegativeAmount,
} from '@/lib/security-rules';
import { Invoice } from '@/types/database';

export async function getInvoices(options?: {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  let query = supabase
    .from('invoices')
    .select(`
      *,
      member:members(*),
      shipments:shipments(id, receipt_number, total_bill, destination_city)
    `)
    .eq('company_id', companyId)
    .order('invoice_date', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.dateFrom) {
    query = query.gte('invoice_date', options.dateFrom);
  }

  if (options?.dateTo) {
    query = query.lte('invoice_date', options.dateTo);
  }

  if (options?.search) {
    const s = options.search;
    query = query.or(`invoice_number.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Warning fetching invoices:', formatSupabaseError(error));
    return [];
  }
  return data as Invoice[];
}

export async function getInvoiceById(id: string) {
  const auth = await requireTenantAccess();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      member:members(*),
      company:companies(*),
      shipments:shipments(
        *,
        items:shipment_items(*)
      )
    `)
    .eq('id', id)
    .eq('company_id', auth.activeCompanyId)
    .single();

  if (error) {
    console.warn('Warning fetching invoice by id:', formatSupabaseError(error));
    return null;
  }
  return data as Invoice;
}

export async function createInvoice(payload: {
  member_id: string;
  shipment_ids: string[];
  discount_amount?: number;
  notes?: string;
  due_date?: string;
}) {
  const auth = await requireInvoiceManager();
  const supabase = await createClient();
  const companyId = auth.activeCompanyId;

  const uniqueIds = Array.from(new Set(payload.shipment_ids || [])).filter(Boolean);
  if (uniqueIds.length === 0) {
    throw new Error('Pilih minimal 1 resi untuk dibuatkan invoice.');
  }

  // 1. Validate member belongs to active tenant
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, payment_term_days')
    .eq('id', payload.member_id)
    .eq('company_id', companyId)
    .single();

  if (memberErr || !member) {
    throw new Error('Member tidak ditemukan pada ekspedisi aktif.');
  }

  // 2. Fetch shipments strictly scoped to active company, not deleted, and not yet billed
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('id, total_bill, invoice_id, deleted_at')
    .in('id', uniqueIds)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (shipmentsError || !shipments || shipments.length !== uniqueIds.length) {
    throw new Error(
      'Sebagian resi tidak valid, sudah dihapus, atau bukan milik ekspedisi aktif.'
    );
  }

  if (shipments.some((s) => s.invoice_id)) {
    throw new Error('Salah satu resi yang dipilih sudah terikat pada invoice lain.');
  }

  const subtotal = shipments.reduce((sum, s) => sum + Number(s.total_bill || 0), 0);
  const { discount, total } = computeValidatedInvoiceTotal(
    subtotal,
    payload.discount_amount
  );

  // Auto-generate invoice number: INV-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invoiceNumber = `INV-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 3. Determine payment term if due_date not provided
  let dueDate = payload.due_date;
  if (!dueDate) {
    const termDays = member.payment_term_days || 14;
    const d = new Date();
    d.setDate(d.getDate() + termDays);
    dueDate = d.toISOString().slice(0, 10);
  }

  // 4. Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      company_id: companyId,
      member_id: payload.member_id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate,
      subtotal_amount: subtotal,
      discount_amount: discount,
      total_amount: total,
      paid_amount: 0,
      status: 'Unpaid',
      notes: payload.notes || null,
    })
    .select()
    .single();

  if (invoiceError || !invoice) {
    throw new Error(
      safeActionErrorMessage(
        'createInvoice',
        invoiceError,
        'Gagal membuat invoice baru. Silakan coba lagi.'
      )
    );
  }

  // 5. Link shipments to this invoice
  await supabase
    .from('shipments')
    .update({ invoice_id: invoice.id })
    .in('id', uniqueIds)
    .eq('company_id', companyId);

  revalidatePath('/invoices');
  revalidatePath('/shipments');
  return invoice;
}

export async function updateInvoicePayment(payload: {
  invoiceId: string;
  paid_amount: number;
  payment_proof_url?: string;
}) {
  const auth = await requireInvoiceManager();
  const supabase = await createClient();

  const newPaidAmount = sanitizeNonNegativeAmount(payload.paid_amount, 'Nominal bayar');

  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, paid_amount')
    .eq('id', payload.invoiceId)
    .eq('company_id', auth.activeCompanyId)
    .single();

  if (!invoice) throw new Error('Invoice tidak ditemukan');

  let status: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';

  if (newPaidAmount >= Number(invoice.total_amount)) {
    status = 'Paid';
  } else if (newPaidAmount > 0) {
    status = 'Partial';
  }

  const updateData: Record<string, unknown> = {
    paid_amount: newPaidAmount,
    status,
  };

  if (status === 'Paid') {
    updateData.paid_at = new Date().toISOString();
  }

  if (payload.payment_proof_url) {
    updateData.payment_proof_url = payload.payment_proof_url;
  }

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', payload.invoiceId)
    .eq('company_id', auth.activeCompanyId);

  if (error) {
    throw new Error(
      safeActionErrorMessage(
        'updateInvoicePayment',
        error,
        'Gagal mencatat pembayaran invoice.'
      )
    );
  }

  // If fully paid, update shipments payment status to 'Paid'
  if (status === 'Paid') {
    await supabase
      .from('shipments')
      .update({ payment_status: 'Paid' })
      .eq('invoice_id', payload.invoiceId)
      .eq('company_id', auth.activeCompanyId);
  }

  revalidatePath(`/invoices/${payload.invoiceId}`);
  revalidatePath('/invoices');
  revalidatePath('/shipments');
}
