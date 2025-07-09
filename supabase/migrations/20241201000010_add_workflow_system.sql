-- Add workflow status tracking
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
CREATE INDEX idx_workflow_status_job_sheet_id ON workflow_status(job_sheet_id);
CREATE INDEX idx_workflow_status_status ON workflow_status(status);
CREATE INDEX idx_workflow_status_machine_id ON workflow_status(machine_id);

-- Add job status column to job_sheets if it doesn't exist
ALTER TABLE job_sheets 
ADD COLUMN IF NOT EXISTS job_status VARCHAR(20) DEFAULT 'created' CHECK (job_status IN ('created', 'assigned', 'in_progress', 'completed', 'cancelled'));

-- Add assignment tracking columns to job_sheets if they don't exist
ALTER TABLE job_sheets 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS operator_notes TEXT;

-- Create trigger to automatically update workflow_status when job_sheets changes
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
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job_sheets updates
DROP TRIGGER IF EXISTS trigger_update_workflow_status ON job_sheets;
CREATE TRIGGER trigger_update_workflow_status
  AFTER INSERT OR UPDATE ON job_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_status();

-- Add machine availability tracking
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS last_assigned TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_job_count INTEGER DEFAULT 0;

-- Create function to update machine availability based on job assignments
CREATE OR REPLACE FUNCTION update_machine_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update machine availability when jobs are assigned/completed
  IF TG_OP = 'INSERT' AND NEW.machine_id IS NOT NULL THEN
    -- Job assigned to machine
    UPDATE machines 
    SET current_job_count = current_job_count + 1,
        last_assigned = NOW(),
        is_available = (current_job_count + 1 < max_concurrent_jobs OR max_concurrent_jobs IS NULL)
    WHERE id = NEW.machine_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.machine_id IS DISTINCT FROM NEW.machine_id THEN
    -- Job reassigned
    IF OLD.machine_id IS NOT NULL THEN
      UPDATE machines 
      SET current_job_count = GREATEST(current_job_count - 1, 0)
      WHERE id = OLD.machine_id;
    END IF;
    
    IF NEW.machine_id IS NOT NULL THEN
      UPDATE machines 
      SET current_job_count = current_job_count + 1,
          last_assigned = NOW()
      WHERE id = NEW.machine_id;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.job_status != NEW.job_status AND NEW.job_status IN ('completed', 'cancelled') THEN
    -- Job completed or cancelled
    IF NEW.machine_id IS NOT NULL THEN
      UPDATE machines 
      SET current_job_count = GREATEST(current_job_count - 1, 0),
          is_available = TRUE
      WHERE id = NEW.machine_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.machine_id IS NOT NULL THEN
    -- Job deleted
    UPDATE machines 
    SET current_job_count = GREATEST(current_job_count - 1, 0)
    WHERE id = OLD.machine_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for machine availability updates
DROP TRIGGER IF EXISTS trigger_update_machine_availability ON job_sheets;
CREATE TRIGGER trigger_update_machine_availability
  AFTER INSERT OR UPDATE OR DELETE ON job_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_machine_availability();

-- Add max_concurrent_jobs column to machines if it doesn't exist
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS max_concurrent_jobs INTEGER DEFAULT 1;

-- Initialize current job counts for existing machines
UPDATE machines 
SET current_job_count = (
  SELECT COUNT(*) 
  FROM job_sheets 
  WHERE machine_id = machines.id 
  AND job_status IN ('assigned', 'in_progress')
);

-- Update machine availability based on current job counts
UPDATE machines
SET is_available = (current_job_count < COALESCE(max_concurrent_jobs, 1))
WHERE status = 'active';

-- Create view for comprehensive job tracking
CREATE OR REPLACE VIEW job_workflow_view AS
SELECT 
  js.id,
  js.job_date,
  js.party_name,
  js.description,
  js.job_status,
  js.machine_id,
  m.name as machine_name,
  m.operator_name,
  js.assigned_at,
  js.started_at,
  js.completed_at,
  js.paper_sheet,
  js.used_from_inventory,
  js.inventory_item_id,
  ii.paper_type_name,
  ii.gsm,
  ws.inventory_consumed,
  ws.party_balance_updated,
  ws.created_at as workflow_created_at,
  ws.updated_at as workflow_updated_at,
  (js.printing + COALESCE(js.uv, 0) + COALESCE(js.baking, 0)) as total_cost
FROM job_sheets js
LEFT JOIN machines m ON js.machine_id = m.id
LEFT JOIN inventory_items ii ON js.inventory_item_id = ii.id
LEFT JOIN workflow_status ws ON js.id = ws.job_sheet_id;

-- Create function to get workflow statistics
CREATE OR REPLACE FUNCTION get_workflow_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_jobs', (SELECT COUNT(*) FROM job_sheets),
    'jobs_by_status', (
      SELECT json_object_agg(job_status, count)
      FROM (
        SELECT COALESCE(job_status, 'created') as job_status, COUNT(*) as count
        FROM job_sheets 
        GROUP BY job_status
      ) s
    ),
    'machine_utilization', (
      SELECT json_object_agg(name, utilization)
      FROM (
        SELECT 
          m.name,
          CASE 
            WHEN m.max_concurrent_jobs > 0 THEN 
              ROUND((m.current_job_count::DECIMAL / m.max_concurrent_jobs) * 100, 2)
            ELSE 0
          END as utilization
        FROM machines m
        WHERE m.status = 'active'
      ) mu
    ),
    'inventory_consumption_today', (
      SELECT COALESCE(SUM(ABS(total_sheets)), 0)
      FROM inventory_transactions 
      WHERE transaction_type = 'out' 
      AND created_at >= CURRENT_DATE
    ),
    'active_machines', (
      SELECT COUNT(*) 
      FROM machines 
      WHERE status = 'active' AND is_available = TRUE
    ),
    'busy_machines', (
      SELECT COUNT(*) 
      FROM machines 
      WHERE status = 'active' AND is_available = FALSE
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE workflow_status IS 'Tracks the workflow status of job sheets across all integrated systems';
COMMENT ON COLUMN workflow_status.inventory_consumed IS 'Whether this job consumed inventory items';
COMMENT ON COLUMN workflow_status.party_balance_updated IS 'Whether party balance was updated for this job';
COMMENT ON VIEW job_workflow_view IS 'Comprehensive view of job workflow with all related information';
COMMENT ON FUNCTION get_workflow_stats() IS 'Returns JSON with workflow statistics for dashboard';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON workflow_status TO service_role;
GRANT SELECT ON job_workflow_view TO service_role;
GRANT EXECUTE ON FUNCTION get_workflow_stats() TO service_role; 