-- Quotation requests table
CREATE TABLE IF NOT EXISTS public.quotation_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_phone text,
    company_name text,
    project_title text NOT NULL,
    project_description text,
    
    -- Print specifications
    print_type text NOT NULL,
    paper_type text NOT NULL,
    paper_size text NOT NULL,
    quantity integer NOT NULL,
    pages integer DEFAULT 1,
    color_type text NOT NULL,
    
    -- Finishing options
    binding_type text,
    lamination text,
    folding text,
    cutting text,
    
    -- Pricing and status
    estimated_price decimal(10,2),
    final_price decimal(10,2),
    status text DEFAULT 'pending',
    priority text DEFAULT 'normal',
    
    -- File uploads
    file_urls text[],
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    due_date timestamp with time zone,
    completed_at timestamp with time zone
);

-- Admin users table for simple passcode authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE NOT NULL,
    passcode text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert default admin user
INSERT INTO public.admin_users (username, passcode) 
VALUES ('admin', '12345')
ON CONFLICT (username) DO NOTHING;

-- Quotation notes table for admin comments
CREATE TABLE IF NOT EXISTS public.quotation_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id uuid REFERENCES public.quotation_requests(id) ON DELETE CASCADE,
    note text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable realtime for quotation_requests
alter publication supabase_realtime add table quotation_requests;
alter publication supabase_realtime add table quotation_notes;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status ON public.quotation_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_created_at ON public.quotation_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_client_email ON public.quotation_requests(client_email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_quotation_requests_updated_at ON public.quotation_requests;
CREATE TRIGGER update_quotation_requests_updated_at
    BEFORE UPDATE ON public.quotation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();