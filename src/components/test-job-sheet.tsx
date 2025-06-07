"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitQuotationAction } from "@/app/actions";

export default function TestJobSheet() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSubmission = async () => {
    setLoading(true);
    setResult(null);

    const testData = {
      clientName: "John Doe",
      clientEmail: "john@example.com",
      clientPhone: "+91-9876543210",
      companyName: "Test Company",
      projectTitle: "Test Brochure",
      projectDescription: "Marketing brochure for company",
      printType: "brochures",
      paperType: "glossy",
      paperSize: "a4",
      quantity: "500",
      pages: "8",
      colorType: "full-color",
      bindingType: "saddle-stitch",
      lamination: "gloss",
      folding: "none",
      cutting: "standard",
    };

    console.log("Testing with data:", testData);

    try {
      const response = await submitQuotationAction(testData);
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
