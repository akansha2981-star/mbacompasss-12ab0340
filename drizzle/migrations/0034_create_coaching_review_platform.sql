
-- Coaching review & rating platform tables

CREATE TABLE public.coaching_review_institutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  normalized_name text NOT NULL,
  description text,
  parent_institute_id uuid REFERENCES public.coaching_review_institutes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','hidden')),
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','student','ai')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX coaching_review_institutes_normalized_uidx ON public.coaching_review_institutes (normalized_name) WHERE parent_institute_id IS NULL;
CREATE INDEX coaching_review_institutes_name_trgm ON public.coaching_review_institutes USING gin (canonical_name gin_trgm_ops);
CREATE INDEX coaching_review_institutes_status_idx ON public.coaching_review_institutes (status);

GRANT SELECT ON public.coaching_review_institutes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_review_institutes TO authenticated;
GRANT ALL ON public.coaching_review_institutes TO service_role;
ALTER TABLE public.coaching_review_institutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active coaching review institutes"
  ON public.coaching_review_institutes FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Anyone can suggest a pending institute"
  ON public.coaching_review_institutes FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND source IN ('student','ai') AND parent_institute_id IS NULL);
CREATE POLICY "Admins manage coaching review institutes"
  ON public.coaching_review_institutes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.coaching_review_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.coaching_review_institutes(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  normalized_alias text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_review_aliases_institute_idx ON public.coaching_review_aliases (institute_id);
CREATE INDEX coaching_review_aliases_trgm ON public.coaching_review_aliases USING gin (alias_name gin_trgm_ops);

GRANT SELECT ON public.coaching_review_aliases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_review_aliases TO authenticated;
GRANT ALL ON public.coaching_review_aliases TO service_role;
ALTER TABLE public.coaching_review_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read aliases of active institutes"
  ON public.coaching_review_aliases FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.coaching_review_institutes i WHERE i.id = institute_id AND i.status = 'active'));
CREATE POLICY "Admins manage coaching review aliases"
  ON public.coaching_review_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.coaching_student_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  student_email text NOT NULL,
  institute_id uuid NOT NULL REFERENCES public.coaching_review_institutes(id) ON DELETE CASCADE,
  original_institute_input text,
  exam_category text CHECK (exam_category IN ('CAT','XAT','NMAT','SNAP','Other')),
  preparation_year text,
  class_mode text CHECK (class_mode IN ('Online','Offline','Hybrid')),
  teaching_quality smallint NOT NULL CHECK (teaching_quality BETWEEN 1 AND 10),
  live_classes smallint NOT NULL CHECK (live_classes BETWEEN 1 AND 10),
  recorded_lectures smallint NOT NULL CHECK (recorded_lectures BETWEEN 1 AND 10),
  study_material smallint NOT NULL CHECK (study_material BETWEEN 1 AND 10),
  mock_tests smallint NOT NULL CHECK (mock_tests BETWEEN 1 AND 10),
  doubt_solving smallint NOT NULL CHECK (doubt_solving BETWEEN 1 AND 10),
  student_support smallint NOT NULL CHECK (student_support BETWEEN 1 AND 10),
  mentorship smallint NOT NULL CHECK (mentorship BETWEEN 1 AND 10),
  value_for_money smallint NOT NULL CHECK (value_for_money BETWEEN 1 AND 10),
  overall_experience smallint NOT NULL CHECK (overall_experience BETWEEN 1 AND 10),
  average_rating numeric(3,1) NOT NULL,
  review_comment text NOT NULL,
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','flagged')),
  flag_reasons text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_student_reviews_institute_idx ON public.coaching_student_reviews (institute_id);
CREATE INDEX coaching_student_reviews_email_idx ON public.coaching_student_reviews (student_email);
CREATE INDEX coaching_student_reviews_created_idx ON public.coaching_student_reviews (created_at DESC);
CREATE INDEX coaching_student_reviews_status_idx ON public.coaching_student_reviews (moderation_status);

GRANT INSERT ON public.coaching_student_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_student_reviews TO authenticated;
GRANT ALL ON public.coaching_student_reviews TO service_role;
ALTER TABLE public.coaching_student_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a review for moderation"
  ON public.coaching_student_reviews FOR INSERT TO anon, authenticated
  WITH CHECK (
    moderation_status IN ('pending','flagged')
    AND student_name IS NOT NULL AND length(student_name) BETWEEN 2 AND 100
    AND student_email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' AND length(student_email) <= 255
    AND length(review_comment) BETWEEN 30 AND 2000
    AND average_rating BETWEEN 1 AND 10
  );
