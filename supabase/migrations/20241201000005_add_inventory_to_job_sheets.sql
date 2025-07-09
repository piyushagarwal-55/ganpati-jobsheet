-- Add inventory tracking columns to job_sheets table
ALTER TABLE job_sheets 
ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id),
ADD COLUMN used_from_inventory BOOLEAN DEFAULT FALSE,
ADD COLUMN paper_source TEXT CHECK (paper_source IN ('inventory', 'self-provided')) DEFAULT 'self-provided';

-- Create index for better performance when querying by inventory item
CREATE INDEX idx_job_sheets_inventory_item_id ON job_sheets(inventory_item_id);

-- Add comment to document the new columns
COMMENT ON COLUMN job_sheets.inventory_item_id IS 'Reference to inventory item used for this job sheet';
COMMENT ON COLUMN job_sheets.used_from_inventory IS 'Whether paper was sourced from inventory system';
COMMENT ON COLUMN job_sheets.paper_source IS 'Source of paper: inventory or self-provided'; 