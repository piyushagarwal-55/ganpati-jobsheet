-- Migration to add job_sheets table for print jobs
CREATE TABLE IF NOT EXISTS public.job_sheets (
    id SERIAL PRIMARY KEY,
    job_date DATE,
    description TEXT,
    sheet INTEGER,
    plate INTEGER,
    size VARCHAR(20),
    sq_inch DECIMAL(8,2),
    paper_sheet INTEGER,
    imp INTEGER,
    rate DECIMAL(10,2),
    printing DECIMAL(10,2),
    uv DECIMAL(10,2),
    baking DECIMAL(10,2)
); 