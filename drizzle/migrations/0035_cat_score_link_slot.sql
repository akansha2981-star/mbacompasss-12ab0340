ALTER TABLE public.cat_score_submissions
  ADD COLUMN IF NOT EXISTS response_sheet_url text,
  ADD COLUMN IF NOT EXISTS slot text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;