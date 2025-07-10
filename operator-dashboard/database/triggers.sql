-- Database triggers for Ganpati Overseas Operator Dashboard
-- These triggers will automatically send email notifications to specific addresses

-- ======================================================================
-- OPERATOR NOTIFICATIONS TABLE (if not exists)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.operator_notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    job_sheet_id INTEGER REFERENCES public.job_sheets(id) ON DELETE CASCADE,
    machine_id INTEGER REFERENCES public.machines(id) ON DELETE CASCADE,
    operator_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add operator contact fields to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS operator_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS operator_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "browser": true, "sms": false}';

-- ======================================================================
-- EMAIL NOTIFICATION QUEUE TABLE
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.email_notification_queue (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    notification_type VARCHAR(50) NOT NULL,
    related_job_id INTEGER,
    related_machine_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operator_notifications_machine_id ON public.operator_notifications(machine_id);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_read ON public.operator_notifications(read);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_created_at ON public.operator_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_notification_queue(created_at);

-- ======================================================================
-- TRIGGER FUNCTIONS
-- ======================================================================

-- Function to queue email notifications
CREATE OR REPLACE FUNCTION queue_email_notification(
    p_to_email VARCHAR(255),
    p_subject VARCHAR(500),
    p_html_content TEXT,
    p_text_content TEXT,
    p_notification_type VARCHAR(50),
    p_job_id INTEGER DEFAULT NULL,
    p_machine_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    notification_id INTEGER;
BEGIN
    INSERT INTO public.email_notification_queue (
        to_email, subject, html_content, text_content, 
        notification_type, related_job_id, related_machine_id
    )
    VALUES (
        p_to_email, p_subject, p_html_content, p_text_content,
        p_notification_type, p_job_id, p_machine_id
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create operator notification
CREATE OR REPLACE FUNCTION create_operator_notification(
    p_type VARCHAR(50),
    p_job_id INTEGER,
    p_machine_id INTEGER,
    p_title VARCHAR(255),
    p_message TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    notification_id INTEGER;
    operator_name_val VARCHAR(255);
BEGIN
    -- Get operator name from machine
    SELECT m.operator_name INTO operator_name_val
    FROM public.machines m
    WHERE m.id = p_machine_id;
    
    -- Insert notification
    INSERT INTO public.operator_notifications (
        type, job_sheet_id, machine_id, operator_name, title, message, data
    )
    VALUES (
        p_type, p_job_id, p_machine_id, operator_name_val, p_title, p_message, p_data
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- JOB STATUS CHANGE TRIGGER
-- ======================================================================

CREATE OR REPLACE FUNCTION trigger_job_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    machine_record RECORD;
    html_content TEXT;
    text_content TEXT;
    email_subject VARCHAR(500);
    notification_data JSONB;
BEGIN
    -- Only process if job_status has changed or job is assigned to machine
    IF (TG_OP = 'UPDATE' AND NEW.job_status IS DISTINCT FROM OLD.job_status) OR
       (TG_OP = 'UPDATE' AND NEW.machine_id IS DISTINCT FROM OLD.machine_id AND NEW.machine_id IS NOT NULL) OR
       (TG_OP = 'INSERT' AND NEW.machine_id IS NOT NULL) THEN
        
        -- Get machine details
        SELECT m.id, m.name, m.operator_name, m.operator_email
        INTO machine_record
        FROM public.machines m
        WHERE m.id = NEW.machine_id;
        
        IF machine_record.id IS NOT NULL THEN
            -- Prepare notification data
            notification_data := json_build_object(
                'job_id', NEW.id,
                'job_description', NEW.description,
                'party_name', NEW.party_name,
                'machine_name', machine_record.name,
                'operator_name', machine_record.operator_name,
                'job_status', NEW.job_status,
                'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.job_status ELSE 'new' END
            );
            
            -- Create HTML email content
            html_content := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2>📋 Job Update Notification</h2>
                    <p>Job status has been updated</p>
                </div>
                <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px;">
                    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                        <h3>Job #' || NEW.id || ' - ' || COALESCE(NEW.description, 'No description') || '</h3>
                        <p><strong>Status:</strong> ' || NEW.job_status || '</p>
                        <p><strong>Client:</strong> ' || COALESCE(NEW.party_name, 'Unknown') || '</p>
                        <p><strong>Machine:</strong> ' || machine_record.name || '</p>
                        <p><strong>Operator:</strong> ' || COALESCE(machine_record.operator_name, 'Unknown') || '</p>
                        <p><strong>Time:</strong> ' || NOW() || '</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                    <p><strong>Ganpati Overseas</strong> - Operations Portal</p>
                </div>
            </div>';
            
            text_content := 'Job Update: Job #' || NEW.id || ' - ' || COALESCE(NEW.description, 'No description') || 
                          '. Status: ' || NEW.job_status || '. Machine: ' || machine_record.name || 
                          '. Operator: ' || COALESCE(machine_record.operator_name, 'Unknown');
            
            email_subject := '📋 Job Update - ' || COALESCE(NEW.description, 'Job #' || NEW.id) || ' (' || NEW.job_status || ')';
            
            -- Queue email to portal@ganpathioverseas.com
            PERFORM queue_email_notification(
                'portal@ganpathioverseas.com',
                email_subject,
                html_content,
                text_content,
                'job_status',
                NEW.id,
                machine_record.id
            );
            
            -- Create operator notification
            PERFORM create_operator_notification(
                'job_status_change',
                NEW.id,
                machine_record.id,
                'Job Status Updated',
                'Job #' || NEW.id || ' status changed to ' || NEW.job_status,
                notification_data
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- PARTY BALANCE UPDATE TRIGGER
-- ======================================================================

CREATE OR REPLACE FUNCTION trigger_balance_notification()
RETURNS TRIGGER AS $$
DECLARE
    html_content TEXT;
    text_content TEXT;
    email_subject VARCHAR(500);
    balance_change DECIMAL(12,2);
BEGIN
    -- Only process if balance has changed
    IF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
        balance_change := NEW.balance - OLD.balance;
        
        -- Create HTML email content
        html_content := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2>💰 Balance Update Alert</h2>
                <p>Party balance has been updated</p>
            </div>
            <div style="background: #fffbeb; padding: 20px; border-radius: 0 0 8px 8px;">
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                    <h3>' || NEW.name || '</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 24px; font-weight: bold; color: #92400e;">₹' || NEW.balance || '</div>
                        <p style="color: #6b7280;">Current Balance</p>
                        <p style="color: ' || CASE WHEN balance_change > 0 THEN '#10b981' ELSE '#ef4444' END || ';">
                            Change: ' || CASE WHEN balance_change > 0 THEN '+' ELSE '' END || '₹' || balance_change || '
                        </p>
                    </div>
                    <p><strong>Party:</strong> ' || NEW.name || '</p>
                    <p><strong>Phone:</strong> ' || COALESCE(NEW.phone, 'Not provided') || '</p>
                    <p><strong>Email:</strong> ' || COALESCE(NEW.email, 'Not provided') || '</p>
                    <p><strong>Update Time:</strong> ' || NOW() || '</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                <p><strong>Ganpati Overseas</strong> - Finance Department</p>
            </div>
        </div>';
        
        text_content := 'Balance Update: ' || NEW.name || ' - New balance: ₹' || NEW.balance || 
                       '. Change: ' || CASE WHEN balance_change > 0 THEN '+' ELSE '' END || '₹' || balance_change;
        
        email_subject := '💰 Balance Update - ' || NEW.name || ' (₹' || NEW.balance || ')';
        
        -- Queue email to finance@ganpathioverseas.com
        PERFORM queue_email_notification(
            'finance@ganpathioverseas.com',
            email_subject,
            html_content,
            text_content,
            'balance',
            NULL,
            NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- INVENTORY STOCK UPDATE TRIGGER
-- ======================================================================

CREATE OR REPLACE FUNCTION trigger_stock_notification()
RETURNS TRIGGER AS $$
DECLARE
    html_content TEXT;
    text_content TEXT;
    email_subject VARCHAR(500);
    is_low_stock BOOLEAN;
    stock_change INTEGER;
BEGIN
    -- Only process if available_quantity has changed
    IF TG_OP = 'UPDATE' AND NEW.available_quantity IS DISTINCT FROM OLD.available_quantity THEN
        is_low_stock := NEW.available_quantity < 100;
        stock_change := NEW.available_quantity - OLD.available_quantity;
        
        -- Create HTML email content
        html_content := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2>📦 Stock Update Alert</h2>
                <p>Inventory levels have been updated</p>
            </div>
            <div style="background: #faf5ff; padding: 20px; border-radius: 0 0 8px 8px;">
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ' || 
                    CASE WHEN is_low_stock THEN '#ef4444' ELSE '#8b5cf6' END || ';">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>' || COALESCE(NEW.paper_type_name, 'Unknown Item') || '</h3>
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: ' ||
                            CASE WHEN is_low_stock THEN '#ef4444' ELSE '#8b5cf6' END || ';">' ||
                            CASE WHEN is_low_stock THEN 'LOW STOCK' ELSE 'STOCK UPDATE' END || '</span>
                    </div>
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 24px; font-weight: bold; color: ' || 
                            CASE WHEN is_low_stock THEN '#dc2626' ELSE '#7c3aed' END || ';">' || NEW.available_quantity || ' units</div>
                        <p style="color: #6b7280;">Available Stock</p>
                        <p style="color: ' || CASE WHEN stock_change > 0 THEN '#10b981' ELSE '#ef4444' END || ';">
                            Change: ' || CASE WHEN stock_change > 0 THEN '+' ELSE '' END || stock_change || ' units
                        </p>
                    </div>
                    <p><strong>Item:</strong> ' || COALESCE(NEW.paper_type_name, 'Unknown') || '</p>
                    <p><strong>GSM:</strong> ' || COALESCE(NEW.gsm::text, 'N/A') || '</p>
                    <p><strong>Total Quantity:</strong> ' || COALESCE(NEW.current_quantity, 0) || ' units</p>
                    <p><strong>Update Time:</strong> ' || NOW() || '</p>' ||
                    CASE WHEN is_low_stock THEN 
                        '<div style="background: #fef2f2; padding: 10px; border-radius: 4px; border-left: 3px solid #ef4444; margin: 15px 0;">
                            <strong style="color: #dc2626;">⚠️ Low Stock Alert:</strong> This item is running low and may need restocking soon.
                        </div>'
                    ELSE '' END || '
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                <p><strong>Ganpati Overseas</strong> - Stock Management</p>
            </div>
        </div>';
        
        text_content := 'Stock Update: ' || COALESCE(NEW.paper_type_name, 'Unknown Item') || ' - ' || NEW.available_quantity || ' units available. ' ||
                       'Change: ' || CASE WHEN stock_change > 0 THEN '+' ELSE '' END || stock_change || ' units. ' ||
                       CASE WHEN is_low_stock THEN 'LOW STOCK ALERT!' ELSE '' END;
        
        email_subject := '📦 ' || CASE WHEN is_low_stock THEN 'LOW STOCK ALERT' ELSE 'Stock Update' END || 
                        ' - ' || COALESCE(NEW.paper_type_name, 'Inventory') || ' (' || NEW.available_quantity || ' units)';
        
        -- Queue email to stock@ganpathioverseas.com
        PERFORM queue_email_notification(
            'stock@ganpathioverseas.com',
            email_subject,
            html_content,
            text_content,
            'stock',
            NULL,
            NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- CREATE TRIGGERS
-- ======================================================================

-- Job status change trigger
DROP TRIGGER IF EXISTS trigger_job_status_notification ON public.job_sheets;
CREATE TRIGGER trigger_job_status_notification
    AFTER INSERT OR UPDATE ON public.job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_job_status_notification();

-- Party balance update trigger
DROP TRIGGER IF EXISTS trigger_balance_notification ON public.parties;
CREATE TRIGGER trigger_balance_notification
    AFTER UPDATE ON public.parties
    FOR EACH ROW
    EXECUTE FUNCTION trigger_balance_notification();

-- Stock update trigger (assuming inventory_items table exists)
DROP TRIGGER IF EXISTS trigger_stock_notification ON public.inventory_items;
CREATE TRIGGER trigger_stock_notification
    AFTER UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_notification();

-- ======================================================================
-- UTILITY FUNCTIONS
-- ======================================================================

-- Function to get pending email notifications
CREATE OR REPLACE FUNCTION get_pending_email_notifications(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id INTEGER,
    to_email VARCHAR(255),
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    notification_type VARCHAR(50),
    attempts INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, e.to_email, e.subject, e.html_content, e.text_content, 
        e.notification_type, e.attempts
    FROM public.email_notification_queue e
    WHERE e.status = 'pending' AND e.attempts < 3
    ORDER BY e.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_email_as_sent(email_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.email_notification_queue
    SET status = 'sent', sent_at = NOW()
    WHERE id = email_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as failed
CREATE OR REPLACE FUNCTION mark_email_as_failed(email_id INTEGER, error_msg TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.email_notification_queue
    SET 
        status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END,
        attempts = attempts + 1,
        error_message = error_msg
    WHERE id = email_id;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for operator notifications
ALTER PUBLICATION supabase_realtime ADD TABLE operator_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE email_notification_queue;

-- Comments for documentation
COMMENT ON TABLE public.operator_notifications IS 'Notifications for machine operators with real-time updates';
COMMENT ON TABLE public.email_notification_queue IS 'Queue for email notifications to be sent by background worker';
COMMENT ON FUNCTION queue_email_notification IS 'Queue an email notification to be sent';
COMMENT ON FUNCTION create_operator_notification IS 'Create an operator notification for dashboard display';
COMMENT ON FUNCTION trigger_job_status_notification IS 'Trigger function for job status changes - sends to portal@ganpathioverseas.com';
COMMENT ON FUNCTION trigger_balance_notification IS 'Trigger function for balance updates - sends to finance@ganpathioverseas.com';
COMMENT ON FUNCTION trigger_stock_notification IS 'Trigger function for stock updates - sends to stock@ganpathioverseas.com'; 