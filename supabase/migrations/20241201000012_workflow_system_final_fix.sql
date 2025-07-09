-- Final fix for workflow system migration
-- Handles data type conflicts by properly managing view dependencies

-- First, drop any existing views that might conflict
DROP VIEW IF EXISTS job_workflow_view CASCADE;

-- Drop existing functions that might reference old column types
DROP FUNCTION IF EXISTS get_workflow_stats() CASCADE;

-- Drop existing triggers to avoid conflicts during schema changes
DROP TRIGGER IF EXISTS trigger_update_workflow_status ON job_sheets;
DROP TRIGGER IF EXISTS trigger_update_machine_availability ON job_sheets;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_workflow_status() CASCADE;
DROP FUNCTION IF EXISTS update_machine_availability() CASCADE;

-- Add workflow status tracking table
CREATE TABLE IF NOT EXISTS workflow_status (
  id SERIAL PRIMARY KEY,
  job_sheet_id INTEGER REFERENCES job_sheets(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'assigned', 'in_progress', 'completed', 'cancelled')),
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  inventory_consumed BOOLEAN DEFAULT FALSE,
  party_balance_updated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one workflow status per job sheet
  UNIQUE(job_sheet_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_status_job_sheet_id ON workflow_status(job_sheet_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status_status ON workflow_status(status);
CREATE INDEX IF NOT EXISTS idx_workflow_status_machine_id ON workflow_status(machine_id);

-- Now safely modify job_sheets table
-- First, check if job_status column exists and what type it is
DO $$ 
DECLARE
    col_exists BOOLEAN;
    col_type TEXT;
BEGIN 
    -- Check if column exists and get its type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_sheets' AND column_name = 'job_status'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Get current column type
        SELECT data_type || CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
        END
        FROM information_schema.columns 
        WHERE table_name = 'job_sheets' AND column_name = 'job_status'
        INTO col_type;
        
        -- If it's not the type we want, alter it
        IF col_type != 'character varying(20)' THEN
            EXECUTE 'ALTER TABLE job_sheets ALTER COLUMN job_status TYPE VARCHAR(20)';
            -- Add constraint if it doesn't exist
            BEGIN
                ALTER TABLE job_sheets ADD CONSTRAINT job_sheets_job_status_check 
                CHECK (job_status IN ('created', 'assigned', 'in_progress', 'completed', 'cancelled'));
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END;
        END IF;
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE job_sheets ADD COLUMN job_status VARCHAR(20) DEFAULT 'created' 
        CHECK (job_status IN ('created', 'assigned', 'in_progress', 'completed', 'cancelled'));
    END IF;
END $$;

-- Add other tracking columns if they don't exist
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN assigned_at TIMESTAMPTZ;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN started_at TIMESTAMPTZ;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN completed_at TIMESTAMPTZ;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE job_sheets ADD COLUMN operator_notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Handle machines table modifications if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'machines') THEN
        -- Add machine availability tracking columns
        BEGIN
            ALTER TABLE machines ADD COLUMN last_assigned TIMESTAMPTZ;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE machines ADD COLUMN current_job_count INTEGER DEFAULT 0;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
            ALTER TABLE machines ADD COLUMN max_concurrent_jobs INTEGER DEFAULT 1;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;
    END IF;
END $$;

-- Now create the functions with proper error handling
CREATE OR REPLACE FUNCTION update_workflow_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update workflow status
    INSERT INTO workflow_status (
        job_sheet_id, 
        status, 
        machine_id, 
        inventory_consumed, 
        party_balance_updated,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.job_status, 'created'),
        NEW.machine_id,
        COALESCE(NEW.used_from_inventory, FALSE),
        CASE WHEN NEW.party_id IS NOT NULL THEN TRUE ELSE FALSE END,
        NOW()
    )
    ON CONFLICT (job_sheet_id) 
    DO UPDATE SET
        status = COALESCE(NEW.job_status, 'created'),
        machine_id = NEW.machine_id,
        updated_at = NOW();
        
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the main operation
        RAISE WARNING 'Failed to update workflow status: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_machine_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if machines table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'machines') THEN
        BEGIN
            -- Update machine availability when jobs are assigned/completed
            IF TG_OP = 'INSERT' AND NEW.machine_id IS NOT NULL THEN
                -- Job assigned to machine
                UPDATE machines 
                SET current_job_count = COALESCE(current_job_count, 0) + 1,
                    last_assigned = NOW()
                WHERE id = NEW.machine_id;
                
                -- Update availability based on capacity
                UPDATE machines 
                SET is_available = (COALESCE(current_job_count, 0) < COALESCE(max_concurrent_jobs, 1))
                WHERE id = NEW.machine_id;
                
            ELSIF TG_OP = 'UPDATE' AND OLD.machine_id IS DISTINCT FROM NEW.machine_id THEN
                -- Job reassigned
                IF OLD.machine_id IS NOT NULL THEN
                    UPDATE machines 
                    SET current_job_count = GREATEST(COALESCE(current_job_count, 0) - 1, 0)
                    WHERE id = OLD.machine_id;
                    
                    UPDATE machines 
                    SET is_available = (COALESCE(current_job_count, 0) < COALESCE(max_concurrent_jobs, 1))
                    WHERE id = OLD.machine_id;
                END IF;
                
                IF NEW.machine_id IS NOT NULL THEN
                    UPDATE machines 
                    SET current_job_count = COALESCE(current_job_count, 0) + 1,
                        last_assigned = NOW()
                    WHERE id = NEW.machine_id;
                    
                    UPDATE machines 
                    SET is_available = (COALESCE(current_job_count, 0) < COALESCE(max_concurrent_jobs, 1))
                    WHERE id = NEW.machine_id;
                END IF;
                
            ELSIF TG_OP = 'UPDATE' AND OLD.job_status IS DISTINCT FROM NEW.job_status AND NEW.job_status IN ('completed', 'cancelled') THEN
                -- Job completed or cancelled
                IF NEW.machine_id IS NOT NULL THEN
                    UPDATE machines 
                    SET current_job_count = GREATEST(COALESCE(current_job_count, 0) - 1, 0),
                        is_available = TRUE
                    WHERE id = NEW.machine_id;
                END IF;
                
            ELSIF TG_OP = 'DELETE' AND OLD.machine_id IS NOT NULL THEN
                -- Job deleted
                UPDATE machines 
                SET current_job_count = GREATEST(COALESCE(current_job_count, 0) - 1, 0)
                WHERE id = OLD.machine_id;
                
                UPDATE machines 
                SET is_available = (COALESCE(current_job_count, 0) < COALESCE(max_concurrent_jobs, 1))
                WHERE id = OLD.machine_id;
            END IF;
        EXCEPTION
            WHEN others THEN
                -- Log error but don't fail the main operation
                RAISE WARNING 'Failed to update machine availability: %', SQLERRM;
        END;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_workflow_status
    AFTER INSERT OR UPDATE ON job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_status();

