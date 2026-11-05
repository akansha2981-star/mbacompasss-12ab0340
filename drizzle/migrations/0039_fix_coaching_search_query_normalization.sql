-- Fix: search_coaching_institutes stripped capital letters from the typed query.
-- regexp_replace ran on the raw query before lower(), so '[^a-z0-9]+' deleted every
-- uppercase letter: 'IMS' -> '', 'TIME' -> '', 'CATKing' -> 'ating'.
-- Aliases are stored lowercased, so capitalized input never matched an alias and the
-- student was pushed into the "add a new institute" path, creating duplicate rows.

CREATE OR REPLACE FUNCTION public.search_coaching_institutes(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE (id uuid, canonical_name text, slug text, matched_alias text, score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH norm AS (SELECT regexp_replace(lower(coalesce(p_query,'')), '[^a-z0-9]+', '', 'g') AS q),
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