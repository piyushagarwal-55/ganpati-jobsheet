-- Reset all database tables to empty state
-- This migration truncates all data while preserving table structure

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Truncate all tables in dependency order (children first, then parents)
-- This ensures foreign key constraints are not violated

-- Clear workflow and tracking tables first
TRUNCATE TABLE workflow_status RESTART IDENTITY CASCADE;

-- Clear inventory related tables
TRUNCATE TABLE inventory_transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE inventory_items RESTART IDENTITY CASCADE;

-- Clear party related tables (orders before transactions, transactions before parties)
TRUNCATE TABLE party_orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE party_transactions RESTART IDENTITY CASCADE;

-- Clear job sheets (depends on parties, machines, inventory)
TRUNCATE TABLE job_sheets RESTART IDENTITY CASCADE;

-- Clear machines table
TRUNCATE TABLE machines RESTART IDENTITY CASCADE;

-- Clear parties table (after all dependent tables)
TRUNCATE TABLE parties RESTART IDENTITY CASCADE;

-- Clear paper types (after inventory tables)
TRUNCATE TABLE paper_types RESTART IDENTITY CASCADE;

-- Clear users table (no dependencies)
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences to start from 1
SELECT setval(pg_get_serial_sequence('workflow_status', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('inventory_transactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('inventory_items', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('party_orders', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('party_transactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('job_sheets', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('machines', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('parties', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('paper_types', 'id'), 1, false);

-- Add some essential paper types back (required for system to function)
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
('SBS', 'Solid bleached sulfate board');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All tables have been reset successfully!';
    RAISE NOTICE 'All data cleared, sequences reset, and essential paper types restored.';
END $$; 