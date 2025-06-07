-- ==========================================
-- PARTIES MANAGEMENT SYSTEM SETUP
-- Run this script in your Supabase SQL Editor
-- ==========================================

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

-- Create job_sheets table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS public.job_sheets (
    id SERIAL PRIMARY KEY,
    job_date DATE,
    party_name TEXT,
    party_id INTEGER REFERENCES public.parties(id),
    description TEXT,
    plate INTEGER,
    size TEXT,
    sq_inch DECIMAL(10,2),
    paper_sheet INTEGER,
    imp INTEGER,
    rate DECIMAL(10,2),
    printing DECIMAL(10,2),
    uv DECIMAL(10,2),
    baking DECIMAL(10,2),
    job_type TEXT,
    gsm INTEGER,
    paper_provided_by_party BOOLEAN DEFAULT false,
    paper_type TEXT,
    paper_size TEXT,
    paper_gsm INTEGER,
    paper_type_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create quotation_requests table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS public.quotation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    company_name TEXT,
    project_title TEXT NOT NULL,
    project_description TEXT,
    print_type TEXT NOT NULL,
    paper_type TEXT NOT NULL,
    paper_size TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    pages INTEGER DEFAULT 1,
    color_type TEXT NOT NULL,
    binding_type TEXT,
    lamination TEXT,
    folding TEXT,
    cutting TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    final_price DECIMAL(10,2),
    invoice_number TEXT,
    invoice_date TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add party_id to job_sheets table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_sheets') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_sheets' AND column_name = 'party_id'
        ) THEN
            ALTER TABLE public.job_sheets ADD COLUMN party_id INTEGER REFERENCES public.parties(id);
        END IF;
    END IF;
END $$;

-- Create users table if it doesn't exist (for authentication)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT,
    full_name TEXT,
    email TEXT,
    user_id UUID,
    token_identifier UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON public.party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON public.party_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_party_orders_party_id ON public.party_orders(party_id);
CREATE INDEX IF NOT EXISTS idx_party_orders_status ON public.party_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_sheets_party_id ON public.job_sheets(party_id);
CREATE INDEX IF NOT EXISTS idx_job_sheets_created_at ON public.job_sheets(created_at);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status ON public.quotation_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_created_at ON public.quotation_requests(created_at);

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

-- Insert sample data for testing
INSERT INTO public.parties (name, phone, email, balance) VALUES 
('ABC Corporation', '+91-9876543210', 'contact@abc.com', 15000.00),
('XYZ Industries', '+91-9876543211', 'info@xyz.com', -5000.00),
('Tech Solutions Pvt Ltd', '+91-9876543212', 'hello@techsol.com', 8500.00)
ON CONFLICT DO NOTHING;

-- Add sample transactions for the parties
INSERT INTO public.party_transactions (party_id, type, amount, description, balance_after, created_by) VALUES 
(1, 'payment', 20000.00, 'Initial advance payment', 20000.00, 'System'),
(1, 'order', 5000.00, 'Website development order', 15000.00, 'System'),
(2, 'order', 12000.00, 'Mobile app development', -12000.00, 'System'),
(2, 'payment', 7000.00, 'Partial payment received', -5000.00, 'System'),
(3, 'payment', 15000.00, 'Project advance', 15000.00, 'System'),
(3, 'order', 6500.00, 'E-commerce platform', 8500.00, 'System')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.parties TO authenticated;
GRANT ALL ON public.party_transactions TO authenticated;
GRANT ALL ON public.party_orders TO authenticated;
GRANT ALL ON public.job_sheets TO authenticated;
GRANT ALL ON public.quotation_requests TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your security requirements)
CREATE POLICY "Allow all operations for authenticated users" ON public.parties
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.party_transactions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.party_orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.job_sheets
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.quotation_requests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.users
    FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- SETUP COMPLETE!
-- Your complete job sheet management system with parties is ready.
-- ========================================== 