CREATE TRIGGER trigger_update_machine_availability
    AFTER INSERT OR UPDATE OR DELETE ON job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_machine_availability();

-- Initialize machine data if machines table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'machines') THEN
        -- Safely initialize current job counts
        UPDATE machines 
        SET current_job_count = COALESCE((
            SELECT COUNT(*) 
            FROM job_sheets 
            WHERE machine_id = machines.id 
            AND COALESCE(job_status, 'created') IN ('assigned', 'in_progress')
        ), 0)
        WHERE current_job_count IS NULL OR current_job_count != COALESCE((
            SELECT COUNT(*) 
            FROM job_sheets 
            WHERE machine_id = machines.id 
            AND COALESCE(job_status, 'created') IN ('assigned', 'in_progress')
        ), 0);

        -- Update machine availability
        UPDATE machines
        SET is_available = (COALESCE(current_job_count, 0) < COALESCE(max_concurrent_jobs, 1))
        WHERE status = 'active';
    END IF;
END $$;

-- Now create the view with proper column types
CREATE OR REPLACE VIEW job_workflow_view AS
SELECT 
    js.id,
    js.job_date,
    COALESCE(js.party_name, '') as party_name,
    COALESCE(js.description, '') as description,
    COALESCE(js.job_status, 'created') as job_status,
    js.machine_id,
    COALESCE(m.name, '') as machine_name,
    COALESCE(m.operator_name, '') as operator_name,
    js.assigned_at,
    js.started_at,
    js.completed_at,
    COALESCE(js.paper_sheet, 0) as paper_sheet,
    COALESCE(js.used_from_inventory, FALSE) as used_from_inventory,
    js.inventory_item_id,
    COALESCE(ii.paper_type_name, '') as paper_type_name,
    ii.gsm,
    COALESCE(ws.inventory_consumed, FALSE) as inventory_consumed,
    COALESCE(ws.party_balance_updated, FALSE) as party_balance_updated,
    ws.created_at as workflow_created_at,
    ws.updated_at as workflow_updated_at,
    (COALESCE(js.printing, 0) + COALESCE(js.uv, 0) + COALESCE(js.baking, 0)) as total_cost
