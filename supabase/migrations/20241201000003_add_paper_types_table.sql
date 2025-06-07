-- Migration to add paper_types table for managing custom paper types
CREATE TABLE IF NOT EXISTS public.paper_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    gsm INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_paper_types_name ON public.paper_types(name);

-- Insert some common paper types
INSERT INTO public.paper_types (name, gsm, description) VALUES 
('ART PAPER', 150, 'High-quality coated paper for printing'),
('MATTE PAPER', 170, 'Non-glossy finish paper'),
('GLOSSY PAPER', 200, 'High-gloss finish paper'),
('CARDSTOCK', 250, 'Heavy weight paper for cards'),
('PHOTO PAPER', 260, 'Specialized paper for photo printing')
ON CONFLICT (name) DO NOTHING;

-- Enable realtime for paper_types table
ALTER PUBLICATION supabase_realtime ADD TABLE paper_types; 