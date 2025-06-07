-- Migration for Parties Management System
-- Create parties table
CREATE TABLE IF NOT EXISTS public.parties (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    balance DECIMAL(12,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    total_amount_paid DECIMAL(12,2) DEFAULT 0.00,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create party transactions table
CREATE TABLE IF NOT EXISTS public.party_transactions (
    id SERIAL PRIMARY KEY,
    party_id INTEGER REFERENCES public.parties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('payment', 'order', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    balance_after DECIMAL(12,2) NOT NULL,
    reference_order_id INTEGER, -- Can link to job_sheets or quotations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by TEXT DEFAULT 'System'
);

-- Create party orders table (for tracking orders separately)
CREATE TABLE IF NOT EXISTS public.party_orders (
    id SERIAL PRIMARY KEY,
    party_id INTEGER REFERENCES public.parties(id) ON DELETE CASCADE,
    order_amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    job_sheet_id INTEGER, -- Link to job_sheets table
    quotation_id UUID, -- Link to quotation_requests table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key reference to job_sheets table if it exists
DO $$
BEGIN
    -- Add party_id to job_sheets if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_sheets' AND column_name = 'party_id'
    ) THEN
        ALTER TABLE public.job_sheets ADD COLUMN party_id INTEGER REFERENCES public.parties(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON public.party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON public.party_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_party_orders_party_id ON public.party_orders(party_id);
CREATE INDEX IF NOT EXISTS idx_party_orders_status ON public.party_orders(status);

-- Function to update party balance and statistics
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
        ), 0),
        total_orders = COALESCE((
            SELECT COUNT(*) 
            FROM public.party_orders 
            WHERE party_id = party_id_param
        ), 0),
        total_amount_paid = COALESCE((
            SELECT SUM(amount) 
            FROM public.party_transactions 
            WHERE party_id = party_id_param AND type = 'payment'
        ), 0),
        last_transaction_date = (
            SELECT MAX(created_at) 
            FROM public.party_transactions 
            WHERE party_id = party_id_param
        ),
        updated_at = timezone('utc'::text, now())
    WHERE id = party_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update party stats when transactions change
CREATE OR REPLACE FUNCTION trigger_update_party_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_party_stats(OLD.party_id);
        RETURN OLD;
    ELSE
        PERFORM update_party_stats(NEW.party_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS party_transactions_stats_trigger ON public.party_transactions;
CREATE TRIGGER party_transactions_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.party_transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_party_stats();

DROP TRIGGER IF EXISTS party_orders_stats_trigger ON public.party_orders;
CREATE TRIGGER party_orders_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.party_orders
    FOR EACH ROW EXECUTE FUNCTION trigger_update_party_stats();

-- Enable realtime for parties tables
ALTER PUBLICATION supabase_realtime ADD TABLE parties;
ALTER PUBLICATION supabase_realtime ADD TABLE party_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE party_orders;

-- Insert some sample data for testing (optional)
INSERT INTO public.parties (name, phone, email, balance) VALUES 
('ABC Corporation', '+91-9876543210', 'contact@abc.com', 15000.00),
('XYZ Industries', '+91-9876543211', 'info@xyz.com', -5000.00),
('Tech Solutions Pvt Ltd', '+91-9876543212', 'hello@techsol.com', 8500.00)
ON CONFLICT DO NOTHING; 