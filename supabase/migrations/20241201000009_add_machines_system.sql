-- Migration for Machine Management System
-- Create machines table for managing printing machines
CREATE TABLE IF NOT EXISTS public.machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL, -- e.g., "offset", "digital", "flexo"
    description TEXT,
    color_capacity INTEGER DEFAULT 1, -- Number of colors the machine can print
    max_sheet_size VARCHAR(50), -- e.g., "A4", "A3", "Custom"
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline')),
    operator_name VARCHAR(255), -- Current assigned operator
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add machine assignment to job_sheets table
ALTER TABLE public.job_sheets 
ADD COLUMN IF NOT EXISTS machine_id INTEGER REFERENCES public.machines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS job_status VARCHAR(50) DEFAULT 'pending' CHECK (job_status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS operator_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_is_available ON public.machines(is_available);
CREATE INDEX IF NOT EXISTS idx_job_sheets_machine_id ON public.job_sheets(machine_id);
CREATE INDEX IF NOT EXISTS idx_job_sheets_job_status ON public.job_sheets(job_status);
CREATE INDEX IF NOT EXISTS idx_job_sheets_assigned_at ON public.job_sheets(assigned_at);

-- Insert default machines
INSERT INTO public.machines (name, type, description, color_capacity, max_sheet_size, operator_name) VALUES
('4 Color Offset', 'offset', '4 Color Offset Printing Machine', 4, 'A1', 'Operator 1'),
('5 Color Offset', 'offset', '5 Color Offset Printing Machine', 5, 'A0', 'Operator 2')
ON CONFLICT (name) DO NOTHING;

-- Create function to update machine availability based on assigned jobs
CREATE OR REPLACE FUNCTION update_machine_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Update machine availability based on active jobs
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Check if machine has any active jobs
        UPDATE public.machines 
        SET 
            is_available = NOT EXISTS (
                SELECT 1 FROM public.job_sheets 
                WHERE machine_id = NEW.machine_id 
                AND job_status IN ('assigned', 'in_progress')
            ),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.machine_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Update machine availability when job is deleted
        UPDATE public.machines 
        SET 
            is_available = NOT EXISTS (
                SELECT 1 FROM public.job_sheets 
                WHERE machine_id = OLD.machine_id 
                AND job_status IN ('assigned', 'in_progress')
            ),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.machine_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update machine availability
CREATE TRIGGER trigger_update_machine_availability
    AFTER INSERT OR UPDATE OR DELETE ON public.job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_machine_availability();

-- Create function to get machine statistics
CREATE OR REPLACE FUNCTION get_machine_stats(machine_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_jobs', COALESCE(COUNT(*), 0),
        'pending_jobs', COALESCE(SUM(CASE WHEN job_status = 'pending' THEN 1 ELSE 0 END), 0),
        'assigned_jobs', COALESCE(SUM(CASE WHEN job_status = 'assigned' THEN 1 ELSE 0 END), 0),
        'in_progress_jobs', COALESCE(SUM(CASE WHEN job_status = 'in_progress' THEN 1 ELSE 0 END), 0),
        'completed_jobs', COALESCE(SUM(CASE WHEN job_status = 'completed' THEN 1 ELSE 0 END), 0),
        'cancelled_jobs', COALESCE(SUM(CASE WHEN job_status = 'cancelled' THEN 1 ELSE 0 END), 0)
    ) INTO stats
    FROM public.job_sheets 
    WHERE machine_id = machine_id_param;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Add auto-update trigger for machines table
CREATE TRIGGER update_machines_updated_at 
    BEFORE UPDATE ON public.machines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.machines IS 'Printing machines available for job assignment';
COMMENT ON COLUMN public.machines.color_capacity IS 'Maximum number of colors this machine can print';
COMMENT ON COLUMN public.machines.max_sheet_size IS 'Maximum sheet size this machine can handle';
COMMENT ON COLUMN public.machines.status IS 'Current operational status of the machine';
COMMENT ON COLUMN public.machines.is_available IS 'Whether machine is available for new job assignments';

COMMENT ON COLUMN public.job_sheets.machine_id IS 'Assigned printing machine for this job';
COMMENT ON COLUMN public.job_sheets.assigned_at IS 'When the job was assigned to a machine';
COMMENT ON COLUMN public.job_sheets.started_at IS 'When work on the job actually started';
COMMENT ON COLUMN public.job_sheets.completed_at IS 'When the job was completed';
COMMENT ON COLUMN public.job_sheets.job_status IS 'Current status of the job in the production workflow';
COMMENT ON COLUMN public.job_sheets.operator_notes IS 'Notes from the machine operator'; 