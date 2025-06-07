-- Database Migration for Party Transactions
-- Run this in your Supabase SQL Editor to fix the schema

-- First, check if table exists and drop if it has wrong schema
DO $$
BEGIN
    -- Check if the table exists and has wrong schema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'party_transactions') THEN
        -- Check if the 'type' column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'party_transactions' AND column_name = 'type'
        ) THEN
            -- Drop and recreate table if schema is wrong
            DROP TABLE IF EXISTS public.party_transactions CASCADE;
        END IF;
    END IF;
END $$;

-- Create the party_transactions table with correct schema
CREATE TABLE IF NOT EXISTS public.party_transactions (
    id SERIAL PRIMARY KEY,
    party_id INTEGER REFERENCES public.parties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('payment', 'order', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    balance_after DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON public.party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON public.party_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_party_transactions_type ON public.party_transactions(type);

-- Enable RLS (Row Level Security)
ALTER TABLE public.party_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.party_transactions
    FOR ALL USING (true);

-- Function to update party balance and statistics
CREATE OR REPLACE FUNCTION update_party_balance_from_transactions(party_id_param INTEGER)
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
        ), 0),
        updated_at = timezone('utc'::text, now())
    WHERE id = party_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update party balance when transactions change
CREATE OR REPLACE FUNCTION trigger_update_party_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_party_balance_from_transactions(OLD.party_id);
        RETURN OLD;
    ELSE
        PERFORM update_party_balance_from_transactions(NEW.party_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update party balance
DROP TRIGGER IF EXISTS party_transactions_balance_trigger ON public.party_transactions;
CREATE TRIGGER party_transactions_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.party_transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_party_balance();

-- Insert some sample data if the table is empty
INSERT INTO public.party_transactions (party_id, type, amount, description, balance_after)
SELECT 
    p.id as party_id,
    CASE 
        WHEN p.balance > 0 THEN 'payment'
        WHEN p.balance < 0 THEN 'order'
        ELSE 'adjustment'
    END as type,
    ABS(p.balance) as amount,
    CASE 
        WHEN p.balance > 0 THEN 'Initial advance payment'
        WHEN p.balance < 0 THEN 'Initial outstanding amount'
        ELSE 'Initial balance'
    END as description,
    p.balance as balance_after
FROM public.parties p
WHERE p.balance != 0 
AND NOT EXISTS (SELECT 1 FROM public.party_transactions WHERE party_id = p.id)
ON CONFLICT DO NOTHING; 