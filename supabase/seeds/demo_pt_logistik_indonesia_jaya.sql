-- Demo Seeder: 10 Members + 10 STT Shipments (+ shipment_items)
-- Target Tenant: pt-logistik-indonesia-jaya (b4ea31a2-954a-4c54-90aa-5727afe183c4)
-- Idempotent: Aman dijalankan berulang kali di Supabase SQL Editor.

DO $$
DECLARE
  v_company_id CONSTANT uuid := 'b4ea31a2-954a-4c54-90aa-5727afe183c4';
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.companies WHERE id = v_company_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Company ID % tidak ditemukan di tabel public.companies', v_company_id;
  END IF;
END $$;

-- 1. Seed 10 Demo Members
INSERT INTO public.members (id, company_id, name, phone, address, payment_term_days, credit_limit)
SELECT v.id, 'b4ea31a2-954a-4c54-90aa-5727afe183c4'::uuid, v.name, v.phone, v.address, v.payment_term_days, v.credit_limit
FROM (
  VALUES
    ('b4ea1001-0001-4000-8000-000000000001'::uuid, 'PT. Nusantara Agro Mandiri', '081230110001', 'Jl. Margomulyo Indah Blok A-12, Surabaya', 14, 25000000),
    ('b4ea1001-0001-4000-8000-000000000002'::uuid, 'CV. Karya Teknik Surabaya', '081230110002', 'Jl. Dupak Rukun No. 45, Surabaya', 30, 50000000),
    ('b4ea1001-0001-4000-8000-000000000003'::uuid, 'PT. Sumber Makmur Abadi', '081230110003', 'Kawasan Pergudangan Tambak Langon C-8, Surabaya', 14, 30000000),
    ('b4ea1001-0001-4000-8000-000000000004'::uuid, 'UD. Sinar Timur Elektronik', '081230110004', 'Jl. Kembang Jepun No. 88, Surabaya', 7, 15000000),
    ('b4ea1001-0001-4000-8000-000000000005'::uuid, 'PT. Mitra Konstruksi Jaya', '081230110005', 'Jl. Rungkut Industri III No. 19, Surabaya', 30, 75000000),
    ('b4ea1001-0001-4000-8000-000000000006'::uuid, 'CV. Berkah Pangan Sejahtera', '081230110006', 'Jl. Kalianak Barat No. 54, Surabaya', 14, 20000000),
    ('b4ea1001-0001-4000-8000-000000000007'::uuid, 'PT. Indomarine Supply', '081230110007', 'Jl. Perak Timur No. 112, Surabaya', 30, 60000000),
    ('b4ea1001-0001-4000-8000-000000000008'::uuid, 'PT. Anugerah Farmasi Indonesia', '081230110008', 'Jl. Ahmad Yani No. 210, Sidoarjo', 14, 40000000),
    ('b4ea1001-0001-4000-8000-000000000009'::uuid, 'CV. Harapan Baru Tekstil', '081230110009', 'Jl. Kapasan No. 73, Surabaya', 14, 18000000),
    ('b4ea1001-0001-4000-8000-000000000010'::uuid, 'PT. Samudera Logistik Utama', '081230110010', 'Jl. Tanjung Batu No. 15, Surabaya', 30, 100000000)
) AS v(id, name, phone, address, payment_term_days, credit_limit)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.members m
  WHERE m.company_id = 'b4ea31a2-954a-4c54-90aa-5727afe183c4'::uuid
    AND (m.id = v.id OR lower(trim(m.name)) = lower(trim(v.name)))
);

-- 2. Seed 10 Demo STT Shipments (note: total_bill is GENERATED in DB)
INSERT INTO public.shipments (
  id,
  company_id,
  member_id,
  receipt_number,
  booking_date,
  pickup_date,
  ref_number,
  sender_name,
  sender_phone,
  sender_address,
  receiver_name,
  receiver_phone,
  receiver_address,
  origin_city,
  destination_city,
  delivery_province,
  service_type,
  transport_via,
  goods_description,
  handling_instructions,
  chargeable_type,
  rate_per_unit,
  shipping_cost,
  packing_cost,
  insurance_cost,
  other_cost,
  payment_type,
  payment_status,
  shipment_status,
  received_date,
  receiver_person
)
SELECT
  s.id,
  'b4ea31a2-954a-4c54-90aa-5727afe183c4'::uuid,
  (SELECT id FROM public.members m WHERE m.company_id = 'b4ea31a2-954a-4c54-90aa-5727afe183c4'::uuid AND lower(trim(m.name)) = lower(trim(s.member_name)) LIMIT 1),
  s.receipt_number,
  s.booking_date,
  s.pickup_date,
  s.ref_number,
  s.sender_name,
  s.sender_phone,
  s.sender_address,
  s.receiver_name,
  s.receiver_phone,
  s.receiver_address,
  s.origin_city,
  s.destination_city,
  s.delivery_province,
  s.service_type,
  s.transport_via,
  s.goods_description,
  s.handling_instructions,
  s.chargeable_type,
  s.rate_per_unit,
  s.shipping_cost,
  s.packing_cost,
  s.insurance_cost,
  s.other_cost,
  s.payment_type,
  s.payment_status,
  s.shipment_status,
  s.received_date,
  s.receiver_person
