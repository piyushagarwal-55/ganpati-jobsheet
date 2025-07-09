-- Migration to add comprehensive paper types for inventory management
-- This ensures the paper types dropdown is not empty

-- First, ensure the name column has a unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'paper_types_name_key' 
        AND conrelid = 'public.paper_types'::regclass
    ) THEN
        ALTER TABLE public.paper_types ADD CONSTRAINT paper_types_name_key UNIQUE (name);
    END IF;
END $$;

-- Insert base paper types (without GSM in name, GSM handled separately like in job sheet form)
INSERT INTO public.paper_types (name, gsm) 
SELECT name, gsm FROM (VALUES 
    ('ART PAPER', NULL::INTEGER),
    ('MATTE PAPER', NULL::INTEGER),
    ('GLOSSY PAPER', NULL::INTEGER),
    ('CARDSTOCK', NULL::INTEGER),
    ('PHOTO PAPER', NULL::INTEGER),
    ('OFFSET PAPER', NULL::INTEGER),
    ('NEWSPRINT', NULL::INTEGER),
    ('BOND PAPER', NULL::INTEGER),
    ('COPIER PAPER', NULL::INTEGER),
    ('FRC', NULL::INTEGER),
    ('DUPLEX', NULL::INTEGER),
    ('SBS', NULL::INTEGER),
    ('MAIFLITO', NULL::INTEGER),
    ('GUMMING', NULL::INTEGER),
    ('PREMIUM ART', NULL::INTEGER),
    ('MATTE FINISH', NULL::INTEGER),
    ('HIGH GLOSS', NULL::INTEGER),
    ('RECYCLED', NULL::INTEGER),
    ('COATED', NULL::INTEGER),
    ('UNCOATED', NULL::INTEGER)
) AS new_types(name, gsm)
WHERE NOT EXISTS (
    SELECT 1 FROM public.paper_types pt WHERE pt.name = new_types.name
);

-- Remove GSM values from existing combined-name records (clean up any old data)
UPDATE public.paper_types 
SET gsm = NULL 
WHERE gsm IS NOT NULL;

-- Add index on name for better performance (since GSM is handled separately)
CREATE INDEX IF NOT EXISTS idx_paper_types_name_lower ON public.paper_types(LOWER(name));

-- Comment for documentation
COMMENT ON TABLE public.paper_types IS 'Base paper types for inventory management. GSM values are handled separately in the UI, similar to the job sheet form pattern.'; 