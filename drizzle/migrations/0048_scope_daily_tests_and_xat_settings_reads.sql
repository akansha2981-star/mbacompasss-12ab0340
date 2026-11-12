DROP POLICY IF EXISTS "Signed-in users view daily assignments" ON public.daily_test_assignments;
CREATE POLICY "Admins view all daily assignments" ON public.daily_test_assignments
FOR SELECT TO authenticated
USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Students view current daily assignments" ON public.daily_test_assignments
FOR SELECT TO authenticated
USING (assigned_date BETWEEN (current_date - 60) AND (current_date + 60));

DROP POLICY IF EXISTS "Anyone can read XAT calculator settings" ON public.xat_calculator_settings;
CREATE POLICY "Anyone can read published XAT calculator settings" ON public.xat_calculator_settings
FOR SELECT TO anon, authenticated
USING (id = 'default');
CREATE POLICY "Admins read all XAT calculator settings" ON public.xat_calculator_settings
FOR SELECT TO authenticated
USING (public.has_role((select auth.uid()), 'admin'::public.app_role));