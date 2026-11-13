-- lovable-cron-fallback-reviewed: per-minute worker armed only while a bulk upload is running or paused for the daily limit; unschedules itself when the queue drains
CREATE TABLE public.meritto_bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text,
  origin_domain text,
  total int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  resume_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE public.meritto_bulk_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.meritto_bulk_jobs(id) ON DELETE CASCADE,
  row_no int NOT NULL,
  lead jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  http_status int,
  log_id uuid,
  locked_at timestamptz,
  processed_at timestamptz
);
CREATE INDEX idx_meritto_bulk_items_job_status ON public.meritto_bulk_items(job_id, status, row_no);
CREATE TABLE public.meritto_bulk_worker (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex')
);
INSERT INTO public.meritto_bulk_worker (id) VALUES (true) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meritto_bulk_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meritto_bulk_items TO authenticated;
GRANT ALL ON public.meritto_bulk_jobs, public.meritto_bulk_items, public.meritto_bulk_worker TO service_role;

ALTER TABLE public.meritto_bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meritto_bulk_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meritto_bulk_worker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meritto bulk jobs" ON public.meritto_bulk_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage meritto bulk items" ON public.meritto_bulk_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_meritto_bulk_jobs_updated_at BEFORE UPDATE ON public.meritto_bulk_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.meritto_bulk_claim(p_job uuid, p_limit int)
RETURNS SETOF public.meritto_bulk_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.meritto_bulk_items SET status = 'pending', locked_at = NULL
   WHERE job_id = p_job AND status = 'processing' AND locked_at < now() - interval '5 minutes';
  RETURN QUERY
  UPDATE public.meritto_bulk_items i SET status = 'processing', locked_at = now()
   WHERE i.id IN (SELECT id FROM public.meritto_bulk_items
                   WHERE job_id = p_job AND status = 'pending'
                   ORDER BY row_no LIMIT p_limit FOR UPDATE SKIP LOCKED)
  RETURNING i.*;
END $$;
REVOKE ALL ON FUNCTION public.meritto_bulk_claim(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meritto_bulk_claim(uuid, int) TO service_role;

CREATE OR REPLACE FUNCTION public.meritto_bulk_job_counts(p_job uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    coalesce(jsonb_object_agg(status, n), '{}'::jsonb) END
  FROM (SELECT status, count(*) n FROM public.meritto_bulk_items WHERE job_id = p_job GROUP BY status) s
$$;
GRANT EXECUTE ON FUNCTION public.meritto_bulk_job_counts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.meritto_bulk_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_token text;
BEGIN
  UPDATE public.meritto_bulk_jobs SET status = 'running', resume_at = NULL, last_error = NULL
   WHERE status = 'paused_limit' AND resume_at <= now();
  IF NOT EXISTS (SELECT 1 FROM public.meritto_bulk_jobs WHERE status IN ('running','paused_limit')) THEN
    PERFORM cron.unschedule('meritto-bulk-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meritto-bulk-tick');
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meritto_bulk_jobs WHERE status = 'running') THEN
    SELECT token INTO v_token FROM public.meritto_bulk_worker WHERE id;
    PERFORM net.http_post(
      url := 'https://mttoiqruzzxooveooldo.supabase.co/functions/v1/push-to-meritto',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('bulk_tick', true, 'token', v_token),
      timeout_milliseconds := 60000);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.meritto_bulk_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meritto_bulk_tick() TO service_role;

CREATE OR REPLACE FUNCTION public.meritto_bulk_arm()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meritto-bulk-tick') THEN
    PERFORM cron.schedule('meritto-bulk-tick', '* * * * *', $c$ SELECT public.meritto_bulk_tick(); $c$);
  END IF;
  PERFORM public.meritto_bulk_tick();
END $$;
REVOKE ALL ON FUNCTION public.meritto_bulk_arm() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meritto_bulk_arm() TO authenticated;