import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if party_transactions table exists and has correct schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'party_transactions');

    let tableExists = false;
    let hasCorrectSchema = false;

    if (!tablesError && tables && tables.length > 0) {
      tableExists = true;

      // Check if the table has the 'type' column
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'party_transactions')
        .eq('column_name', 'type');

      if (!columnsError && columns && columns.length > 0) {
        hasCorrectSchema = true;
      }
    }

    return NextResponse.json({
      tableExists,
      hasCorrectSchema,
      message: tableExists 
        ? (hasCorrectSchema ? 'Table exists with correct schema' : 'Table exists but missing columns')
        : 'Table does not exist'
    });

  } catch (error: any) {
    console.error('Database check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();

    // Run the migration SQL
    const migrationSQL = `
      -- Check if table exists and drop if it has wrong schema
      DO $$
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'party_transactions') THEN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'party_transactions' AND column_name = 'type'
              ) THEN
                  DROP TABLE IF EXISTS public.party_transactions CASCADE;
              END IF;
          END IF;
      END $$;

      -- Create the party_transactions table with correct schema
      CREATE TABLE IF NOT EXISTS public.party_transactions (
          id SERIAL PRIMARY KEY,
          party_id INTEGER REFERENCES public.parties(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('payment', 'order', 'adjustment')),
          amount DECIMAL(12,2) NOT NULL,
          description TEXT,
          balance_after DECIMAL(12,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON public.party_transactions(party_id);
      CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON public.party_transactions(created_at);

      -- Enable RLS and create policy
      ALTER TABLE public.party_transactions ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policy if it exists
      DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.party_transactions;
      
      -- Create policy
      CREATE POLICY "Allow all operations for authenticated users" ON public.party_transactions
          FOR ALL USING (true);
    `;

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Migration completed successfully' });

  } catch (error: any) {
    console.error('Migration execution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 