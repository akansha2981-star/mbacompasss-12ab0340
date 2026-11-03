CREATE TABLE public.xat_calculator_settings (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.xat_calculator_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.xat_calculator_settings TO authenticated;
GRANT ALL ON public.xat_calculator_settings TO service_role;
ALTER TABLE public.xat_calculator_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read XAT calculator settings" ON public.xat_calculator_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert XAT calculator settings" ON public.xat_calculator_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update XAT calculator settings" ON public.xat_calculator_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.xat_score_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  candidate_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  phone_verified boolean NOT NULL DEFAULT false,
  application_no text,
  test_date text,
  test_time text,
  response_sheet_url text,
  total_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  gk_score numeric,
  unattempted_penalty numeric NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  attempted integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  incorrect integer NOT NULL DEFAULT 0,
  unattempted integer NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  valr_score numeric, dm_score numeric, qadi_score numeric,
  sections_data jsonb,
  questions_data jsonb
);
GRANT SELECT ON public.xat_score_submissions TO authenticated;
GRANT ALL ON public.xat_score_submissions TO service_role;
ALTER TABLE public.xat_score_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read XAT submissions" ON public.xat_score_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own XAT submissions" ON public.xat_score_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.xat_score_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  total_score numeric NOT NULL,
  valr_score numeric, dm_score numeric, qadi_score numeric, gk_score numeric,
  source text NOT NULL DEFAULT 'manual'
);
GRANT INSERT ON public.xat_score_aggregates TO anon, authenticated;
GRANT SELECT ON public.xat_score_aggregates TO authenticated;
GRANT ALL ON public.xat_score_aggregates TO service_role;
ALTER TABLE public.xat_score_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can contribute anonymous XAT scores" ON public.xat_score_aggregates FOR INSERT TO anon, authenticated
  WITH CHECK (total_score BETWEEN -30 AND 120 AND source IN ('manual'));
CREATE POLICY "Admins read anonymous XAT scores" ON public.xat_score_aggregates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Public, identity-free stats for the current XAT cycle (submissions since 1 June of the cycle).
CREATE OR REPLACE FUNCTION public.xat_live_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.xat_score_submissions),
    'scores', COALESCE((SELECT jsonb_agg(total_score ORDER BY total_score DESC) FROM public.xat_score_submissions WHERE created_at >= '2026-06-01'), '[]'::jsonb),
    'sections', (SELECT jsonb_build_object('VALR', round(avg(valr_score),2), 'DM', round(avg(dm_score),2), 'QADI', round(avg(qadi_score),2)) FROM public.xat_score_submissions WHERE created_at >= '2026-06-01')
  );
$$;
REVOKE ALL ON FUNCTION public.xat_live_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.xat_live_stats() TO anon, authenticated;