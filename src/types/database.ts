export interface Company {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  bank_account: string | null;
  brand_color: string | null;
  brand_accent: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  payment_term_days: number;
  credit_limit: number;
  created_at: string;
}

export interface ManifestShipment {
  id: string;
  company_id: string;
  manifest_number: string;
  vendor_name: string;
  vessel_name: string | null;
  destination_city: string;
  departure_date: string;
  vendor_cost: number;
  status: 'Transit' | 'Arrived' | 'Completed';
  created_at: string;
  // Joins
  shipments_count?: number;
  total_packages?: number;
  total_weight?: number;
  total_cbm?: number;
  shipments?: Shipment[];
}

export interface Invoice {
  id: string;
  company_id: string;
  member_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled';
  paid_at: string | null;
  payment_proof_url: string | null;
  notes: string | null;
  created_at: string;
  // Joins
  company?: Company;
  member?: Member;
  shipments?: Shipment[];
}

export interface ShipmentItem {
  id: string;
  shipment_id: string;
  koli_index: number;
  package_type: string; // 'Koli' | 'Dus' | 'Peti' | 'Karung' | 'Roll'
  dim_p: number;
  dim_l: number;
  dim_t: number;
  actual_kg: number;
  volume_cbm: number; // Generated (dim_p * dim_l * dim_t) / 1000000
}

export interface Shipment {
  id: string;
  company_id: string;
  member_id: string | null;
  manifest_id: string | null;
  invoice_id: string | null;

  receipt_number: string;
  booking_date: string;
  pickup_date?: string | null;
  ref_number: string | null;

  sender_name: string;
  sender_phone: string | null;
  sender_address: string | null;
  receiver_name: string;
  receiver_phone: string | null;
  receiver_address: string | null;

  origin_city: string;
  destination_city: string;
  delivery_province: string | null;
  service_type: string; // 'Port to Door' | 'Door to Door' | 'Port to Port'
  transport_via: string; // 'Laut' | 'Darat' | 'Udara'

  goods_description: string;
  handling_instructions: string | null;

  chargeable_type: 'Weight' | 'Volume' | 'Flat';
  rate_per_unit: number;
  shipping_cost: number;
  packing_cost: number;
  insurance_cost: number;
  other_cost: number;
  total_bill: number; // Generated

  payment_type: 'Cash' | 'COD' | 'Invoice';
  payment_status: 'Unpaid' | 'Paid';
  shipment_status: 'Pending' | 'Muat Kapal' | 'Tiba Pelabuhan' | 'Diterima Cabang';

  received_date: string | null;
  receiver_person: string | null;
  pod_photo_url: string | null;
  deleted_at?: string | null;

  created_at: string;

  // Joined relations
  company?: Company;
  member?: Member;
  manifest?: ManifestShipment;
  invoice?: { id: string; invoice_number: string } | null;
  items?: ShipmentItem[];
}

export type TenantRole = 'finance' | 'marketing';
export type UserRole = 'master_admin' | TenantRole;

export interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_master_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CompanyMembership {
  id: string;
  user_id: string;
  company_id: string;
  role: TenantRole;
  created_at: string;
  company?: Company;
}

export interface Region {
  id: string;
  province: string;
  city: string;
  is_active: boolean;
  created_at: string;
}
