-- Migration to add soft delete functionality to job_sheets table
-- This allows marking job sheets as deleted while preserving them for audit purposes

-- Add soft delete columns to job_sheets table
ALTER TABLE public.job_sheets 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance when filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_job_sheets_is_deleted ON public.job_sheets(is_deleted) WHERE is_deleted = false;

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_sheets_updated_at 
    BEFORE UPDATE ON public.job_sheets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add missing columns for party information and job type that are referenced in the code
ALTER TABLE public.job_sheets 
ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS job_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS gsm INTEGER,
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.job_sheets.is_deleted IS 'Soft delete flag - true means record is logically deleted';
COMMENT ON COLUMN public.job_sheets.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN public.job_sheets.deletion_reason IS 'Reason provided for deletion';
COMMENT ON COLUMN public.job_sheets.deleted_by IS 'User who performed the deletion'; 