FROM (
  VALUES
    ('b4ea2001-0001-4000-8000-000000000001'::uuid, 'PT. Nusantara Agro Mandiri', 'PLI-0001-11112026', '2026-11-02'::date, '2026-11-02'::date, 'DO-AGRO-01', 'PT. Nusantara Agro Mandiri', '081230110001', 'Jl. Margomulyo Indah Blok A-12, Surabaya', 'Toko Tani Makmur Makassar', '081344001001', 'Jl. Nusantara No. 22, Makassar', 'Surabaya', 'Makassar', 'Sulawesi Selatan', 'Door to Door', 'Laut', 'Pupuk Organik & Benih Kemasan', 'Jangan ditumpuk basah', 'Weight', 4500, 1125000, 50000, 0, 0, 'Invoice', 'Unpaid', 'Diterima Cabang', '2026-11-08'::date, 'Bpk. Hendra (Gudang)'),
    ('b4ea2001-0001-4000-8000-000000000002'::uuid, 'CV. Karya Teknik Surabaya', 'PLI-0002-11112026', '2026-11-03'::date, '2026-11-03'::date, 'PO-KTS-102', 'CV. Karya Teknik Surabaya', '081230110002', 'Jl. Dupak Rukun No. 45, Surabaya', 'PT. Borneo Tambang Perkasa', '081344001002', 'Jl. Jend. Sudirman Km 4, Balikpapan', 'Surabaya', 'Balikpapan', 'Kalimantan Timur', 'Port to Door', 'Laut', 'Sparepart Pompa Industri & Valve', 'Peti kayu wajib forklift', 'Weight', 6000, 1920000, 150000, 50000, 0, 'Invoice', 'Unpaid', 'Tiba Pelabuhan', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000003'::uuid, 'PT. Sumber Makmur Abadi', 'PLI-0003-11112026', '2026-11-04'::date, '2026-11-04'::date, 'SJ-SMA-088', 'PT. Sumber Makmur Abadi', '081230110003', 'Tambak Langon C-8, Surabaya', 'CV. Jaya Abadi Samarinda', '081344001003', 'Jl. Antasari No. 17, Samarinda', 'Surabaya', 'Samarinda', 'Kalimantan Timur', 'Door to Door', 'Laut', 'Bahan Bangunan & Cat Kaleng', 'Posisi berdiri (Up)', 'Volume', 650000, 1300000, 0, 0, 25000, 'Invoice', 'Unpaid', 'Muat Kapal', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000004'::uuid, 'UD. Sinar Timur Elektronik', 'PLI-0004-11112026', '2026-11-05'::date, '2026-11-05'::date, 'INV-STE-404', 'UD. Sinar Timur Elektronik', '081230110004', 'Jl. Kembang Jepun No. 88, Surabaya', 'Toko Cahaya Elektronik Kendari', '081344001004', 'Jl. MT Haryono No. 9, Kendari', 'Surabaya', 'Kendari', 'Sulawesi Tenggara', 'Door to Door', 'Laut', 'AC Split & Stabilizer Tegangan', 'Fragile / Jangan dibanting', 'Weight', 5500, 990000, 100000, 75000, 0, 'Cash', 'Paid', 'Diterima Cabang', '2026-11-10'::date, 'Ibu Rina'),
    ('b4ea2001-0001-4000-8000-000000000005'::uuid, 'PT. Mitra Konstruksi Jaya', 'PLI-0005-11112026', '2026-11-06'::date, '2026-11-06'::date, 'MKJ-901', 'PT. Mitra Konstruksi Jaya', '081230110005', 'Jl. Rungkut Industri III No. 19, Surabaya', 'Proyek Pelabuhan Bitung', '081344001005', 'Komplek Pelabuhan Samudera, Bitung', 'Surabaya', 'Bitung', 'Sulawesi Utara', 'Port to Port', 'Laut', 'Besi Angkur & Kabel Tray Baja', NULL::text, 'Weight', 5000, 2400000, 0, 0, 50000, 'Invoice', 'Unpaid', 'Muat Kapal', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000006'::uuid, 'CV. Berkah Pangan Sejahtera', 'PLI-0006-11112026', '2026-11-07'::date, '2026-11-07'::date, 'BPS-221', 'CV. Berkah Pangan Sejahtera', '081230110006', 'Jl. Kalianak Barat No. 54, Surabaya', 'Distributor Sembako Banjarmasin', '081344001006', 'Jl. A. Yani Km 7, Banjarmasin', 'Surabaya', 'Banjarmasin', 'Kalimantan Selatan', 'Door to Door', 'Laut', 'Minyak Goreng & Tepung Kemasan', 'Simpan tempat kering', 'Weight', 3800, 1140000, 0, 0, 0, 'COD', 'Unpaid', 'Tiba Pelabuhan', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000007'::uuid, 'PT. Indomarine Supply', 'PLI-0007-11112026', '2026-11-08'::date, '2026-11-08'::date, 'IMS-771', 'PT. Indomarine Supply', '081230110007', 'Jl. Perak Timur No. 112, Surabaya', 'Galangan Kapal Ambon', '081344001007', 'Jl. Yos Sudarso No. 31, Ambon', 'Surabaya', 'Ambon', 'Maluku', 'Port to Door', 'Laut', 'Tali Tambat & Perlengkapan Safety Kapal', NULL::text, 'Volume', 750000, 1875000, 75000, 0, 0, 'Invoice', 'Unpaid', 'Pending', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000008'::uuid, 'PT. Anugerah Farmasi Indonesia', 'PLI-0008-11112026', '2026-11-09'::date, '2026-11-09'::date, 'AFI-310', 'PT. Anugerah Farmasi Indonesia', '081230110008', 'Jl. Ahmad Yani No. 210, Sidoarjo', 'Klinik Medika Utama Palu', '081344001008', 'Jl. Sam Ratulangi No. 40, Palu', 'Surabaya', 'Palu', 'Sulawesi Tengah', 'Door to Door', 'Udara', 'Alat Kesehatan & Cairan Infus', 'Prioritas / Hindari panas berlebih', 'Weight', 14000, 1260000, 80000, 100000, 0, 'Cash', 'Paid', 'Muat Kapal', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000009'::uuid, 'CV. Harapan Baru Tekstil', 'PLI-0009-11112026', '2026-11-10'::date, '2026-11-10'::date, 'HBT-519', 'CV. Harapan Baru Tekstil', '081230110009', 'Jl. Kapasan No. 73, Surabaya', 'Grosir Busana Manado', '081344001009', 'Jl. Piere Tendean No. 11, Manado', 'Surabaya', 'Manado', 'Sulawesi Utara', 'Door to Door', 'Laut', 'Kain Roll & Konveksi Siap Jual', 'Bungkus plastik double', 'Weight', 5200, 832000, 40000, 0, 0, 'Invoice', 'Unpaid', 'Pending', NULL::date, NULL::text),
    ('b4ea2001-0001-4000-8000-000000000010'::uuid, 'PT. Samudera Logistik Utama', 'PLI-0010-11112026', '2026-11-11'::date, '2026-11-11'::date, 'SLU-880', 'PT. Samudera Logistik Utama', '081230110010', 'Jl. Tanjung Batu No. 15, Surabaya', 'PT. Papua Mandiri Jayapura', '081344001010', 'Jl. Percetakan Negara No. 6, Jayapura', 'Surabaya', 'Jayapura', 'Papua', 'Port to Door', 'Laut', 'Genset Portable & Panel Listrik', 'Peti kayu + shockproof', 'Flat', 4500000, 4500000, 250000, 150000, 0, 'Invoice', 'Unpaid', 'Pending', NULL::date, NULL::text)
) AS s(
  id, member_name, receipt_number, booking_date, pickup_date, ref_number,
  sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address,
  origin_city, destination_city, delivery_province, service_type, transport_via,
  goods_description, handling_instructions, chargeable_type, rate_per_unit,
  shipping_cost, packing_cost, insurance_cost, other_cost, payment_type, payment_status,
  shipment_status, received_date, receiver_person
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.shipments existing
  WHERE existing.id = s.id
     OR (existing.company_id = 'b4ea31a2-954a-4c54-90aa-5727afe183c4'::uuid AND existing.receipt_number = s.receipt_number)
);

