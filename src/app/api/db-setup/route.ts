import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    console.log("Starting database setup...");

    // Step 1: Add soft delete columns to job_sheets table
    const addSoftDeleteColumns = `
      -- Add soft delete columns to job_sheets table
      ALTER TABLE job_sheets 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
      ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

      -- Create index for better performance on soft delete queries
      CREATE INDEX IF NOT EXISTS idx_job_sheets_is_deleted ON job_sheets(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_job_sheets_deleted_at ON job_sheets(deleted_at);
    `;

    // Step 2: Add soft delete columns to party_transactions table
    const addTransactionSoftDeleteColumns = `
      -- Add soft delete columns to party_transactions table
      ALTER TABLE party_transactions 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

      -- Create index for better performance on soft delete queries
      CREATE INDEX IF NOT EXISTS idx_party_transactions_is_deleted ON party_transactions(is_deleted);
    `;

    // Step 3: Try to create the party_transactions table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS party_transactions (
          id SERIAL PRIMARY KEY,
          party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('payment', 'order', 'adjustment')),
          amount DECIMAL(12,2) NOT NULL,
          description TEXT,
          balance_after DECIMAL(12,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          is_deleted BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON party_transactions(party_id);
      CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON party_transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_party_transactions_is_deleted ON party_transactions(is_deleted);

      ALTER TABLE party_transactions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "Allow all operations" ON party_transactions FOR ALL USING (true);
    `;

    // Execute the soft delete columns addition first
    const { error: softDeleteError } = await supabase.rpc("exec_sql", {
      sql: addSoftDeleteColumns,
    });

    if (softDeleteError) {
      console.log("Soft delete columns addition failed:", softDeleteError);
    } else {
      console.log("Soft delete columns added successfully");
    }

    // Execute the transaction soft delete columns addition
    const { error: transactionSoftDeleteError } = await supabase.rpc(
      "exec_sql",
      {
        sql: addTransactionSoftDeleteColumns,
      }
    );

    if (transactionSoftDeleteError) {
      console.log(
        "Transaction soft delete columns addition failed:",
        transactionSoftDeleteError
      );
    } else {
      console.log("Transaction soft delete columns added successfully");
    }

    // Use raw SQL query for party_transactions table
    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: createTableQuery,
    });

    if (createError) {
      console.log("Party transactions table creation failed:", createError);
    } else {
      console.log("Party transactions table created successfully");
    }

    // Test if job_sheets table now has soft delete columns
    const { data: testJobSheets, error: testJobSheetsError } = await supabase
      .from("job_sheets")
      .select("id, is_deleted")
      .limit(1);

    // Test if party_transactions table works
    const { data: testTransactions, error: testTransactionsError } =
      await supabase.from("party_transactions").select("count").limit(1);

    console.log("Database setup completed");

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully",
      results: {
        softDeleteColumns: !softDeleteError,
        transactionSoftDeleteColumns: !transactionSoftDeleteError,
        partyTransactionsTable: !createError,
        jobSheetsTest: !testJobSheetsError,
        transactionsTest: !testTransactionsError,
      },
    });
  } catch (error: any) {
    console.error("Database setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
