-- Migration to add GSM field to inventory system
-- This enables separate paper type and GSM handling like in job sheet form

-- Add GSM column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS gsm INTEGER;

-- Add GSM column to inventory_transactions table
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS gsm INTEGER;

-- Drop the existing unique constraint on inventory_items
ALTER TABLE public.inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_party_id_paper_type_id_key;

-- Add new unique constraint that includes GSM
ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_party_id_paper_type_id_gsm_key 
UNIQUE (party_id, paper_type_id, gsm);

-- Create index on GSM columns for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_gsm ON public.inventory_items(gsm);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_gsm ON public.inventory_transactions(gsm);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_party_paper_gsm 
ON public.inventory_items(party_id, paper_type_id, gsm);

-- Update the inventory balance update function to handle GSM
CREATE OR REPLACE FUNCTION update_inventory_balance(inventory_item_id_param INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.inventory_items 
    SET 
        current_quantity = COALESCE((
            SELECT SUM(total_sheets)
            FROM public.inventory_transactions 
            WHERE inventory_item_id = inventory_item_id_param
            AND transaction_type IN ('in', 'out', 'adjustment')
        ), 0),
        reserved_quantity = COALESCE((
            SELECT SUM(total_sheets)
            FROM public.inventory_transactions 
            WHERE inventory_item_id = inventory_item_id_param
            AND transaction_type = 'reserved'
        ), 0),
        last_updated = timezone('utc'::text, now())
    WHERE id = inventory_item_id_param;
    
    -- Update available quantity
    UPDATE public.inventory_items 
    SET available_quantity = current_quantity - reserved_quantity
    WHERE id = inventory_item_id_param;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON COLUMN public.inventory_items.gsm IS 'GSM (grams per square meter) of the paper - separate from paper type like in job sheet form';
COMMENT ON COLUMN public.inventory_transactions.gsm IS 'GSM (grams per square meter) of the paper for this transaction';

-- Note: Existing data will have NULL GSM values, which is fine for backward compatibility
-- New inventory items will require GSM to be specified 