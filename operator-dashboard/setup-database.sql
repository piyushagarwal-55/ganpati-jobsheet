-- Operator Dashboard Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create operator_notifications table
CREATE TABLE IF NOT EXISTS operator_notifications (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    job_sheet_id BIGINT REFERENCES job_sheets(id),
    machine_id BIGINT REFERENCES machines(id) NOT NULL,
    operator_name TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_queue table for automated emails
CREATE TABLE IF NOT EXISTS email_queue (
    id BIGSERIAL PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    email_type TEXT NOT NULL, -- 'finance', 'stock', 'portal'
    reference_id BIGINT, -- job_sheet_id, transaction_id, etc.
    reference_type TEXT, -- 'job_sheet', 'transaction', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_operator_notifications_machine_id ON operator_notifications(machine_id);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_read ON operator_notifications(read);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_created_at ON operator_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON email_queue(scheduled_for);

-- Function to create operator notification
CREATE OR REPLACE FUNCTION create_operator_notification(
    p_type TEXT,
    p_machine_id BIGINT,
    p_title TEXT,
    p_message TEXT,
    p_job_sheet_id BIGINT DEFAULT NULL,
    p_data JSONB DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    notification_id BIGINT;
BEGIN
    INSERT INTO operator_notifications (
        type, machine_id, title, message, job_sheet_id, data
    ) VALUES (
        p_type, p_machine_id, p_title, p_message, p_job_sheet_id, p_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to queue email
CREATE OR REPLACE FUNCTION queue_email(
    p_to_email TEXT,
    p_subject TEXT,
    p_html_content TEXT,
    p_email_type TEXT,
    p_reference_id BIGINT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    email_id BIGINT;
BEGIN
    INSERT INTO email_queue (
        to_email, subject, html_content, email_type, reference_id, reference_type
    ) VALUES (
        p_to_email, p_subject, p_html_content, p_email_type, p_reference_id, p_reference_type
    ) RETURNING id INTO email_id;
    
    RETURN email_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for job sheet changes
CREATE OR REPLACE FUNCTION notify_job_status_change() RETURNS TRIGGER AS $$
DECLARE
    machine_name TEXT;
    notification_title TEXT;
    notification_message TEXT;
    email_subject TEXT;
    email_html TEXT;
BEGIN
    -- Get machine name
    SELECT name INTO machine_name FROM machines WHERE id = NEW.machine_id;
    
    -- Create notification for operator
    IF NEW.job_status != OLD.job_status THEN
        notification_title := 'Job Status Updated';
        notification_message := format('Job #%s status changed from %s to %s', NEW.id, OLD.job_status, NEW.job_status);
        
        PERFORM create_operator_notification(
            'job_status_change',
            NEW.machine_id,
            notification_title,
            notification_message,
            NEW.id,
            jsonb_build_object('old_status', OLD.job_status, 'new_status', NEW.job_status)
        );
        
        -- Queue email to portal
        email_subject := format('Job #%s Status Update', NEW.id);
        email_html := format(
            '<h2>Job Status Update</h2><p><strong>Job ID:</strong> #%s</p><p><strong>Description:</strong> %s</p><p><strong>Party:</strong> %s</p><p><strong>Machine:</strong> %s</p><p><strong>Status:</strong> %s → %s</p><p><strong>Time:</strong> %s</p>',
            NEW.id, NEW.description, NEW.party_name, machine_name, OLD.job_status, NEW.job_status, NOW()
        );
        
        PERFORM queue_email(
            'portal@ganpathioverseas.com',
            email_subject,
            email_html,
            'portal',
            NEW.id,
            'job_sheet'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for party balance changes
CREATE OR REPLACE FUNCTION notify_balance_change() RETURNS TRIGGER AS $$
DECLARE
    email_subject TEXT;
    email_html TEXT;
BEGIN
    IF NEW.balance != OLD.balance THEN
        email_subject := format('Balance Update: %s', NEW.name);
        email_html := format(
            '<h2>Party Balance Update</h2><p><strong>Party:</strong> %s</p><p><strong>Previous Balance:</strong> ₹%s</p><p><strong>New Balance:</strong> ₹%s</p><p><strong>Change:</strong> ₹%s</p><p><strong>Time:</strong> %s</p>',
            NEW.name, OLD.balance, NEW.balance, (NEW.balance - OLD.balance), NOW()
        );
        
        PERFORM queue_email(
            'finance@ganpathioverseas.com',
            email_subject,
            email_html,
            'finance',
            NEW.id,
            'party_balance'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for inventory changes
CREATE OR REPLACE FUNCTION notify_inventory_change() RETURNS TRIGGER AS $$
DECLARE
    email_subject TEXT;
    email_html TEXT;
BEGIN
    IF NEW.current_quantity != OLD.current_quantity THEN
        email_subject := format('Inventory Update: %s', NEW.paper_type_name);
        email_html := format(
            '<h2>Inventory Update</h2><p><strong>Paper Type:</strong> %s</p><p><strong>GSM:</strong> %s</p><p><strong>Previous Quantity:</strong> %s</p><p><strong>New Quantity:</strong> %s</p><p><strong>Change:</strong> %s</p><p><strong>Time:</strong> %s</p>',
            NEW.paper_type_name, COALESCE(NEW.gsm, 0), OLD.current_quantity, NEW.current_quantity, (NEW.current_quantity - OLD.current_quantity), NOW()
        );
        
        PERFORM queue_email(
            'stock@ganpathioverseas.com',
            email_subject,
            email_html,
            'stock',
            NEW.id,
            'inventory_items'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_job_status_change ON job_sheets;
CREATE TRIGGER trigger_job_status_change
    AFTER UPDATE ON job_sheets
    FOR EACH ROW
    WHEN (NEW.job_status IS DISTINCT FROM OLD.job_status)
    EXECUTE FUNCTION notify_job_status_change();

DROP TRIGGER IF EXISTS trigger_balance_change ON parties;
CREATE TRIGGER trigger_balance_change
    AFTER UPDATE ON parties
    FOR EACH ROW
    WHEN (NEW.balance IS DISTINCT FROM OLD.balance)
    EXECUTE FUNCTION notify_balance_change();

DROP TRIGGER IF EXISTS trigger_inventory_change ON inventory_items;
CREATE TRIGGER trigger_inventory_change
    AFTER UPDATE ON inventory_items
    FOR EACH ROW
    WHEN (NEW.current_quantity IS DISTINCT FROM OLD.current_quantity)
    EXECUTE FUNCTION notify_inventory_change();

-- Enable RLS (Row Level Security) for the new tables
ALTER TABLE operator_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for operator_notifications
CREATE POLICY "Enable read access for all users" ON operator_notifications FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON operator_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON operator_notifications FOR UPDATE USING (true);

-- Create RLS policies for email_queue
CREATE POLICY "Enable read access for all users" ON email_queue FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON email_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON email_queue FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON operator_notifications TO anon, authenticated;
GRANT ALL ON email_queue TO anon, authenticated;
GRANT USAGE ON SEQUENCE operator_notifications_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE email_queue_id_seq TO anon, authenticated; 