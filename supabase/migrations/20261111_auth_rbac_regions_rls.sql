-- ============================================================================
-- GEMA TRANS ERP: Auth Profiles, Multi-Tenant RBAC, Master Regions & Strict RLS
-- Idempotent migration script - safe to re-run in Supabase SQL Editor.
-- ============================================================================

-- 1. Ensure optional shipment columns exist
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS pickup_date DATE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. User Profiles (linked 1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_master_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. Multi-Tenant Memberships & Role per Company
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('finance', 'marketing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_user_company
  ON public.company_memberships(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_company
  ON public.company_memberships(company_id);

-- 4. Master Regions (Indonesia Cities & Provinces)
CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province, city)
);

CREATE INDEX IF NOT EXISTS idx_regions_active_city
  ON public.regions(is_active, city);

-- 5. Security Helper Functions (SECURITY DEFINER to avoid recursive RLS lookups)
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_master_admin = true
      AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_memberships cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.user_id = auth.uid()
        AND cm.company_id = target_company_id
        AND p.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(target_company_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_memberships cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.user_id = auth.uid()
        AND cm.company_id = target_company_id
        AND cm.role = ANY(allowed_roles)
        AND p.is_active = true
    );
$$;

-- 6. Enable Row Level Security (RLS) on All Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifest_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 7. Policies: profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_master_admin());

DROP POLICY IF EXISTS "profiles_manage_master_admin" ON public.profiles;
CREATE POLICY "profiles_manage_master_admin" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- 8. Policies: company_memberships
DROP POLICY IF EXISTS "memberships_select_own_or_admin" ON public.company_memberships;
CREATE POLICY "memberships_select_own_or_admin" ON public.company_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master_admin());

DROP POLICY IF EXISTS "memberships_manage_master_admin" ON public.company_memberships;
CREATE POLICY "memberships_manage_master_admin" ON public.company_memberships
  FOR ALL TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- 9. Policies: regions (readable by all authenticated users, writable only by Master Admin)
DROP POLICY IF EXISTS "regions_select_authenticated" ON public.regions;
CREATE POLICY "regions_select_authenticated" ON public.regions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "regions_manage_master_admin" ON public.regions;
CREATE POLICY "regions_manage_master_admin" ON public.regions
  FOR ALL TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- 10. Policies: companies
DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
CREATE POLICY "companies_select_member" ON public.companies
  FOR SELECT TO authenticated
  USING (public.has_company_access(id));

DROP POLICY IF EXISTS "companies_manage_master_admin" ON public.companies;
CREATE POLICY "companies_manage_master_admin" ON public.companies
  FOR ALL TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- 11. Policies: members
DROP POLICY IF EXISTS "members_tenant_all" ON public.members;
CREATE POLICY "members_tenant_all" ON public.members
  FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

-- 12. Policies: manifest_shipments
DROP POLICY IF EXISTS "manifests_tenant_all" ON public.manifest_shipments;
CREATE POLICY "manifests_tenant_all" ON public.manifest_shipments
  FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

-- 13. Policies: shipments & shipment_items
DROP POLICY IF EXISTS "shipments_tenant_all" ON public.shipments;
CREATE POLICY "shipments_tenant_all" ON public.shipments
  FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

DROP POLICY IF EXISTS "shipment_items_tenant_all" ON public.shipment_items;
CREATE POLICY "shipment_items_tenant_all" ON public.shipment_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id
        AND public.has_company_access(s.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id
        AND public.has_company_access(s.company_id)
    )
  );

-- 14. Policies: invoices (Marketing can ONLY SELECT; Finance & Master Admin can INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "invoices_select_tenant" ON public.invoices;
CREATE POLICY "invoices_select_tenant" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

DROP POLICY IF EXISTS "invoices_write_finance_or_admin" ON public.invoices;
CREATE POLICY "invoices_write_finance_or_admin" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['finance']));

DROP POLICY IF EXISTS "invoices_update_finance_or_admin" ON public.invoices;
CREATE POLICY "invoices_update_finance_or_admin" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['finance']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['finance']));

DROP POLICY IF EXISTS "invoices_delete_finance_or_admin" ON public.invoices;
CREATE POLICY "invoices_delete_finance_or_admin" ON public.invoices
  FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['finance']));

