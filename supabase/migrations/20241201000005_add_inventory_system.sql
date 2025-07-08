-- Migration for Inventory Management System
-- Create inventory_items table for tracking paper stock
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id SERIAL PRIMARY KEY,
    party_id INTEGER REFERENCES public.parties(id) ON DELETE CASCADE,
    paper_type_id INTEGER REFERENCES public.paper_types(id) ON DELETE SET NULL,
    paper_type_name TEXT NOT NULL, -- Cached for performance
    current_quantity INTEGER DEFAULT 0, -- Total sheets in stock
    reserved_quantity INTEGER DEFAULT 0, -- Sheets reserved for orders
    available_quantity INTEGER DEFAULT 0, -- current_quantity - reserved_quantity
    unit_cost DECIMAL(10,2) DEFAULT 0.00, -- Cost per sheet
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(party_id, paper_type_id) -- One record per party-paper combination
);

-- Create inventory_transactions table for tracking stock movements
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    party_id INTEGER REFERENCES public.parties(id) ON DELETE CASCADE,
    paper_type_id INTEGER REFERENCES public.paper_types(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment', 'reserved', 'released')),
    quantity INTEGER NOT NULL, -- Positive for additions, negative for subtractions
    unit_type TEXT NOT NULL CHECK (unit_type IN ('sheets', 'packets', 'gross', 'ream')),
    unit_size INTEGER NOT NULL, -- How many sheets per unit (100-200 for packets, 144 for gross, 500 for ream)
    total_sheets INTEGER NOT NULL, -- Calculated: quantity * unit_size
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(10,2) DEFAULT 0.00, -- Calculated: total_sheets * unit_cost
    description TEXT,
    reference_id INTEGER, -- Can link to job_sheet_id or other references
    balance_after INTEGER NOT NULL, -- Stock balance after this transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by TEXT DEFAULT 'System'
);

-- Create function to update inventory balances
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

-- Trigger to automatically update inventory balances when transactions change
CREATE OR REPLACE FUNCTION trigger_update_inventory_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_inventory_balance(OLD.inventory_item_id);
        RETURN OLD;
    ELSE
        PERFORM update_inventory_balance(NEW.inventory_item_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS inventory_transactions_balance_trigger ON public.inventory_transactions;
CREATE TRIGGER inventory_transactions_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_inventory_balance();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_party_id ON public.inventory_items(party_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_paper_type_id ON public.inventory_items(paper_type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_item_id ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_party_id ON public.inventory_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);

-- Enable realtime for inventory tables
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transactions;

-- Insert some sample data for testing
INSERT INTO public.inventory_items (party_id, paper_type_id, paper_type_name, current_quantity, unit_cost) VALUES 
(1, 1, 'ART PAPER', 5000, 0.50),
(1, 2, 'MATTE PAPER', 3000, 0.60),
(2, 1, 'ART PAPER', 2000, 0.50),
(3, 3, 'GLOSSY PAPER', 1500, 0.80)
ON CONFLICT (party_id, paper_type_id) DO NOTHING; 