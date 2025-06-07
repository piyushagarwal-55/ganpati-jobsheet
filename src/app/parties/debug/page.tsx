"use client";

import { useState, useEffect } from "react";

export default function DebugPartiesPage() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>("Checking...");

  useEffect(() => {
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Testing API connection to /api/parties");

      const response = await fetch("/api/parties", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${data.error || "Unknown error"}`
        );
      }

      setParties(data);
      setApiStatus(`✅ API Working - Found ${data.length} parties`);
    } catch (err) {
      console.error("API test failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setApiStatus(`❌ API Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const testAddParty = async () => {
    try {
      const testParty = {
        name: `Test Party ${Date.now()}`,
        balance: 0,
      };

      console.log("Testing POST to /api/parties with:", testParty);

      const response = await fetch("/api/parties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testParty),
      });

      const data = await response.json();
      console.log("POST response:", data);

      if (response.ok) {
        alert("✅ Test party added successfully!");
        testApiConnection(); // Refresh the list
      } else {
        alert(`❌ Failed to add test party: ${data.error}`);
      }
    } catch (err) {
      console.error("POST test failed:", err);
      alert(
        `❌ POST test failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>

      <div className="space-y-6">
        {/* Status Section */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">API Status</h2>
          <p className="font-mono">{apiStatus}</p>
          <button
            onClick={testApiConnection}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Testing..." : "Test API Connection"}
          </button>
        </div>

        {/* Error Section */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Test Actions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Test Actions</h2>
          <button
            onClick={testAddParty}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
          >
            Add Test Party
          </button>
        </div>

        {/* Parties List */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Current Parties</h2>
          {loading ? (
            <p>Loading...</p>
          ) : parties.length === 0 ? (
            <p className="text-gray-600">No parties found</p>
          ) : (
            <div className="space-y-2">
              {parties.map((party: any) => (
                <div key={party.id} className="bg-white p-3 rounded border">
                  <div className="font-semibold">{party.name}</div>
                  <div className="text-sm text-gray-600">
                    Balance: ₹{party.balance?.toFixed(2) || "0.00"} | ID:{" "}
                    {party.id} | Created:{" "}
                    {new Date(party.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw Data */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Raw API Response</h2>
          <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-auto text-sm">
            {JSON.stringify(parties, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
