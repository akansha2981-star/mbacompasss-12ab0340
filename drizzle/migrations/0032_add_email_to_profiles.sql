ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, phone, signup_page_url, signup_page_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'signup_page_url',
    new.raw_user_meta_data->>'signup_page_name'
  );
  RETURN new;
END;
$$;