CREATE TABLE public.cat_calculator_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.cat_calculator_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.cat_calculator_settings TO authenticated;
GRANT ALL ON public.cat_calculator_settings TO service_role;
ALTER TABLE public.cat_calculator_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read CAT calculator settings" ON public.cat_calculator_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert CAT calculator settings" ON public.cat_calculator_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update CAT calculator settings" ON public.cat_calculator_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.cat_alert_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  whatsapp text,
  alerts text[] NOT NULL DEFAULT ARRAY['response_sheet','answer_key','result'],
  consent boolean NOT NULL,
  source_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cat_alert_contact CHECK (
    (email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255)
    OR (whatsapp IS NOT NULL AND whatsapp ~ '^[6-9][0-9]{9}$')
  ),
  CONSTRAINT cat_alert_consent CHECK (consent = true)
);
GRANT INSERT ON public.cat_alert_signups TO anon, authenticated;
GRANT SELECT, DELETE ON public.cat_alert_signups TO authenticated;
GRANT ALL ON public.cat_alert_signups TO service_role;
ALTER TABLE public.cat_alert_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can sign up for CAT alerts" ON public.cat_alert_signups FOR INSERT TO anon, authenticated WITH CHECK (consent = true);
CREATE POLICY "Admins read CAT alert signups" ON public.cat_alert_signups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete CAT alert signups" ON public.cat_alert_signups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.cat_score_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot smallint CHECK (slot BETWEEN 1 AND 3),
  total_score smallint NOT NULL CHECK (total_score BETWEEN -68 AND 204),
  varc_score smallint, dilr_score smallint, qa_score smallint,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','link')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.cat_score_aggregates TO anon, authenticated;
GRANT SELECT ON public.cat_score_aggregates TO authenticated;
GRANT ALL ON public.cat_score_aggregates TO service_role;
ALTER TABLE public.cat_score_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can contribute anonymous CAT scores" ON public.cat_score_aggregates FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read anonymous CAT scores" ON public.cat_score_aggregates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));