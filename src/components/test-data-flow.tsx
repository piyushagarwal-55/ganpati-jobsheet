"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitQuotationAction } from "@/app/actions";

export default function TestDataFlow() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSubmission = async () => {
    setLoading(true);
    setResult(null);

    const testData = {
      clientName: "Test Client",
      clientEmail: "test@example.com",
      clientPhone: "+91-9876543210",
      companyName: "Test Company",
      projectTitle: "Test Project",
      projectDescription: "Test description",
      printType: "business-cards",
      paperType: "premium",
      paperSize: "business-card",
      quantity: "100",
      pages: "1",
      colorType: "full-color",
      bindingType: "none",
      lamination: "none",
      folding: "none",
      cutting: "standard",
    };

    console.log("Sending test data:", testData);

    try {
      const response = await submitQuotationAction(testData);
      console.log("Response:", response);
      setResult(response);
    } catch (error) {
      console.error("Error:", error);
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Test Data Flow</h2>

      <Button onClick={testSubmission} disabled={loading} className="mb-4">
        {loading ? "Testing..." : "Test Quotation Submission"}
      </Button>

      {result && (
        <div className="mt-4 p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p className="text-sm">
          This component tests the data flow from form submission to database.
          Check the browser console and network tab for detailed logs.
        </p>
      </div>
    </div>
  );
}
