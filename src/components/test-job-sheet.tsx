"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitJobSheetAction } from "@/app/actions";

export default function TestJobSheet() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSubmission = async () => {
    setLoading(true);
    setResult(null);

    const testData = {
      job_date: new Date().toISOString().split("T")[0],
      party_name: "Test Party",
      description: "Test Job Sheet",
      plate: "2",
      size: "A4",
      sq_inch: "93.5",
      paper_sheet: "100",
      imp: "1000",
      rate: "10.0",
      printing: "500.0",
      uv: "0.0",
      baking: "0.0",
    };

    console.log("Testing with data:", testData);

    try {
      const response = await submitJobSheetAction(testData);
      console.log("Test response:", response);
      setResult(response);
    } catch (error) {
      console.error("Test error:", error);
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Test Job Sheet Submission</h2>

      <Button
        onClick={testSubmission}
        disabled={loading}
        className="mb-4 w-full"
      >
        {loading ? "Testing..." : "Test Submit"}
      </Button>

      {result && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
