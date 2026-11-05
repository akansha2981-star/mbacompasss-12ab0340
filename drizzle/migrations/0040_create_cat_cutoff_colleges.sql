CREATE TABLE public.cat_cutoff_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT NOT NULL,
  cutoff_band TEXT NOT NULL CHECK (cutoff_band IN ('97-99','95-97','90-95','80-90','70-80','60-70','55-60','no-sectional','profile-based')),
  overall_percentile TEXT NOT NULL DEFAULT '',
  fees TEXT NOT NULL DEFAULT '',
  highest_package TEXT NOT NULL DEFAULT '',
  average_package TEXT NOT NULL DEFAULT '',
  apply_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cat_cutoff_colleges_band ON public.cat_cutoff_colleges (cutoff_band, sort_order) WHERE is_active;

GRANT SELECT ON public.cat_cutoff_colleges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cat_cutoff_colleges TO authenticated;
GRANT ALL ON public.cat_cutoff_colleges TO service_role;

ALTER TABLE public.cat_cutoff_colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active CAT cut-off colleges" ON public.cat_cutoff_colleges
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins read all CAT cut-off colleges" ON public.cat_cutoff_colleges
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert CAT cut-off colleges" ON public.cat_cutoff_colleges
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update CAT cut-off colleges" ON public.cat_cutoff_colleges
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete CAT cut-off colleges" ON public.cat_cutoff_colleges
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));