CREATE OR REPLACE FUNCTION public.utm_breakdown(p_from timestamp with time zone, p_to timestamp with time zone, p_dim text)
 RETURNS TABLE(label text, clicks bigint)
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_dim NOT IN ('device','browser','os','country','referrer_host','page_path','day') THEN RAISE EXCEPTION 'bad dimension'; END IF;

  IF p_dim = 'day' THEN
    RETURN QUERY
      SELECT COALESCE(to_char(c.clicked_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD'), 'unknown')::text, COUNT(*)
      FROM public.utm_clicks c
      WHERE c.clicked_at >= p_from AND c.clicked_at < p_to
      GROUP BY 1 ORDER BY 1 LIMIT 60;
  ELSE
    RETURN QUERY
      SELECT COALESCE(
               CASE p_dim
                 WHEN 'device' THEN c.device::text
                 WHEN 'browser' THEN c.browser::text
                 WHEN 'os' THEN c.os::text
                 WHEN 'country' THEN c.country::text
                 WHEN 'referrer_host' THEN c.referrer_host::text
                 WHEN 'page_path' THEN c.page_path::text
               END, 'unknown')::text AS lbl,
             COUNT(*) AS cnt
      FROM public.utm_clicks c
      WHERE c.clicked_at >= p_from AND c.clicked_at < p_to
      GROUP BY 1 ORDER BY 2 DESC LIMIT 60;
  END IF;
END $function$;

REVOKE EXECUTE ON FUNCTION public.utm_breakdown(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.utm_breakdown(timestamptz, timestamptz, text) TO authenticated, service_role;