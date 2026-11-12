ALTER FUNCTION public.move_to_dlq(text,text,bigint,jsonb) SET search_path = '';
ALTER FUNCTION public.read_email_batch(text,integer,integer) SET search_path = '';
ALTER FUNCTION public.enqueue_email(text,jsonb) SET search_path = '';
ALTER FUNCTION public.delete_email(text,bigint) SET search_path = '';

DROP POLICY IF EXISTS "Anyone can contribute anonymous CAT scores" ON public.cat_score_aggregates;
CREATE POLICY "Anyone can contribute valid anonymous CAT scores" ON public.cat_score_aggregates
FOR INSERT TO anon, authenticated
WITH CHECK (
  slot BETWEEN 1 AND 3
  AND total_score BETWEEN -100 AND 300
  AND varc_score BETWEEN -50 AND 150
  AND dilr_score BETWEEN -50 AND 150
  AND qa_score BETWEEN -50 AND 150
  AND source IN ('manual','response_sheet','link','code','file')
);

DROP POLICY IF EXISTS "Signed-in users can read freebies files" ON storage.objects;
CREATE POLICY "Signed-in users can read published freebies files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'freebies' AND (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.freebies f WHERE f.file_url = storage.objects.name AND f.is_published = true)
  )
);