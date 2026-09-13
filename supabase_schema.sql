-- ==========================================================
-- NÖBET & GÖREV ÇİZELGESİ - SUPABASE VERİTABANI ŞEMASI
-- ==========================================================
-- Bu scripti yeni Supabase projenizin SQL Editor sekmesine
-- yapıştırıp "RUN" butonuna basmanız yeterlidir.
-- ==========================================================

-- 1. DOKTORLAR / ASİSTAN KADROSU TABLOSU
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  title TEXT DEFAULT 'Asistan Dr.',
  seniority TEXT NOT NULL CHECK (seniority IN ('kidemli', 'kidemsiz')),
  color TEXT DEFAULT '#2563EB',
  target_total_shifts INTEGER DEFAULT 0,
  target_weekend_shifts INTEGER DEFAULT 0,
  primary_duty TEXT DEFAULT 'poliklinik',
  compensation_duties JSONB DEFAULT '[]'::jsonb,
  is_only_ameliyathane BOOLEAN DEFAULT FALSE,
  can_do_consultant BOOLEAN DEFAULT TRUE,
  can_do_service BOOLEAN DEFAULT TRUE,
  can_do_clinic BOOLEAN DEFAULT TRUE,
  can_do_urodinami BOOLEAN DEFAULT FALSE,
  can_do_ameliyathane BOOLEAN DEFAULT TRUE,
  unavailable_dates JSONB DEFAULT '[]'::jsonb,
  preferred_dates JSONB DEFAULT '[]'::jsonb,
  preferred_junior_ids JSONB DEFAULT '[]'::jsonb,
  seniority_rank INTEGER DEFAULT 0,
  historical_shifts INTEGER DEFAULT 0,
  historical_weekends INTEGER DEFAULT 0,
  historical_holidays INTEGER DEFAULT 0,
  last_holiday_worked_date TEXT,
  last_holiday_worked_name TEXT,
  shift_balance INTEGER DEFAULT 0,
  weekend_balance INTEGER DEFAULT 0,
  username TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AYLIK ÇİZELGELER TABLOSU
CREATE TABLE IF NOT EXISTS public.monthly_rosters (
  id TEXT PRIMARY KEY, -- '2026-09'
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  department_title TEXT DEFAULT 'EÜTF ÜROLOJİ ANABİLİM DALI',
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_holidays JSONB DEFAULT '[]'::jsonb,
  poliklinik_count INTEGER DEFAULT 2,
  servis_count INTEGER DEFAULT 1,
  konsultan_count INTEGER DEFAULT 1,
  nobetci_count INTEGER DEFAULT 2,
  weekend_has_day_roles BOOLEAN DEFAULT FALSE,
  previous_month_last_duty_doctor_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ADALET & GEÇMİŞ AY HAFIZASI TABLOSU
CREATE TABLE IF NOT EXISTS public.historical_memory (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  total_shifts INTEGER DEFAULT 0,
  weekend_shifts INTEGER DEFAULT 0,
  holiday_shifts INTEGER DEFAULT 0,
  holiday_names JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) POLİTİKALARI
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Doctors" ON public.doctors;
CREATE POLICY "Public Read Doctors" ON public.doctors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Rosters" ON public.monthly_rosters;
CREATE POLICY "Public Read Rosters" ON public.monthly_rosters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Memory" ON public.historical_memory;
CREATE POLICY "Public Read Memory" ON public.historical_memory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Modify Doctors" ON public.doctors;
CREATE POLICY "Public Modify Doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Modify Rosters" ON public.monthly_rosters;
CREATE POLICY "Public Modify Rosters" ON public.monthly_rosters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Modify Memory" ON public.historical_memory;
CREATE POLICY "Public Modify Memory" ON public.historical_memory FOR ALL USING (true) WITH CHECK (true);
