-- Migration to remove cost-related columns from inventory system
-- Remove cost columns from inventory_items table
ALTER TABLE public.inventory_items DROP COLUMN IF EXISTS unit_cost;

-- Remove cost columns from inventory_transactions table  
ALTER TABLE public.inventory_transactions DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE public.inventory_transactions DROP COLUMN IF EXISTS total_cost;

-- Update any existing sample data to remove cost references
-- (This is safe as we already updated the API to not use these columns)

-- Comment for documentation
COMMENT ON TABLE public.inventory_items IS 'Inventory items table without cost tracking - focuses on quantity management only';
COMMENT ON TABLE public.inventory_transactions IS 'Inventory transactions table without cost tracking - focuses on quantity movements only'; 