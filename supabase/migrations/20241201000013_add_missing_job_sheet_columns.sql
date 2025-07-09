-- Add missing columns to job_sheets table for integration system
-- This migration adds columns that are referenced by the integration service

-- Add paper source tracking
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN paper_source VARCHAR(20) DEFAULT 'self-provided' CHECK (paper_source IN ('inventory', 'self-provided'));
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Add inventory item reference
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Add inventory usage tracking
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN used_from_inventory BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Add plate code column
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN plate_code VARCHAR(50);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Add created_at timestamp if it doesn't exist
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Add updated_at timestamp if it doesn't exist
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_sheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_job_sheets_updated_at ON job_sheets;
CREATE TRIGGER trigger_update_job_sheets_updated_at
    BEFORE UPDATE ON job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_job_sheets_updated_at();

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_job_sheets_inventory_item_id ON job_sheets(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_job_sheets_paper_source ON job_sheets(paper_source);
CREATE INDEX IF NOT EXISTS idx_job_sheets_used_from_inventory ON job_sheets(used_from_inventory);
CREATE INDEX IF NOT EXISTS idx_job_sheets_created_at ON job_sheets(created_at);

-- Add comments for documentation
COMMENT ON COLUMN job_sheets.paper_source IS 'Source of paper: inventory or self-provided';
COMMENT ON COLUMN job_sheets.inventory_item_id IS 'Reference to inventory item used for this job';
COMMENT ON COLUMN job_sheets.used_from_inventory IS 'Whether this job consumed inventory items';
COMMENT ON COLUMN job_sheets.plate_code IS 'Plate code for cost calculation';

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
    RAISE NOTICE 'Missing job_sheets columns added successfully!';
END $$; 