-- 3. Seed Koli Items (shipment_items; volume_cbm is GENERATED in DB)
INSERT INTO public.shipment_items (id, shipment_id, koli_index, package_type, dim_p, dim_l, dim_t, actual_kg)
SELECT v.id, v.shipment_id, v.koli_index, v.package_type, v.dim_p, v.dim_l, v.dim_t, v.actual_kg
FROM (
  VALUES
    ('b4ea3001-0001-4000-8000-000000000001'::uuid, 'b4ea2001-0001-4000-8000-000000000001'::uuid, 1, 'Karung', 60, 45, 35, 125),
    ('b4ea3001-0001-4000-8000-000000000002'::uuid, 'b4ea2001-0001-4000-8000-000000000001'::uuid, 2, 'Karung', 60, 45, 35, 125),
    ('b4ea3001-0001-4000-8000-000000000003'::uuid, 'b4ea2001-0001-4000-8000-000000000002'::uuid, 1, 'Peti', 100, 80, 70, 320),
    ('b4ea3001-0001-4000-8000-000000000004'::uuid, 'b4ea2001-0001-4000-8000-000000000003'::uuid, 1, 'Peti', 120, 100, 85, 190),
    ('b4ea3001-0001-4000-8000-000000000005'::uuid, 'b4ea2001-0001-4000-8000-000000000003'::uuid, 2, 'Dus', 100, 100, 98, 160),
    ('b4ea3001-0001-4000-8000-000000000006'::uuid, 'b4ea2001-0001-4000-8000-000000000004'::uuid, 1, 'Dus', 85, 40, 35, 90),
    ('b4ea3001-0001-4000-8000-000000000007'::uuid, 'b4ea2001-0001-4000-8000-000000000004'::uuid, 2, 'Dus', 85, 40, 35, 90),
    ('b4ea3001-0001-4000-8000-000000000008'::uuid, 'b4ea2001-0001-4000-8000-000000000005'::uuid, 1, 'Koli', 150, 60, 40, 240),
    ('b4ea3001-0001-4000-8000-000000000009'::uuid, 'b4ea2001-0001-4000-8000-000000000005'::uuid, 2, 'Koli', 150, 60, 40, 240),
    ('b4ea3001-0001-4000-8000-000000000010'::uuid, 'b4ea2001-0001-4000-8000-000000000006'::uuid, 1, 'Dus', 55, 45, 40, 150),
    ('b4ea3001-0001-4000-8000-000000000011'::uuid, 'b4ea2001-0001-4000-8000-000000000006'::uuid, 2, 'Dus', 55, 45, 40, 150),
    ('b4ea3001-0001-4000-8000-000000000012'::uuid, 'b4ea2001-0001-4000-8000-000000000007'::uuid, 1, 'Roll', 120, 120, 90, 210),
    ('b4ea3001-0001-4000-8000-000000000013'::uuid, 'b4ea2001-0001-4000-8000-000000000007'::uuid, 2, 'Roll', 120, 100, 100, 180),
    ('b4ea3001-0001-4000-8000-000000000014'::uuid, 'b4ea2001-0001-4000-8000-000000000008'::uuid, 1, 'Dus', 50, 40, 35, 45),
    ('b4ea3001-0001-4000-8000-000000000015'::uuid, 'b4ea2001-0001-4000-8000-000000000008'::uuid, 2, 'Dus', 50, 40, 35, 45),
    ('b4ea3001-0001-4000-8000-000000000016'::uuid, 'b4ea2001-0001-4000-8000-000000000009'::uuid, 1, 'Roll', 140, 35, 35, 80),
    ('b4ea3001-0001-4000-8000-000000000017'::uuid, 'b4ea2001-0001-4000-8000-000000000009'::uuid, 2, 'Roll', 140, 35, 35, 80),
    ('b4ea3001-0001-4000-8000-000000000018'::uuid, 'b4ea2001-0001-4000-8000-000000000010'::uuid, 1, 'Peti', 130, 90, 95, 480)
) AS v(id, shipment_id, koli_index, package_type, dim_p, dim_l, dim_t, actual_kg)
WHERE EXISTS (
  SELECT 1 FROM public.shipments sh WHERE sh.id = v.shipment_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.shipment_items si WHERE si.id = v.id
);