CREATE POLICY "Admins manage coaching student reviews"
  ON public.coaching_student_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public safe view: never exposes student_email
CREATE VIEW public.coaching_public_reviews WITH (security_invoker = false) AS
SELECT r.id, r.institute_id, r.student_name, r.exam_category, r.preparation_year, r.class_mode,
       r.teaching_quality, r.live_classes, r.recorded_lectures, r.study_material, r.mock_tests,
       r.doubt_solving, r.student_support, r.mentorship, r.value_for_money, r.overall_experience,
       r.average_rating, r.review_comment, r.created_at
FROM public.coaching_student_reviews r
WHERE r.moderation_status = 'approved';
GRANT SELECT ON public.coaching_public_reviews TO anon, authenticated;

CREATE TABLE public.coaching_review_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.coaching_student_reviews(id) ON DELETE SET NULL,
  admin_id uuid,
  action text NOT NULL,
  previous_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_review_audit_logs_review_idx ON public.coaching_review_audit_logs (review_id);

GRANT SELECT, INSERT ON public.coaching_review_audit_logs TO authenticated;
GRANT ALL ON public.coaching_review_audit_logs TO service_role;
ALTER TABLE public.coaching_review_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read and write review audit logs"
  ON public.coaching_review_audit_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Aggregate stats for public report pages (approved reviews only)
CREATE OR REPLACE FUNCTION public.coaching_institute_stats(p_institute_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_reviews', count(*),
    'overall_rating', round(avg(average_rating), 1),
    'last_review_at', max(created_at),
    'parameters', jsonb_build_object(
      'teaching_quality', round(avg(teaching_quality), 1),
      'live_classes', round(avg(live_classes), 1),
      'recorded_lectures', round(avg(recorded_lectures), 1),
      'study_material', round(avg(study_material), 1),
      'mock_tests', round(avg(mock_tests), 1),
      'doubt_solving', round(avg(doubt_solving), 1),
      'student_support', round(avg(student_support), 1),
      'mentorship', round(avg(mentorship), 1),
      'value_for_money', round(avg(value_for_money), 1),
      'overall_experience', round(avg(overall_experience), 1)
    ),
    'distribution', jsonb_build_object(
      '1-2', count(*) FILTER (WHERE average_rating <= 2),
      '3-4', count(*) FILTER (WHERE average_rating > 2 AND average_rating <= 4),
      '5-6', count(*) FILTER (WHERE average_rating > 4 AND average_rating <= 6),
      '7-8', count(*) FILTER (WHERE average_rating > 6 AND average_rating <= 8),
      '9-10', count(*) FILTER (WHERE average_rating > 8)
    )
  )
  FROM public.coaching_student_reviews
  WHERE institute_id = p_institute_id AND moderation_status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.coaching_institute_stats(uuid) TO anon, authenticated;

-- Fuzzy + alias search over active institutes
CREATE OR REPLACE FUNCTION public.search_coaching_institutes(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE (id uuid, canonical_name text, slug text, matched_alias text, score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH norm AS (SELECT lower(regexp_replace(coalesce(p_query,''), '[^a-z0-9]+', '', 'g')) AS q),
  exact AS (
    SELECT i.id, i.canonical_name, i.slug, a.alias_name AS matched_alias, 1.0::real AS score
    FROM public.coaching_review_aliases a
    JOIN public.coaching_review_institutes i ON i.id = a.institute_id, norm
    WHERE i.status = 'active' AND a.normalized_alias = norm.q
  ),
  fuzzy AS (
    SELECT i.id, i.canonical_name, i.slug, NULL::text AS matched_alias,
           greatest(similarity(i.canonical_name, p_query), similarity(i.normalized_name, (SELECT q FROM norm))) AS score
    FROM public.coaching_review_institutes i
    WHERE i.status = 'active'
      AND (i.canonical_name % p_query OR i.normalized_name % (SELECT q FROM norm)
           OR i.canonical_name ILIKE '%' || p_query || '%')
  )
  SELECT DISTINCT ON (id) * FROM (
    SELECT * FROM exact UNION ALL SELECT * FROM fuzzy
  ) s
  ORDER BY id, score DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.search_coaching_institutes(text, int) TO anon, authenticated;
