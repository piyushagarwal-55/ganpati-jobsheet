-- Migration to remove paper types with GSM numbers embedded in their names
-- This cleans up the paper types dropdown to only show base types since GSM is now handled separately

-- Remove paper types that have GSM numbers in their names
-- This will keep only the base paper types like "ART PAPER", "MATTE PAPER" etc.
DELETE FROM public.paper_types 
WHERE name ~ '\d+$'  -- Remove entries that end with digits
   OR name ~ '\s\d+$'  -- Remove entries that end with space + digits
   OR name ~ '\s\d+\s'  -- Remove entries that have space + digits + space
   OR name LIKE '%150%'
   OR name LIKE '%170%'
   OR name LIKE '%200%'
   OR name LIKE '%220%'
   OR name LIKE '%250%'
   OR name LIKE '%300%'
   OR name LIKE '%130%'
   OR name LIKE '%80%'
   OR name LIKE '%90%'
   OR name LIKE '%70%'
   OR name LIKE '%45%'
   OR name LIKE '%48%'
   OR name LIKE '%260%'
   OR name LIKE '%280%'
   OR name LIKE '%100%'
   OR name LIKE '%115%'
   OR name LIKE '%120%'
   OR name LIKE '%125%'
   OR name LIKE '%210%'
   OR name LIKE '%230%'
   OR name LIKE '%270%'
   OR name LIKE '%330%';

-- Also remove any duplicate base types that might exist
-- Keep only one instance of each base paper type name
WITH ranked_types AS (
    SELECT id, name, 
           ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(name)) ORDER BY id) as rn
    FROM public.paper_types
)
DELETE FROM public.paper_types 
WHERE id IN (
    SELECT id FROM ranked_types WHERE rn > 1
);

-- Clean up any inconsistent casing or spacing
UPDATE public.paper_types 
SET name = UPPER(TRIM(name))
WHERE name != UPPER(TRIM(name));

-- Ensure we have the standard base types (in case any were accidentally deleted)
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
    SELECT 1 FROM public.paper_types pt WHERE UPPER(TRIM(pt.name)) = new_types.name
);

-- Comment for documentation
COMMENT ON TABLE public.paper_types IS 'Clean base paper types without GSM numbers. GSM is handled separately in the UI for maximum flexibility.'; 