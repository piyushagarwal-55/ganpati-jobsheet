-- Reset all database tables to empty state
-- This migration truncates all data while preserving table structure
-- Only truncates tables that actually exist

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Function to safely truncate table if it exists
CREATE OR REPLACE FUNCTION safe_truncate_table(tbl_name TEXT)
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', tbl_name);
        RAISE NOTICE 'Truncated table: %', tbl_name;
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping', tbl_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely reset sequence if it exists
CREATE OR REPLACE FUNCTION safe_reset_sequence(tbl_name TEXT, col_name TEXT)
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = tbl_name AND column_name = col_name AND table_schema = 'public') THEN
            EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), 1, false)', tbl_name, col_name);
            RAISE NOTICE 'Reset sequence for: %.%', tbl_name, col_name;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Truncate all tables in dependency order (children first, then parents)
-- This ensures foreign key constraints are not violated

-- Clear workflow and tracking tables first
SELECT safe_truncate_table('workflow_status');

-- Clear inventory related tables
SELECT safe_truncate_table('inventory_transactions');
SELECT safe_truncate_table('inventory_items');

-- Clear party related tables (orders before transactions, transactions before parties)
SELECT safe_truncate_table('party_orders');
SELECT safe_truncate_table('party_transactions');

-- Clear job sheets (depends on parties, machines, inventory)
SELECT safe_truncate_table('job_sheets');

-- Clear machines table
SELECT safe_truncate_table('machines');

-- Clear parties table (after all dependent tables)
SELECT safe_truncate_table('parties');

-- Clear paper types (after inventory tables)
SELECT safe_truncate_table('paper_types');

-- Clear users table (no dependencies) - only if it exists
SELECT safe_truncate_table('users');

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences to start from 1 (only for existing tables)
SELECT safe_reset_sequence('workflow_status', 'id');
SELECT safe_reset_sequence('inventory_transactions', 'id');
SELECT safe_reset_sequence('inventory_items', 'id');
SELECT safe_reset_sequence('party_orders', 'id');
SELECT safe_reset_sequence('party_transactions', 'id');
SELECT safe_reset_sequence('job_sheets', 'id');
SELECT safe_reset_sequence('machines', 'id');
SELECT safe_reset_sequence('parties', 'id');
SELECT safe_reset_sequence('paper_types', 'id');

-- Add some essential paper types back (only if paper_types table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'paper_types' AND table_schema = 'public') THEN
        INSERT INTO public.paper_types (name, description) VALUES 
        ('ART PAPER', 'High-quality coated paper for printing'),
        ('MATTE PAPER', 'Non-glossy finish paper'),
        ('GLOSSY PAPER', 'High-gloss finish paper'),
        ('CARDSTOCK', 'Heavy weight paper for cards'),
        ('OFFSET PAPER', 'Standard offset printing paper'),
        ('BOND PAPER', 'High-quality writing paper'),
        ('COPIER PAPER', 'Standard copy paper'),
        ('FRC', 'Folding box board'),
        ('DUPLEX', 'Two-sided paper'),
        ('SBS', 'Solid bleached sulfate board')
        ON CONFLICT (name) DO NOTHING;
        
        RAISE NOTICE 'Essential paper types restored';
    ELSE
        RAISE NOTICE 'Paper types table does not exist, skipping restoration';
    END IF;
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS safe_truncate_table(TEXT);
DROP FUNCTION IF EXISTS safe_reset_sequence(TEXT, TEXT);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database reset completed successfully!';
    RAISE NOTICE 'All existing tables cleared, sequences reset, and essential data restored.';
END $$; 