-- Migration to add UV coating calculation options to job_sheets table
-- This allows UV coating cost to be calculated per 100 sq. inches or per sheet

-- Add UV coating calculation fields
ALTER TABLE public.job_sheets 
ADD COLUMN IF NOT EXISTS uv_coating_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS uv_coating_method VARCHAR(20) DEFAULT 'manual' CHECK (uv_coating_method IN ('manual', 'per_100_sqin', 'per_sheet')),
ADD COLUMN IF NOT EXISTS uv_rate_per_100_sqin DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS uv_rate_per_sheet DECIMAL(10,2) DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_sheets_uv_coating_enabled ON public.job_sheets(uv_coating_enabled);
CREATE INDEX IF NOT EXISTS idx_job_sheets_uv_coating_method ON public.job_sheets(uv_coating_method);

-- Add comments for documentation
COMMENT ON COLUMN public.job_sheets.uv_coating_enabled IS 'Whether UV coating calculation is enabled for this job';
COMMENT ON COLUMN public.job_sheets.uv_coating_method IS 'Method for UV coating calculation: manual, per_100_sqin, or per_sheet';
COMMENT ON COLUMN public.job_sheets.uv_rate_per_100_sqin IS 'UV coating rate per 100 square inches';
COMMENT ON COLUMN public.job_sheets.uv_rate_per_sheet IS 'UV coating rate per sheet';

-- Grant permissions if service_role exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT SELECT, INSERT, UPDATE ON job_sheets TO service_role;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not grant permissions: %', SQLERRM;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'UV coating calculation fields added successfully to job_sheets table!';
END $$; 