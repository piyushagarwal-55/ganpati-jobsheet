-- Migration to add file_url column to job_sheets
ALTER TABLE public.job_sheets
ADD COLUMN IF NOT EXISTS file_url TEXT; 