-- 15. Seed Default Indonesia Regions (458 cities/regencies)
INSERT INTO public.regions (province, city) VALUES
  ('Aceh', 'Aceh Barat'),
  ('Aceh', 'Aceh Barat Daya'),
  ('Aceh', 'Aceh Besar'),
  ('Aceh', 'Aceh Jaya'),
  ('Aceh', 'Aceh Selatan'),
  ('Aceh', 'Aceh Singkil'),
  ('Aceh', 'Aceh Tamiang'),
  ('Aceh', 'Aceh Tengah'),
  ('Aceh', 'Aceh Tenggara'),
  ('Aceh', 'Aceh Timur'),
  ('Aceh', 'Aceh Utara'),
  ('Aceh', 'Banda Aceh'),
  ('Aceh', 'Bener Meriah'),
  ('Aceh', 'Bireuen'),
  ('Aceh', 'Gayo Lues'),
  ('Aceh', 'Langsa'),
  ('Aceh', 'Lhokseumawe'),
  ('Aceh', 'Nagan Raya'),
  ('Aceh', 'Pidie'),
  ('Aceh', 'Pidie Jaya'),
  ('Aceh', 'Sabang'),
  ('Aceh', 'Simeulue'),
  ('Aceh', 'Subulussalam'),
  ('Sumatera Utara', 'Asahan'),
  ('Sumatera Utara', 'Batu Bara'),
  ('Sumatera Utara', 'Binjai'),
  ('Sumatera Utara', 'Dairi'),
  ('Sumatera Utara', 'Deli Serdang'),
  ('Sumatera Utara', 'Gunungsitoli'),
  ('Sumatera Utara', 'Humbang Hasundutan'),
  ('Sumatera Utara', 'Karo'),
  ('Sumatera Utara', 'Labuhanbatu'),
  ('Sumatera Utara', 'Langkat'),
  ('Sumatera Utara', 'Mandailing Natal'),
  ('Sumatera Utara', 'Medan'),
  ('Sumatera Utara', 'Nias'),
  ('Sumatera Utara', 'Padangsidimpuan'),
  ('Sumatera Utara', 'Pematangsiantar'),
  ('Sumatera Utara', 'Samosir'),
  ('Sumatera Utara', 'Serdang Bedagai'),
  ('Sumatera Utara', 'Sibolga'),
  ('Sumatera Utara', 'Simalungun'),
  ('Sumatera Utara', 'Tanjungbalai'),
  ('Sumatera Utara', 'Tapanuli Selatan'),
  ('Sumatera Utara', 'Tapanuli Tengah'),
  ('Sumatera Utara', 'Tapanuli Utara'),
  ('Sumatera Utara', 'Tebing Tinggi'),
  ('Sumatera Utara', 'Toba'),
  ('Sumatera Barat', 'Agam'),
  ('Sumatera Barat', 'Bukittinggi'),
  ('Sumatera Barat', 'Dharmasraya'),
  ('Sumatera Barat', 'Padang'),
  ('Sumatera Barat', 'Padang Panjang'),
  ('Sumatera Barat', 'Padang Pariaman'),
  ('Sumatera Barat', 'Pariaman'),
  ('Sumatera Barat', 'Pasaman'),
  ('Sumatera Barat', 'Pasaman Barat'),
  ('Sumatera Barat', 'Payakumbuh'),
  ('Sumatera Barat', 'Pesisir Selatan'),
  ('Sumatera Barat', 'Sawahlunto'),
  ('Sumatera Barat', 'Sijunjung'),
  ('Sumatera Barat', 'Solok'),
  ('Sumatera Barat', 'Tanah Datar'),
  ('Riau', 'Bengkalis'),
  ('Riau', 'Dumai'),
  ('Riau', 'Indragiri Hilir'),
  ('Riau', 'Indragiri Hulu'),
  ('Riau', 'Kampar'),
  ('Riau', 'Kuantan Singingi'),
  ('Riau', 'Pekanbaru'),
  ('Riau', 'Pelalawan'),
  ('Riau', 'Rokan Hilir'),
  ('Riau', 'Rokan Hulu'),
  ('Riau', 'Siak'),
  ('Kepulauan Riau', 'Batam'),
  ('Kepulauan Riau', 'Bintan'),
  ('Kepulauan Riau', 'Karimun'),
  ('Kepulauan Riau', 'Kepulauan Anambas'),
  ('Kepulauan Riau', 'Lingga'),
  ('Kepulauan Riau', 'Natuna'),
  ('Kepulauan Riau', 'Tanjungpinang'),
  ('Jambi', 'Batanghari'),
  ('Jambi', 'Bungo'),
  ('Jambi', 'Jambi'),
  ('Jambi', 'Kerinci'),
  ('Jambi', 'Merangin'),
  ('Jambi', 'Muaro Jambi'),
  ('Jambi', 'Sarolangun'),
  ('Jambi', 'Sungai Penuh'),
  ('Jambi', 'Tanjung Jabung Barat'),
  ('Jambi', 'Tanjung Jabung Timur'),
  ('Jambi', 'Tebo'),
  ('Sumatera Selatan', 'Banyuasin'),
  ('Sumatera Selatan', 'Empat Lawang'),
  ('Sumatera Selatan', 'Lahat'),
  ('Sumatera Selatan', 'Lubuklinggau'),
  ('Sumatera Selatan', 'Muara Enim'),
  ('Sumatera Selatan', 'Musi Banyuasin'),
  ('Sumatera Selatan', 'Musi Rawas'),
  ('Sumatera Selatan', 'Ogan Ilir'),
  ('Sumatera Selatan', 'Ogan Komering Ilir'),
  ('Sumatera Selatan', 'Ogan Komering Ulu'),
  ('Sumatera Selatan', 'Pagar Alam'),
  ('Sumatera Selatan', 'Palembang'),
  ('Sumatera Selatan', 'Prabumulih'),
  ('Kepulauan Bangka Belitung', 'Bangka'),
  ('Kepulauan Bangka Belitung', 'Bangka Barat'),
  ('Kepulauan Bangka Belitung', 'Bangka Selatan'),
  ('Kepulauan Bangka Belitung', 'Bangka Tengah'),
  ('Kepulauan Bangka Belitung', 'Belitung'),
  ('Kepulauan Bangka Belitung', 'Belitung Timur'),
  ('Kepulauan Bangka Belitung', 'Pangkalpinang'),
  ('Bengkulu', 'Bengkulu'),
  ('Bengkulu', 'Bengkulu Selatan'),
  ('Bengkulu', 'Bengkulu Tengah'),
  ('Bengkulu', 'Bengkulu Utara'),
  ('Bengkulu', 'Kaur'),
  ('Bengkulu', 'Kepahiang'),
  ('Bengkulu', 'Lebong'),
  ('Bengkulu', 'Mukomuko'),
  ('Bengkulu', 'Rejang Lebong'),
  ('Bengkulu', 'Seluma'),
  ('Lampung', 'Bandar Lampung'),
  ('Lampung', 'Lampung Barat'),
  ('Lampung', 'Lampung Selatan'),
  ('Lampung', 'Lampung Tengah'),
  ('Lampung', 'Lampung Timur'),
  ('Lampung', 'Lampung Utara'),
  ('Lampung', 'Mesuji'),
  ('Lampung', 'Metro'),
  ('Lampung', 'Pesawaran'),
  ('Lampung', 'Pringsewu'),
  ('Lampung', 'Tanggamus'),
  ('Lampung', 'Tulang Bawang'),
  ('Lampung', 'Way Kanan'),
  ('DKI Jakarta', 'Jakarta Barat'),
  ('DKI Jakarta', 'Jakarta Pusat'),
  ('DKI Jakarta', 'Jakarta Selatan'),
  ('DKI Jakarta', 'Jakarta Timur'),
  ('DKI Jakarta', 'Jakarta Utara'),
  ('DKI Jakarta', 'Kepulauan Seribu'),
  ('Banten', 'Cilegon'),
  ('Banten', 'Lebak'),
  ('Banten', 'Pandeglang'),
  ('Banten', 'Serang'),
  ('Banten', 'Tangerang'),
  ('Banten', 'Tangerang Selatan'),
  ('Jawa Barat', 'Bandung'),
  ('Jawa Barat', 'Bandung Barat'),
  ('Jawa Barat', 'Kota Banjar'),
  ('Jawa Barat', 'Bekasi'),
  ('Jawa Barat', 'Bogor'),
  ('Jawa Barat', 'Ciamis'),
  ('Jawa Barat', 'Cianjur'),
  ('Jawa Barat', 'Cimahi'),
  ('Jawa Barat', 'Cirebon'),
  ('Jawa Barat', 'Depok'),
  ('Jawa Barat', 'Garut'),
  ('Jawa Barat', 'Indramayu'),
  ('Jawa Barat', 'Karawang'),
  ('Jawa Barat', 'Kuningan'),
  ('Jawa Barat', 'Majalengka'),
  ('Jawa Barat', 'Pangandaran'),
  ('Jawa Barat', 'Purwakarta'),
  ('Jawa Barat', 'Subang'),
  ('Jawa Barat', 'Sukabumi'),
  ('Jawa Barat', 'Sumedang'),
  ('Jawa Barat', 'Tasikmalaya'),
  ('Jawa Tengah', 'Banjarnegara'),
  ('Jawa Tengah', 'Banyumas'),
  ('Jawa Tengah', 'Batang'),
  ('Jawa Tengah', 'Blora'),
  ('Jawa Tengah', 'Boyolali'),
  ('Jawa Tengah', 'Brebes'),
  ('Jawa Tengah', 'Cilacap'),
  ('Jawa Tengah', 'Demak'),
  ('Jawa Tengah', 'Grobogan'),
  ('Jawa Tengah', 'Jepara'),
  ('Jawa Tengah', 'Karanganyar'),
  ('Jawa Tengah', 'Kebumen'),
  ('Jawa Tengah', 'Kendal'),
  ('Jawa Tengah', 'Klaten'),
  ('Jawa Tengah', 'Kudus'),
  ('Jawa Tengah', 'Magelang'),
  ('Jawa Tengah', 'Pati'),
  ('Jawa Tengah', 'Pekalongan'),
  ('Jawa Tengah', 'Pemalang'),
  ('Jawa Tengah', 'Purbalingga'),
  ('Jawa Tengah', 'Purworejo'),
  ('Jawa Tengah', 'Rembang'),
  ('Jawa Tengah', 'Salatiga'),
  ('Jawa Tengah', 'Semarang'),
  ('Jawa Tengah', 'Sragen'),
  ('Jawa Tengah', 'Sukoharjo'),
  ('Jawa Tengah', 'Surakarta (Solo)'),
  ('Jawa Tengah', 'Tegal'),
  ('Jawa Tengah', 'Temanggung'),
  ('Jawa Tengah', 'Wonogiri'),
  ('Jawa Tengah', 'Wonosobo'),
  ('DI Yogyakarta', 'Bantul'),
  ('DI Yogyakarta', 'Gunungkidul'),
  ('DI Yogyakarta', 'Kulon Progo'),
  ('DI Yogyakarta', 'Sleman'),
  ('DI Yogyakarta', 'Yogyakarta'),
  ('Jawa Timur', 'Bangkalan'),
  ('Jawa Timur', 'Banyuwangi'),
  ('Jawa Timur', 'Batu'),
  ('Jawa Timur', 'Blitar'),
  ('Jawa Timur', 'Bojonegoro'),
  ('Jawa Timur', 'Bondowoso'),
  ('Jawa Timur', 'Gresik'),
  ('Jawa Timur', 'Jember'),
  ('Jawa Timur', 'Jombang'),
  ('Jawa Timur', 'Kediri'),
  ('Jawa Timur', 'Lamongan'),
  ('Jawa Timur', 'Lumajang'),
  ('Jawa Timur', 'Madiun'),
  ('Jawa Timur', 'Magetan'),
  ('Jawa Timur', 'Malang'),
  ('Jawa Timur', 'Mojokerto'),
  ('Jawa Timur', 'Nganjuk'),
  ('Jawa Timur', 'Ngawi'),
  ('Jawa Timur', 'Pacitan'),
  ('Jawa Timur', 'Pamekasan'),
  ('Jawa Timur', 'Pasuruan'),
  ('Jawa Timur', 'Ponorogo'),
  ('Jawa Timur', 'Probolinggo'),
  ('Jawa Timur', 'Sampang'),
  ('Jawa Timur', 'Sidoarjo'),
  ('Jawa Timur', 'Situbondo'),
  ('Jawa Timur', 'Sumenep'),
  ('Jawa Timur', 'Surabaya'),
  ('Jawa Timur', 'Trenggalek'),
  ('Jawa Timur', 'Tuban'),
  ('Jawa Timur', 'Tulungagung'),
  ('Bali', 'Badung'),
  ('Bali', 'Bangli'),
  ('Bali', 'Buleleng'),
  ('Bali', 'Denpasar'),
  ('Bali', 'Gianyar'),
  ('Bali', 'Jembrana'),
  ('Bali', 'Karangasem'),
  ('Bali', 'Klungkung'),
  ('Bali', 'Tabanan'),
  ('Nusa Tenggara Barat', 'Bima'),
  ('Nusa Tenggara Barat', 'Dompu'),
  ('Nusa Tenggara Barat', 'Lombok Barat'),
  ('Nusa Tenggara Barat', 'Lombok Tengah'),
  ('Nusa Tenggara Barat', 'Lombok Timur'),
  ('Nusa Tenggara Barat', 'Lombok Utara'),
  ('Nusa Tenggara Barat', 'Mataram'),
  ('Nusa Tenggara Barat', 'Sumbawa'),
  ('Nusa Tenggara Barat', 'Sumbawa Barat'),
  ('Nusa Tenggara Timur', 'Alor'),
  ('Nusa Tenggara Timur', 'Belu'),
  ('Nusa Tenggara Timur', 'Ende'),
  ('Nusa Tenggara Timur', 'Flores Timur'),
  ('Nusa Tenggara Timur', 'Kupang'),
  ('Nusa Tenggara Timur', 'Lembata'),
  ('Nusa Tenggara Timur', 'Manggarai'),
  ('Nusa Tenggara Timur', 'Manggarai Barat'),
  ('Nusa Tenggara Timur', 'Manggarai Timur'),
  ('Nusa Tenggara Timur', 'Nagekeo'),
  ('Nusa Tenggara Timur', 'Ngada'),
  ('Nusa Tenggara Timur', 'Rote Ndao'),
  ('Nusa Tenggara Timur', 'Sikka'),
  ('Nusa Tenggara Timur', 'Sumba Barat'),
  ('Nusa Tenggara Timur', 'Sumba Timur'),
  ('Nusa Tenggara Timur', 'Timor Tengah Selatan'),
  ('Nusa Tenggara Timur', 'Timor Tengah Utara'),
  ('Kalimantan Barat', 'Bengkayang'),
  ('Kalimantan Barat', 'Kapuas Hulu'),
  ('Kalimantan Barat', 'Kayong Utara'),
  ('Kalimantan Barat', 'Ketapang'),
  ('Kalimantan Barat', 'Kubu Raya'),
  ('Kalimantan Barat', 'Landak'),
  ('Kalimantan Barat', 'Melawi'),
  ('Kalimantan Barat', 'Mempawah'),
  ('Kalimantan Barat', 'Pontianak'),
  ('Kalimantan Barat', 'Sambas'),
  ('Kalimantan Barat', 'Sanggau'),
  ('Kalimantan Barat', 'Sekadau'),
  ('Kalimantan Barat', 'Singkawang'),
  ('Kalimantan Barat', 'Sintang'),
  ('Kalimantan Tengah', 'Barito Selatan'),
  ('Kalimantan Tengah', 'Barito Timur'),
  ('Kalimantan Tengah', 'Barito Utara'),
  ('Kalimantan Tengah', 'Gunung Mas'),
  ('Kalimantan Tengah', 'Kapuas'),
  ('Kalimantan Tengah', 'Katingan'),
  ('Kalimantan Tengah', 'Kotawaringin Barat'),
  ('Kalimantan Tengah', 'Kotawaringin Timur'),
  ('Kalimantan Tengah', 'Lamandau'),
  ('Kalimantan Tengah', 'Murung Raya'),
  ('Kalimantan Tengah', 'Palangka Raya'),
  ('Kalimantan Tengah', 'Pulang Pisau'),
  ('Kalimantan Tengah', 'Seruyan'),
  ('Kalimantan Tengah', 'Sukamara'),
  ('Kalimantan Selatan', 'Balangan'),
  ('Kalimantan Selatan', 'Kab. Banjar'),
  ('Kalimantan Selatan', 'Banjarbaru'),
  ('Kalimantan Selatan', 'Banjarmasin'),
  ('Kalimantan Selatan', 'Barito Kuala'),
  ('Kalimantan Selatan', 'Hulu Sungai Selatan'),
  ('Kalimantan Selatan', 'Hulu Sungai Tengah'),
  ('Kalimantan Selatan', 'Hulu Sungai Utara'),
  ('Kalimantan Selatan', 'Kotabaru'),
  ('Kalimantan Selatan', 'Tabalong'),
  ('Kalimantan Selatan', 'Tanah Bumbu'),
  ('Kalimantan Selatan', 'Tanah Laut'),
  ('Kalimantan Selatan', 'Tapin'),
  ('Kalimantan Timur', 'Balikpapan'),
  ('Kalimantan Timur', 'Berau'),
  ('Kalimantan Timur', 'Bontang'),
  ('Kalimantan Timur', 'Kutai Barat'),
  ('Kalimantan Timur', 'Kutai Kartanegara'),
  ('Kalimantan Timur', 'Kutai Timur'),
  ('Kalimantan Timur', 'Mahakam Ulu'),
  ('Kalimantan Timur', 'Paser'),
  ('Kalimantan Timur', 'Penajam Paser Utara'),
  ('Kalimantan Timur', 'Samarinda'),
  ('Kalimantan Utara', 'Bulungan'),
  ('Kalimantan Utara', 'Malinau'),
  ('Kalimantan Utara', 'Nunukan'),
  ('Kalimantan Utara', 'Tana Tidung'),
  ('Kalimantan Utara', 'Tarakan'),
  ('Sulawesi Utara', 'Bitung'),
  ('Sulawesi Utara', 'Bolaang Mongondow'),
  ('Sulawesi Utara', 'Kepulauan Sangihe'),
  ('Sulawesi Utara', 'Kepulauan Talaud'),
  ('Sulawesi Utara', 'Kotamobagu'),
  ('Sulawesi Utara', 'Manado'),
  ('Sulawesi Utara', 'Minahasa'),
  ('Sulawesi Utara', 'Minahasa Selatan'),
  ('Sulawesi Utara', 'Minahasa Tenggara'),
  ('Sulawesi Utara', 'Minahasa Utara'),
  ('Sulawesi Utara', 'Tomohon'),
  ('Gorontalo', 'Boalemo'),
  ('Gorontalo', 'Bone Bolango'),
  ('Gorontalo', 'Gorontalo'),
  ('Gorontalo', 'Gorontalo Utara'),
  ('Gorontalo', 'Pohuwato'),
  ('Sulawesi Tengah', 'Banggai'),
  ('Sulawesi Tengah', 'Banggai Kepulauan'),
  ('Sulawesi Tengah', 'Banggai Laut'),
  ('Sulawesi Tengah', 'Buol'),
  ('Sulawesi Tengah', 'Donggala'),
  ('Sulawesi Tengah', 'Morowali'),
  ('Sulawesi Tengah', 'Morowali Utara'),
  ('Sulawesi Tengah', 'Palu'),
  ('Sulawesi Tengah', 'Parigi Moutong'),
  ('Sulawesi Tengah', 'Poso'),
  ('Sulawesi Tengah', 'Sigi'),
  ('Sulawesi Tengah', 'Tojo Una-Una'),
  ('Sulawesi Tengah', 'Tolitoli'),
  ('Sulawesi Barat', 'Majene'),
  ('Sulawesi Barat', 'Mamasa'),
  ('Sulawesi Barat', 'Mamuju'),
  ('Sulawesi Barat', 'Mamuju Tengah'),
  ('Sulawesi Barat', 'Pasangkayu'),
  ('Sulawesi Barat', 'Polewali Mandar'),
  ('Sulawesi Selatan', 'Bantaeng'),
  ('Sulawesi Selatan', 'Barru'),
  ('Sulawesi Selatan', 'Bone'),
  ('Sulawesi Selatan', 'Bulukumba'),
  ('Sulawesi Selatan', 'Enrekang'),
  ('Sulawesi Selatan', 'Gowa'),
  ('Sulawesi Selatan', 'Jeneponto'),
  ('Sulawesi Selatan', 'Kepulauan Selayar'),
  ('Sulawesi Selatan', 'Luwu'),
  ('Sulawesi Selatan', 'Luwu Timur'),
  ('Sulawesi Selatan', 'Luwu Utara'),
  ('Sulawesi Selatan', 'Makassar'),
  ('Sulawesi Selatan', 'Maros'),
  ('Sulawesi Selatan', 'Palopo'),
  ('Sulawesi Selatan', 'Pangkajene dan Kepulauan'),
  ('Sulawesi Selatan', 'Parepare'),
  ('Sulawesi Selatan', 'Pinrang'),
  ('Sulawesi Selatan', 'Sidenreng Rappang'),
  ('Sulawesi Selatan', 'Sinjai'),
  ('Sulawesi Selatan', 'Soppeng'),
  ('Sulawesi Selatan', 'Takalar'),
  ('Sulawesi Selatan', 'Tana Toraja'),
  ('Sulawesi Selatan', 'Toraja Utara'),
  ('Sulawesi Selatan', 'Wajo'),
  ('Sulawesi Tenggara', 'Bau-Bau'),
  ('Sulawesi Tenggara', 'Bombana'),
  ('Sulawesi Tenggara', 'Buton'),
  ('Sulawesi Tenggara', 'Buton Utara'),
  ('Sulawesi Tenggara', 'Kendari'),
  ('Sulawesi Tenggara', 'Kolaka'),
  ('Sulawesi Tenggara', 'Kolaka Utara'),
  ('Sulawesi Tenggara', 'Konawe'),
  ('Sulawesi Tenggara', 'Konawe Selatan'),
  ('Sulawesi Tenggara', 'Konawe Utara'),
  ('Sulawesi Tenggara', 'Muna'),
  ('Sulawesi Tenggara', 'Wakatobi'),
  ('Maluku', 'Ambon'),
  ('Maluku', 'Buru'),
  ('Maluku', 'Buru Selatan'),
  ('Maluku', 'Kepulauan Aru'),
  ('Maluku', 'Kepulauan Tanimbar'),
  ('Maluku', 'Maluku Barat Daya'),
  ('Maluku', 'Maluku Tengah'),
  ('Maluku', 'Maluku Tenggara'),
  ('Maluku', 'Seram Bagian Barat'),
  ('Maluku', 'Seram Bagian Timur'),
  ('Maluku', 'Tual'),
  ('Maluku Utara', 'Halmahera Barat'),
  ('Maluku Utara', 'Halmahera Selatan'),
  ('Maluku Utara', 'Halmahera Tengah'),
  ('Maluku Utara', 'Halmahera Timur'),
  ('Maluku Utara', 'Halmahera Utara'),
  ('Maluku Utara', 'Kepulauan Sula'),
  ('Maluku Utara', 'Pulau Morotai'),
  ('Maluku Utara', 'Pulau Taliabu'),
  ('Maluku Utara', 'Ternate'),
  ('Maluku Utara', 'Tidore Kepulauan'),
  ('Papua', 'Biak Numfor'),
  ('Papua', 'Jayapura'),
  ('Papua', 'Keerom'),
  ('Papua', 'Kepulauan Yapen'),
  ('Papua', 'Mamberamo Raya'),
  ('Papua', 'Sarmi'),
  ('Papua', 'Supiori'),
  ('Papua', 'Waropen'),
  ('Papua Barat', 'Fakfak'),
  ('Papua Barat', 'Kaimana'),
  ('Papua Barat', 'Manokwari'),
  ('Papua Barat', 'Manokwari Selatan'),
  ('Papua Barat', 'Pegunungan Arfak'),
  ('Papua Barat', 'Teluk Bintuni'),
  ('Papua Barat', 'Teluk Wondama'),
  ('Papua Barat Daya', 'Maybrat'),
  ('Papua Barat Daya', 'Raja Ampat'),
  ('Papua Barat Daya', 'Sorong'),
  ('Papua Barat Daya', 'Sorong Selatan'),
  ('Papua Barat Daya', 'Tambrauw'),
  ('Papua Tengah', 'Deiyai'),
  ('Papua Tengah', 'Dogiyai'),
  ('Papua Tengah', 'Intan Jaya'),
  ('Papua Tengah', 'Mimika (Timika)'),
  ('Papua Tengah', 'Nabire'),
  ('Papua Tengah', 'Paniai'),
  ('Papua Tengah', 'Puncak'),
  ('Papua Tengah', 'Puncak Jaya'),
  ('Papua Pegunungan', 'Jayawijaya (Wamena)'),
  ('Papua Pegunungan', 'Lanny Jaya'),
  ('Papua Pegunungan', 'Mamberamo Tengah'),
  ('Papua Pegunungan', 'Nduga'),
  ('Papua Pegunungan', 'Pegunungan Bintang'),
  ('Papua Pegunungan', 'Tolikara'),
  ('Papua Pegunungan', 'Yahukimo'),
  ('Papua Pegunungan', 'Yalimo'),
  ('Papua Selatan', 'Asmat'),
  ('Papua Selatan', 'Boven Digoel'),
  ('Papua Selatan', 'Mappi'),
  ('Papua Selatan', 'Merauke')
ON CONFLICT (province, city) DO NOTHING;
