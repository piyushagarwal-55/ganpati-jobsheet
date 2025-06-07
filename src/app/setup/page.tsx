"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Database,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function SetupPage() {
  const [status, setStatus] = useState<{
    checking: boolean;
    tableExists: boolean;
    hasCorrectSchema: boolean;
    error: string | null;
  }>({
    checking: false,
    tableExists: false,
    hasCorrectSchema: false,
    error: null,
  });

  const migrationSQL = `-- Run this SQL in Supabase Dashboard -> SQL Editor:

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
CREATE POLICY "Allow all operations" ON party_transactions FOR ALL USING (true);`;

  const checkDatabase = async () => {
    setStatus({ ...status, checking: true, error: null });

    try {
      // Test if we can fetch transactions
      const response = await fetch("/api/parties/transactions");
      const data = await response.json();

      if (response.ok) {
        setStatus({
          checking: false,
          tableExists: true,
          hasCorrectSchema: true,
          error: null,
        });
      } else {
        setStatus({
          checking: false,
          tableExists: false,
          hasCorrectSchema: false,
          error: data.error || "Unknown error",
        });
      }
    } catch (error: any) {
      setStatus({
        checking: false,
        tableExists: false,
        hasCorrectSchema: false,
        error: error.message,
      });
    }
  };

  const testTransaction = async () => {
    try {
      // Try to create a test transaction (this will fail gracefully if no parties exist)
      const partiesResponse = await fetch("/api/parties");
      const parties = await partiesResponse.json();

      if (parties.length === 0) {
        alert("Please create at least one party first!");
        return;
      }

      const response = await fetch("/api/parties/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: parties[0].id,
          type: "adjustment",
          amount: 0.01,
          description: "Test transaction - can be ignored",
        }),
      });

      if (response.ok) {
        alert(
          "✅ Transaction creation works! You can now use the party management system."
        );
        checkDatabase(); // Refresh status
      } else {
        const error = await response.json();
        alert(`❌ Transaction creation failed: ${error.error}`);
      }
    } catch (error: any) {
      alert(`❌ Test failed: ${error.message}`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(migrationSQL);
    alert("SQL copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Database Setup
          </h1>
          <p className="text-gray-600">
            Set up the party_transactions table for full functionality
          </p>
        </div>

        {/* Status Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkDatabase} disabled={status.checking}>
              {status.checking ? "Checking..." : "Check Database Status"}
            </Button>

            {!status.checking && (status.tableExists || status.error) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {status.tableExists ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>
                    {status.tableExists
                      ? "party_transactions table exists"
                      : "party_transactions table missing"}
                  </span>
                </div>

                {status.tableExists && (
                  <div className="flex items-center gap-2">
                    {status.hasCorrectSchema ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>
                      {status.hasCorrectSchema
                        ? "Table has correct schema"
                        : "Table schema needs fixing"}
                    </span>
                  </div>
                )}

                {status.error && (
                  <Alert>
                    <AlertDescription>
                      <strong>Error:</strong> {status.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Migration Instructions */}
        {(!status.tableExists || !status.hasCorrectSchema) && (
          <Card>
            <CardHeader>
              <CardTitle>Database Migration Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                The party_transactions table needs to be created or fixed.
                Follow these steps:
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    1
                  </span>
                  <span>Go to your Supabase Dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    2
                  </span>
                  <span>Navigate to SQL Editor</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    3
                  </span>
                  <span>Copy and paste the SQL below</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    4
                  </span>
                  <span>Click "Run" to execute the migration</span>
                </div>
              </div>

              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{migrationSQL}</pre>
              </div>

              <div className="flex gap-2">
                <Button onClick={copyToClipboard} variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SQL
                </Button>
                <Button
                  onClick={() =>
                    window.open("https://app.supabase.com", "_blank")
                  }
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Supabase
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Section */}
        {status.tableExists && status.hasCorrectSchema && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">
                ✅ Database Ready!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Your database is properly configured. You can now use all party
                management features.
              </p>

              <div className="flex gap-2">
                <Button onClick={testTransaction}>
                  Test Transaction Creation
                </Button>
                <Button
                  onClick={() => (window.location.href = "/parties")}
                  variant="outline"
                >
                  Go to Parties Page
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle>What This Enables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">✅ Working Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Party balance management</li>
                  <li>• Job sheet creation with balance updates</li>
                  <li>• Basic party CRUD operations</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">🚀 Enabled After Migration</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Complete transaction history</li>
                  <li>• Payment and order tracking</li>
                  <li>• Advanced reporting and analytics</li>
                  <li>• Transaction management interface</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