FROM job_sheets js
LEFT JOIN machines m ON js.machine_id = m.id
LEFT JOIN inventory_items ii ON js.inventory_item_id = ii.id
LEFT JOIN workflow_status ws ON js.id = ws.job_sheet_id;

-- Create statistics function
CREATE OR REPLACE FUNCTION get_workflow_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    has_machines BOOLEAN;
    has_inventory BOOLEAN;
BEGIN
    -- Check what tables exist
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'machines') INTO has_machines;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_transactions') INTO has_inventory;
    
    -- Build stats object conditionally
    SELECT json_build_object(
        'total_jobs', (SELECT COUNT(*) FROM job_sheets),
        'jobs_by_status', (
            SELECT COALESCE(json_object_agg(job_status, count), '{}')
            FROM (
                SELECT COALESCE(job_status, 'created') as job_status, COUNT(*) as count
                FROM job_sheets 
                GROUP BY COALESCE(job_status, 'created')
            ) s
        ),
        'machine_utilization', CASE 
            WHEN has_machines THEN (
                SELECT COALESCE(json_object_agg(name, utilization), '{}')
                FROM (
                    SELECT 
                        m.name,
                        CASE 
                            WHEN COALESCE(m.max_concurrent_jobs, 1) > 0 THEN 
                                ROUND((COALESCE(m.current_job_count, 0)::DECIMAL / COALESCE(m.max_concurrent_jobs, 1)) * 100, 2)
                            ELSE 0
                        END as utilization
                    FROM machines m
                    WHERE COALESCE(m.status, 'active') = 'active'
                ) mu
            )
            ELSE '{}'
        END,
        'inventory_consumption_today', CASE 
            WHEN has_inventory THEN (
                SELECT COALESCE(SUM(ABS(total_sheets)), 0)
                FROM inventory_transactions 
                WHERE transaction_type = 'out' 
                AND created_at >= CURRENT_DATE
            )
            ELSE 0
        END,
        'active_machines', CASE 
            WHEN has_machines THEN (
                SELECT COUNT(*) 
                FROM machines 
                WHERE COALESCE(status, 'active') = 'active' 
                AND COALESCE(is_available, TRUE) = TRUE
            )
            ELSE 0
        END,
        'busy_machines', CASE 
            WHEN has_machines THEN (
                SELECT COUNT(*) 
                FROM machines 
                WHERE COALESCE(status, 'active') = 'active' 
                AND COALESCE(is_available, TRUE) = FALSE
            )
            ELSE 0
        END
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        -- Return basic stats if anything fails
        RETURN json_build_object(
            'total_jobs', (SELECT COUNT(*) FROM job_sheets),
            'jobs_by_status', '{}',
            'machine_utilization', '{}',
            'inventory_consumption_today', 0,
            'active_machines', 0,
            'busy_machines', 0,
            'error', 'Error getting full stats: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE workflow_status IS 'Tracks the workflow status of job sheets across all integrated systems';
COMMENT ON COLUMN workflow_status.inventory_consumed IS 'Whether this job consumed inventory items';
COMMENT ON COLUMN workflow_status.party_balance_updated IS 'Whether party balance was updated for this job';
COMMENT ON VIEW job_workflow_view IS 'Comprehensive view of job workflow with all related information';
COMMENT ON FUNCTION get_workflow_stats() IS 'Returns JSON with workflow statistics for dashboard';

-- Grant permissions safely
DO $$
BEGIN
    -- Grant permissions only if service_role exists
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT SELECT, INSERT, UPDATE ON workflow_status TO service_role;
        GRANT SELECT ON job_workflow_view TO service_role;
        GRANT EXECUTE ON FUNCTION get_workflow_stats() TO service_role;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not grant permissions: %', SQLERRM;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Workflow system migration completed successfully!';
END $$; 