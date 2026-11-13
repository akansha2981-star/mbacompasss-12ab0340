CREATE TABLE public.freebie_file_access (
  user_id uuid NOT NULL,
  freebie_id uuid NOT NULL REFERENCES public.freebies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, freebie_id)
);
GRANT SELECT, INSERT ON public.freebie_file_access TO authenticated;
GRANT ALL ON public.freebie_file_access TO service_role;
ALTER TABLE public.freebie_file_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own freebie access" ON public.freebie_file_access FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users request their own published freebie access" ON public.freebie_file_access FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.freebies f WHERE f.id = freebie_id AND f.is_published = true));
COMMENT ON TABLE public.freebie_file_access IS 'Per-user access claims for published free resource downloads; does not grant access to unpublished or unrelated storage objects.';
DROP POLICY IF EXISTS "Signed-in users can read published freebies files" ON storage.objects;
CREATE POLICY "Users read their authorized published freebie files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'freebies' AND (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.freebie_file_access a
    JOIN public.freebies f ON f.id = a.freebie_id
    WHERE a.user_id = (SELECT auth.uid())
      AND f.is_published = true
      AND f.file_url = storage.objects.name
  )
));