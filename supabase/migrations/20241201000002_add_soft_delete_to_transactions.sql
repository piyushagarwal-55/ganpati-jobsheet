-- Migration to add soft delete functionality to party_transactions table
-- Add soft delete columns to party_transactions
ALTER TABLE public.party_transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_party_transactions_is_deleted ON public.party_transactions(is_deleted);

-- Update the party stats function to exclude deleted transactions
CREATE OR REPLACE FUNCTION update_party_stats(party_id_param INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.parties 
    SET 
        balance = COALESCE((
            SELECT SUM(
                CASE 
                    WHEN type = 'payment' THEN amount
                    WHEN type = 'order' THEN -amount
                    ELSE amount
                END
            )
            FROM public.party_transactions 
            WHERE party_id = party_id_param 
            AND (is_deleted IS FALSE OR is_deleted IS NULL)
        ), 0),
        total_orders = COALESCE((
            SELECT COUNT(*) 
            FROM public.party_orders 
            WHERE party_id = party_id_param
        ), 0),
        total_amount_paid = COALESCE((
            SELECT SUM(amount) 
            FROM public.party_transactions 
            WHERE party_id = party_id_param 
            AND type = 'payment'
            AND (is_deleted IS FALSE OR is_deleted IS NULL)
        ), 0),
        last_transaction_date = (
            SELECT MAX(created_at) 
            FROM public.party_transactions 
            WHERE party_id = party_id_param
            AND (is_deleted IS FALSE OR is_deleted IS NULL)
        ),
        updated_at = timezone('utc'::text, now())
    WHERE id = party_id_param;
END;
$$ LANGUAGE plpgsql;

-- Refresh all party stats to account for the new soft delete logic
DO $$
DECLARE
    party_record RECORD;
BEGIN
    FOR party_record IN SELECT id FROM public.parties LOOP
        PERFORM update_party_stats(party_record.id);
    END LOOP;
END $$; 