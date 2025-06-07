-- Add invoice-related fields to quotation_requests table
ALTER TABLE public.quotation_requests 
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS invoice_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS gst_number text,
ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount decimal(10,2);

-- Create invoices table for detailed invoice management
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id uuid REFERENCES public.quotation_requests(id) ON DELETE CASCADE,
    invoice_number text UNIQUE NOT NULL,
    invoice_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
    due_date timestamp with time zone,
    subtotal decimal(10,2) NOT NULL,
    discount_amount decimal(10,2) DEFAULT 0,
    tax_rate decimal(5,2) DEFAULT 18.00,
    tax_amount decimal(10,2) NOT NULL,
    total_amount decimal(10,2) NOT NULL,
    payment_status text DEFAULT 'pending',
    payment_method text,
    payment_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable realtime for invoices
alter publication supabase_realtime add table invoices;

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);

-- Add trigger for invoices updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
    next_number integer;
    invoice_num text;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'GO-INV-(\d+)') AS integer)), 0) + 1
    INTO next_number
    FROM public.invoices
    WHERE invoice_number ~ '^GO-INV-\d+$';
    
    invoice_num := 'GO-INV-' || LPAD(next_number::text, 6, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;