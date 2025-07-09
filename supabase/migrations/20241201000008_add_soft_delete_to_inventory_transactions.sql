-- Migration to add soft delete functionality to inventory_transactions table
-- This allows marking inventory transactions as deleted while preserving them for audit purposes

-- Add soft delete columns to inventory_transactions table
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Create index for better performance when filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_is_deleted ON public.inventory_transactions(is_deleted) WHERE is_deleted = false;

-- Update the inventory balance update function to exclude deleted transactions
CREATE OR REPLACE FUNCTION update_inventory_balance(inventory_item_id_param INTEGER)
RETURNS void AS $$
DECLARE
    total_balance INTEGER;
BEGIN
    -- Calculate the balance from all non-deleted transactions
    SELECT COALESCE(SUM(total_sheets), 0)
    INTO total_balance
    FROM public.inventory_transactions
    WHERE inventory_item_id = inventory_item_id_param
    AND (is_deleted IS FALSE OR is_deleted IS NULL);
    
    -- Update the inventory item with new balances
    UPDATE public.inventory_items
    SET 
        current_quantity = total_balance,
        available_quantity = total_balance - COALESCE(reserved_quantity, 0),
        last_updated = timezone('utc'::text, now())
    WHERE id = inventory_item_id_param;
END;
$$ LANGUAGE plpgsql;

-- Refresh all inventory balances to account for the new soft delete logic
DO $$
DECLARE
    item_record RECORD;
BEGIN
    FOR item_record IN SELECT id FROM public.inventory_items LOOP
        PERFORM update_inventory_balance(item_record.id);
    END LOOP;
END $$;

-- Comment for documentation
COMMENT ON COLUMN public.inventory_transactions.is_deleted IS 'Soft delete flag - true means transaction is logically deleted';
COMMENT ON COLUMN public.inventory_transactions.deleted_at IS 'Timestamp when transaction was soft deleted';
COMMENT ON COLUMN public.inventory_transactions.deletion_reason IS 'Reason provided for deletion';
COMMENT ON COLUMN public.inventory_transactions.deleted_by IS 'User who performed the deletion'; 