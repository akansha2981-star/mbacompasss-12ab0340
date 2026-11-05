CREATE TABLE public.utm_brands (
  key text PRIMARY KEY,
  name text NOT NULL,
  utm_source text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.utm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  brand_key text REFERENCES public.utm_brands(key) ON UPDATE CASCADE,
  default_medium text NOT NULL DEFAULT 'website',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.utm_allowed_domains (
  domain text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.utm_pending_urls (
  normalized_url text PRIMARY KEY,
  destination_url text NOT NULL,
  host text NOT NULL,
  brand_key text,
  first_seen_path text,
  hits integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.utm_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  destination_url text NOT NULL,
  normalized_url text NOT NULL,
  host text NOT NULL,
  final_url text NOT NULL,
  brand_key text NOT NULL REFERENCES public.utm_brands(key) ON UPDATE CASCADE,
  utm_source text NOT NULL,
  utm_medium text NOT NULL,
  utm_campaign text NOT NULL,
  utm_content text NOT NULL DEFAULT '',
  utm_term text NOT NULL DEFAULT '',
  college_id uuid,
  college_name text,
  college_needs_review boolean NOT NULL DEFAULT false,
  origin_page text,
  origin_module text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  health_status text NOT NULL DEFAULT 'unchecked',
  health_http_status integer,
  health_checked_at timestamptz,
  total_clicks integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT utm_links_identity UNIQUE (normalized_url, brand_key, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
);
CREATE INDEX utm_links_college_idx ON public.utm_links(college_id);
CREATE INDEX utm_links_host_idx ON public.utm_links(host);
CREATE TABLE public.utm_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.utm_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  visitor_hash text NOT NULL,
  session_hash text NOT NULL,
  is_unique boolean NOT NULL DEFAULT false,
  is_returning boolean NOT NULL DEFAULT false,
  referrer_host text,
  page_path text,
  device text,
  browser text,
  os text,
  country text
);
CREATE INDEX utm_clicks_link_time_idx ON public.utm_clicks(link_id, clicked_at DESC);
CREATE INDEX utm_clicks_time_idx ON public.utm_clicks(clicked_at DESC);
CREATE TABLE public.utm_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.utm_links(id) ON DELETE CASCADE,
  click_id uuid,
  event_type text NOT NULL DEFAULT 'conversion',
  value numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX utm_conversions_link_idx ON public.utm_conversions(link_id, created_at DESC);
CREATE TABLE public.utm_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_brand text NOT NULL DEFAULT 'mba_compass',
  default_medium text NOT NULL DEFAULT 'website',
  campaign_year text NOT NULL DEFAULT '2027',
  auto_convert_links boolean NOT NULL DEFAULT true,
  conversion_secret text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.utm_brands, public.utm_campaigns, public.utm_allowed_domains, public.utm_pending_urls, public.utm_links, public.utm_clicks, public.utm_conversions, public.utm_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utm_brands, public.utm_campaigns, public.utm_allowed_domains, public.utm_pending_urls, public.utm_links, public.utm_clicks, public.utm_conversions, public.utm_settings TO authenticated;

ALTER TABLE public.utm_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_pending_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage utm_brands" ON public.utm_brands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage utm_campaigns" ON public.utm_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage utm_allowed_domains" ON public.utm_allowed_domains FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage utm_pending_urls" ON public.utm_pending_urls FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage utm_links" ON public.utm_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read utm_clicks" ON public.utm_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage utm_conversions" ON public.utm_conversions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage utm_settings" ON public.utm_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Counter maintenance
CREATE OR REPLACE FUNCTION public.utm_click_counters() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.utm_links SET total_clicks = total_clicks + 1,
    unique_visitors = unique_visitors + CASE WHEN NEW.is_unique THEN 1 ELSE 0 END,
    last_clicked_at = NEW.clicked_at
  WHERE id = NEW.link_id;
  RETURN NEW;
END $$;
CREATE TRIGGER utm_clicks_counters AFTER INSERT ON public.utm_clicks FOR EACH ROW EXECUTE FUNCTION public.utm_click_counters();

CREATE OR REPLACE FUNCTION public.utm_conversion_counters() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.utm_links SET conversions = conversions + 1 WHERE id = NEW.link_id;
  RETURN NEW;
END $$;
CREATE TRIGGER utm_conversions_counters AFTER INSERT ON public.utm_conversions FOR EACH ROW EXECUTE FUNCTION public.utm_conversion_counters();

-- Range analytics per link (admin only)
CREATE OR REPLACE FUNCTION public.utm_link_stats(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(link_id uuid, clicks bigint, uniques bigint, sessions bigint, returning_visitors bigint, conversions bigint, prev_clicks bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE span interval := p_to - p_from;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT l.id,
    COUNT(c.id) FILTER (WHERE c.clicked_at >= p_from AND c.clicked_at < p_to),
    COUNT(DISTINCT c.visitor_hash) FILTER (WHERE c.clicked_at >= p_from AND c.clicked_at < p_to),
    COUNT(DISTINCT c.session_hash) FILTER (WHERE c.clicked_at >= p_from AND c.clicked_at < p_to),
    COUNT(DISTINCT c.visitor_hash) FILTER (WHERE c.clicked_at >= p_from AND c.clicked_at < p_to AND c.is_returning),
    (SELECT COUNT(*) FROM public.utm_conversions v WHERE v.link_id = l.id AND v.created_at >= p_from AND v.created_at < p_to),
    COUNT(c.id) FILTER (WHERE c.clicked_at >= p_from - span AND c.clicked_at < p_from)
  FROM public.utm_links l
  LEFT JOIN public.utm_clicks c ON c.link_id = l.id AND c.clicked_at >= p_from - span AND c.clicked_at < p_to
  GROUP BY l.id;
END $$;
REVOKE ALL ON FUNCTION public.utm_link_stats(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.utm_link_stats(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.utm_breakdown(p_from timestamptz, p_to timestamptz, p_dim text)
RETURNS TABLE(label text, clicks bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_dim NOT IN ('device','browser','os','country','referrer_host','page_path','day') THEN RAISE EXCEPTION 'bad dimension'; END IF;
  RETURN QUERY EXECUTE format(
    'SELECT COALESCE(%s, ''unknown'')::text, COUNT(*) FROM public.utm_clicks WHERE clicked_at >= $1 AND clicked_at < $2 GROUP BY 1 ORDER BY %s LIMIT 60',
    CASE WHEN p_dim = 'day' THEN 'to_char(clicked_at AT TIME ZONE ''Asia/Kolkata'', ''YYYY-MM-DD'')' ELSE quote_ident(p_dim) END,
    CASE WHEN p_dim = 'day' THEN '1' ELSE '2 DESC' END)
  USING p_from, p_to;
END $$;
REVOKE ALL ON FUNCTION public.utm_breakdown(timestamptz, timestamptz, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.utm_breakdown(timestamptz, timestamptz, text) TO authenticated;

INSERT INTO public.utm_brands(key, name, utm_source) VALUES
  ('mba_compass', 'MBA Compass', 'mba_compass'),
  ('b_school_buzz', 'B-School Buzz', 'b_school_buzz');
INSERT INTO public.utm_campaigns(key, name, brand_key, default_medium) VALUES
  ('college_application', 'College Application', NULL, 'website'),
  ('college_listing', 'College Listing', NULL, 'website'),
  ('lead_generation', 'Lead Generation', NULL, 'website'),
  ('email', 'Email Campaign', NULL, 'email'),
  ('whatsapp', 'WhatsApp Campaign', NULL, 'whatsapp');
INSERT INTO public.utm_settings(id) VALUES (1);