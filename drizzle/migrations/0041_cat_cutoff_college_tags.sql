ALTER TABLE public.cat_cutoff_colleges ADD COLUMN cutoff_tags TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.cat_cutoff_colleges SET cutoff_tags = ARRAY[cutoff_band] WHERE cardinality(cutoff_tags) = 0;
CREATE INDEX idx_cat_cutoff_colleges_tags ON public.cat_cutoff_colleges USING GIN (cutoff_tags);
COMMENT ON COLUMN public.cat_cutoff_colleges.cutoff_band IS 'Primary filter; cutoff_tags holds all filters the college appears under';