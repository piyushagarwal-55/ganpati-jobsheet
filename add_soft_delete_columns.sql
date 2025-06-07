-- Add soft delete columns to job_sheets table
ALTER TABLE job_sheets 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Create index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_job_sheets_is_deleted ON job_sheets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_job_sheets_deleted_at ON job_sheets(deleted_at);

-- Add soft delete columns to party_transactions table if it exists
ALTER TABLE party_transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Create index for better performance on soft delete queries for transactions
CREATE INDEX IF NOT EXISTS idx_party_transactions_is_deleted ON party_transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_party_transactions_deleted_at ON party_transactions(deleted_at); 