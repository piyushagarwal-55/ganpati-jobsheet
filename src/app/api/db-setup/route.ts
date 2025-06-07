import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    console.log('Starting database setup...');

    // Step 1: Try to create the table directly
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS party_transactions (
          id SERIAL PRIMARY KEY,
          party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('payment', 'order', 'adjustment')),
          amount DECIMAL(12,2) NOT NULL,
          description TEXT,
          balance_after DECIMAL(12,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      )
    `;

    // Use raw SQL query
    const { error: createError } = await supabase.rpc('exec', { sql: createTableQuery });
    
    if (createError) {
      console.log('Direct table creation failed, trying alternative approach...');
      
      // Alternative: Use Supabase client to check if we can access the table
      const { data: testData, error: testError } = await supabase
        .from('party_transactions')
        .select('*')
        .limit(1);

      if (testError && testError.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Table does not exist and cannot be created via API. Please run the migration SQL directly in Supabase Dashboard.',
          migration: `
-- Run this SQL in Supabase Dashboard -> SQL Editor:

CREATE TABLE IF NOT EXISTS party_transactions (
    id SERIAL PRIMARY KEY,
    party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('payment', 'order', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    balance_after DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON party_transactions(created_at);

ALTER TABLE party_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON party_transactions FOR ALL USING (true);
          `
        }, { status: 400 });
      }
    }

    // Test if table now works
    const { data: finalTest, error: finalError } = await supabase
      .from('party_transactions')
      .select('count')
      .limit(1);

    if (finalError) {
      return NextResponse.json({ 
        error: 'Table creation uncertain. Please verify in Supabase Dashboard.',
        details: finalError.message
      }, { status: 500 });
    }

    console.log('Database setup completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'party_transactions table is ready',
      tableAccessible: !finalError
    });

  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 