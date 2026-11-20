ALTER TABLE public.meritto_lead_logs ADD COLUMN IF NOT EXISTS client text NOT NULL DEFAULT 'gim';
ALTER TABLE public.meritto_bulk_jobs ADD COLUMN IF NOT EXISTS client text NOT NULL DEFAULT 'gim';
ALTER TABLE public.meritto_lead_logs DROP CONSTRAINT IF EXISTS meritto_lead_logs_client_check;
ALTER TABLE public.meritto_lead_logs ADD CONSTRAINT meritto_lead_logs_client_check CHECK (client IN ('gim','abbs'));
ALTER TABLE public.meritto_bulk_jobs DROP CONSTRAINT IF EXISTS meritto_bulk_jobs_client_check;
ALTER TABLE public.meritto_bulk_jobs ADD CONSTRAINT meritto_bulk_jobs_client_check CHECK (client IN ('gim','abbs'));
CREATE INDEX IF NOT EXISTS idx_meritto_lead_logs_client_created ON public.meritto_lead_logs(client, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meritto_bulk_jobs_client_created ON public.meritto_bulk_jobs(client, created_at DESC);