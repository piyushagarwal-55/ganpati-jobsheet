"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitQuotationAction } from "@/app/actions";
import {
  Printer,
  FileText,
  Settings,
  Send,
  Building2,
  CheckCircle,
  AlertCircle,
  Bug,
  Database,
  Wifi,
  Scissors,
  Layers,
  BookOpen,
  Palette,
} from "lucide-react";

interface JobSheetData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string;
  projectTitle: string;
  projectDescription: string;
  printType: string;
  paperType: string;
  paperSize: string;
  quantity: string;
  pages: string;
  colorType: string;
  bindingType: string;
  lamination: string;
  folding: string;
  cutting: string;
}

const initialFormData: JobSheetData = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  companyName: "",
  projectTitle: "",
  projectDescription: "",
  printType: "",
  paperType: "",
  paperSize: "",
  quantity: "",
  pages: "1",
  colorType: "",
  bindingType: "none",
  lamination: "none",
  folding: "none",
  cutting: "standard",
};

export default function CompleteQuotationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobSheetData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLog((prev) => [...prev, logMessage]);
    console.log(logMessage);
  };

  const updateFormData = (field: keyof JobSheetData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    addDebugLog(`Updated ${field}: ${value}`);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      addDebugLog(`Moved to step ${currentStep + 1}`);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      addDebugLog(`Moved to step ${currentStep - 1}`);
    }
  };

  // Test database connection
  const testDatabaseConnection = async () => {
    addDebugLog("Testing database connection...");
    try {
      const response = await fetch("/api/test-db", {
        method: "GET",
      });
      const result = await response.json();
      addDebugLog(`Database test result: ${JSON.stringify(result)}`);
    } catch (error) {
      addDebugLog(`Database connection error: ${error}`);
    }
  };

  // Test with minimal data - Updated with correct enum values
  const testMinimalSubmission = async () => {
    addDebugLog("Testing minimal submission...");
    setIsSubmitting(true);

    const minimalData = {
      clientName: "Test User",
      clientEmail: "test@example.com",
      projectTitle: "Test Project",
      printType: "digital", // Valid enum value
      paperType: "standard", // Valid enum value
      paperSize: "A4", // Valid enum value
      quantity: "100",
      colorType: "full-color", // Valid enum value
      clientPhone: "",
      companyName: "",
      projectDescription: "",
      pages: "1",
      bindingType: "none",
      lamination: "none",
      folding: "none",
      cutting: "standard",
    };

    addDebugLog(`Minimal test data: ${JSON.stringify(minimalData, null, 2)}`);

    try {
      addDebugLog("Calling submitQuotationAction...");
      const result = await submitQuotationAction(minimalData);
      addDebugLog(`Submission result: ${JSON.stringify(result, null, 2)}`);

      if (result?.success) {
        setSubmitStatus({
          type: "success",
          message: "Test submission successful!",
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: result?.error || "Test submission failed",
        });
      }
    } catch (error: any) {
      addDebugLog(`Submission error: ${error.message || error}`);
      setSubmitStatus({
        type: "error",
        message: `Error: ${error.message || error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    addDebugLog("=== STARTING FORM SUBMISSION ===");
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    // Validate form data
    addDebugLog("Validating form data...");
    const requiredFields = [
      "clientName",
      "clientEmail",
      "projectTitle",
      "printType",
      "paperType",
      "paperSize",
      "quantity",
      "colorType",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof JobSheetData]
    );

    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(", ")}`;
      addDebugLog(`Validation failed: ${errorMsg}`);
      setSubmitStatus({ type: "error", message: errorMsg });
      setIsSubmitting(false);
      return;
    }

    addDebugLog("Form validation passed");
    addDebugLog(
      `Form data being submitted: ${JSON.stringify(formData, null, 2)}`
    );

    try {
      addDebugLog("Calling submitQuotationAction with form data...");
      const result = await submitQuotationAction(formData);
      addDebugLog(`Action returned: ${JSON.stringify(result, null, 2)}`);

      if (result?.success) {
        addDebugLog("Submission successful!");
        setSubmitStatus({
          type: "success",
          message:
            "Job sheet submitted successfully! We'll contact you with a quote soon.",
        });
        setFormData(initialFormData);
        setCurrentStep(1);
      } else {
        addDebugLog(`Submission failed: ${result?.error}`);
        setSubmitStatus({
          type: "error",
          message:
            result?.error || "Failed to submit job sheet. Please try again.",
        });
      }
    } catch (error: any) {
      addDebugLog(`Exception during submission: ${error.message || error}`);
      console.error("Full error object:", error);
      setSubmitStatus({
        type: "error",
        message: `Network/System error: ${error.message || "Unknown error"}`,
      });
    } finally {
      setIsSubmitting(false);
      addDebugLog("=== SUBMISSION PROCESS COMPLETED ===");
    }
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return (
          formData.clientName && formData.clientEmail && formData.projectTitle
        );
      case 2:
        return (
          formData.printType &&
          formData.paperType &&
          formData.paperSize &&
          formData.quantity &&
          formData.colorType
        );
      case 3:
        return true; // Finishing options are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const isStepValid = validateStep(currentStep);

  const clearDebugLog = () => {
      setDebugLog([]);
      addDebugLog("Debug log cleared");
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-gray-800" />
              <h1 className="text-3xl font-bold text-gray-900">
                GanpathiOverseas
              </h1>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Professional Print Job Sheet
            </h2>
            <p className="text-gray-600">
              Get accurate quotes for all your printing needs
            </p>
          </div>

          {/* Debug Controls */}
          {/* <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Bug className="w-5 h-5" />
                Debug Controls & Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <Button
                  onClick={testDatabaseConnection}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Test DB Connection
                </Button>
                <Button
                  onClick={testMinimalSubmission}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300"
                  disabled={isSubmitting}
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Test Minimal Submit
                </Button>
                <Button
                  onClick={() => setShowDebug(!showDebug)}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300"
                >
                  {showDebug ? "Hide" : "Show"} Debug Log
                </Button>
                <Button
                  onClick={clearDebugLog}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300"
                >
                  Clear Log
                </Button>
              </div>

              {showDebug && (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
                  {debugLog.length === 0 ? (
                    <div>No debug messages yet...</div>
                  ) : (
                    debugLog.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card> */}

          {/* Status Message */}
          {submitStatus.type && (
            <div
              className={`mb-6 p-4 rounded-lg border ${submitStatus.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
                }`}
            >
              <div className="flex items-center gap-2">
                {submitStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{submitStatus.message}</span>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4 bg-white rounded-lg px-6 py-3 shadow-sm border">
              {[
                { step: 1, label: "Client Details", icon: FileText },
                { step: 2, label: "Print Specs", icon: Printer },
                { step: 3, label: "Finishing", icon: Settings },
                { step: 4, label: "Review", icon: Send },
              ].map(({ step, label, icon: Icon }, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${currentStep >= step
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-400 border-gray-300"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${currentStep >= step ? "text-gray-900" : "text-gray-500"
                      }`}
                  >
                    {label}
                  </span>
                  {index < 3 && (
                    <div
                      className={`w-8 h-0.5 ml-4 ${currentStep > step ? "bg-gray-900" : "bg-gray-300"
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <Card className="bg-white shadow-sm border">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-3 text-lg text-gray-900">
                {currentStep === 1 && (
                  <>
                    <FileText className="w-5 h-5" /> Client Information
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <Printer className="w-5 h-5" /> Print Specifications
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <Settings className="w-5 h-5" /> Finishing Options
                  </>
                )}
                {currentStep === 4 && (
                  <>
                    <Send className="w-5 h-5" /> Review & Submit
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Step 1: Client Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientName" className="text-gray-700 font-medium">
                        Full Name *
                      </Label>
                      <Input
                        id="clientName"
                        value={formData.clientName}
                        onChange={(e) => updateFormData("clientName", e.target.value)}
                        className="border-gray-300 focus:border-gray-500 mt-1"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientEmail" className="text-gray-700 font-medium">
                        Email Address *
                      </Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => updateFormData("clientEmail", e.target.value)}
                        className="border-gray-300 focus:border-gray-500 mt-1"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientPhone" className="text-gray-700 font-medium">
                        Phone Number
                      </Label>
                      <Input
                        id="clientPhone"
                        type="tel"
                        value={formData.clientPhone}
                        onChange={(e) => updateFormData("clientPhone", e.target.value)}
                        className="border-gray-300 focus:border-gray-500 mt-1"
                        placeholder="+91 12345 67890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyName" className="text-gray-700 font-medium">
                        Company Name
                      </Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => updateFormData("companyName", e.target.value)}
                        className="border-gray-300 focus:border-gray-500 mt-1"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="projectTitle" className="text-gray-700 font-medium">
                      Project Title *
                    </Label>
                    <Input
                      id="projectTitle"
                      value={formData.projectTitle}
                      onChange={(e) => updateFormData("projectTitle", e.target.value)}
                      className="border-gray-300 focus:border-gray-500 mt-1"
                      placeholder="e.g., Business Cards, Marketing Brochure, Company Flyers"
                    />
                  </div>

                  <div>
                    <Label htmlFor="projectDescription" className="text-gray-700 font-medium">
                      Project Description
                    </Label>
                    <Textarea
                      id="projectDescription"
                      value={formData.projectDescription}
                      onChange={(e) => updateFormData("projectDescription", e.target.value)}
                      className="border-gray-300 focus:border-gray-500 mt-1"
                      placeholder="Describe your printing requirements, design preferences, or any special instructions..."
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Print Specifications - UPDATED with correct enum values */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="printType" className="text-gray-700 font-medium">
                        Print Type *
                      </Label>
                      <Select
                        value={formData.printType}
                        onValueChange={(value) => updateFormData("printType", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select print type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="digital">Digital Printing</SelectItem>
                          <SelectItem value="offset">Offset Printing</SelectItem>
                          <SelectItem value="large-format">Large Format Printing</SelectItem>
                          <SelectItem value="screen">Screen Printing</SelectItem>
                          <SelectItem value="flexo">Flexographic Printing</SelectItem>
                          <SelectItem value="letterpress">Letterpress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paperType" className="text-gray-700 font-medium">
                        Paper Type *
                      </Label>
                      <Select
                        value={formData.paperType}
                        onValueChange={(value) => updateFormData("paperType", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select paper type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bond">Bond Paper (80gsm)</SelectItem>
                          <SelectItem value="standard">Standard Paper (90gsm)</SelectItem>
                          <SelectItem value="premium">Premium Paper (120gsm)</SelectItem>
                          <SelectItem value="glossy">Glossy Paper (150gsm)</SelectItem>
                          <SelectItem value="matte">Matte Paper (130gsm)</SelectItem>
                          <SelectItem value="newsprint">Newsprint (45gsm)</SelectItem>
                          <SelectItem value="cardstock">Cardstock (200gsm)</SelectItem>
                          <SelectItem value="art-paper">Art Paper (170gsm)</SelectItem>
                          <SelectItem value="recycled">Recycled Paper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="paperSize" className="text-gray-700 font-medium">
                        Paper Size *
                      </Label>
                      <Select
                        value={formData.paperSize}
                        onValueChange={(value) => updateFormData("paperSize", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                          <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                          <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                          <SelectItem value="letter">Letter (8.5 × 11 inch)</SelectItem>
                          <SelectItem value="legal">Legal (8.5 × 14 inch)</SelectItem>
                          <SelectItem value="custom">Custom Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity" className="text-gray-700 font-medium">
                        Quantity *
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => updateFormData("quantity", e.target.value)}
                        className="border-gray-300 focus:border-gray-500 mt-1"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pages" className="text-gray-700 font-medium">
                        Pages
                      </Label>
                      <Input
                        id="pages"
                        type="number"
                        min="1"
                        value={formData.pages}
                        onChange={(e) => updateFormData("pages", e.target.value)}
                        className="border-gray-300 focus:border-gray-500 mt-1"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="colorType" className="text-gray-700 font-medium">
                      Color Type *
                    </Label>
                    <Select
                      value={formData.colorType}
                      onValueChange={(value) => updateFormData("colorType", value)}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                        <SelectValue placeholder="Select color type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black-white">Black & White</SelectItem>
                        <SelectItem value="single-color">Single Color</SelectItem>
                        <SelectItem value="2-color">2 Color</SelectItem>
                        <SelectItem value="3-color">3 Color</SelectItem>
                        <SelectItem value="spot-color">Spot Color</SelectItem>
                        <SelectItem value="full-color">Full Color (CMYK)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 3: Finishing Options - UPDATED with correct enum values */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Palette className="w-5 h-5" />
                      <h3 className="font-semibold">Finishing Options</h3>
                    </div>
                    <p className="text-sm text-blue-700">
                      All finishing options are optional. Select the ones that apply to your project to get an accurate quote.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="bindingType" className="text-gray-700 font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Binding Type
                      </Label>
                      <Select
                        value={formData.bindingType}
                        onValueChange={(value) => updateFormData("bindingType", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select binding" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Binding</SelectItem>
                          <SelectItem value="saddle-stitch">Saddle Stitch</SelectItem>
                          <SelectItem value="perfect-bound">Perfect Bound</SelectItem>
                          <SelectItem value="spiral">Spiral Binding</SelectItem>
                          <SelectItem value="wire-o">Wire-O Binding</SelectItem>
                          <SelectItem value="case-bound">Case Bound (Hardcover)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="lamination" className="text-gray-700 font-medium flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Lamination
                      </Label>
                      <Select
                        value={formData.lamination}
                        onValueChange={(value) => updateFormData("lamination", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select lamination" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Lamination</SelectItem>
                          <SelectItem value="matte">Matte Lamination</SelectItem>
                          <SelectItem value="glossy">Glossy Lamination</SelectItem>
                          <SelectItem value="soft-touch">Soft Touch Lamination</SelectItem>
                          <SelectItem value="anti-scratch">Anti-Scratch Lamination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="folding" className="text-gray-700 font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Folding
                      </Label>
                      <Select
                        value={formData.folding}
                        onValueChange={(value) => updateFormData("folding", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select folding" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Folding</SelectItem>
                          <SelectItem value="half-fold">Half Fold</SelectItem>
                          <SelectItem value="tri-fold">Tri-fold</SelectItem>
                          <SelectItem value="z-fold">Z-fold</SelectItem>
                          <SelectItem value="gate-fold">Gate Fold</SelectItem>
                          <SelectItem value="accordion">Accordion Fold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="cutting" className="text-gray-700 font-medium flex items-center gap-2">
                        <Scissors className="w-4 h-4" />
                        Cutting
                      </Label>
                      <Select
                        value={formData.cutting}
                        onValueChange={(value) => updateFormData("cutting", value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 mt-1">
                          <SelectValue placeholder="Select cutting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Cut</SelectItem>
                          <SelectItem value="custom">Custom Cut</SelectItem>
                          <SelectItem value="die-cut">Die Cut</SelectItem>
                          <SelectItem value="laser-cut">Laser Cut</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Additional Finishing Options</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      If you need additional finishing options not listed above (like embossing, foiling, UV coating, etc.),
                      please mention them in the project description or contact us directly.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
                      <div>• Embossing/Debossing</div>
                      <div>• Foil Stamping</div>
                      <div>• UV Spot Coating</div>
                      <div>• Aqueous Coating</div>
                      <div>• Varnishing</div>
                      <div>• Perforating</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <h3 className="font-semibold mb-6 text-gray-900 text-xl">
                      Complete Job Sheet Summary
                    </h3>
                  
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Client Information */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Client Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Name:</span>
                            <span className="text-gray-900">{formData.clientName || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Email:</span>
                            <span className="text-gray-900">{formData.clientEmail || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Phone:</span>
                            <span className="text-gray-900">{formData.clientPhone || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Company:</span>
                            <span className="text-gray-900">{formData.companyName || "Not provided"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Project Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Project:</span>
                            <span className="text-gray-900">{formData.projectTitle || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Print Type:</span>
                            <span className="text-gray-900 capitalize">{formData.printType?.replace('-', ' ') || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Paper Type:</span>
                            <span className="text-gray-900 capitalize">{formData.paperType?.replace('-', ' ') || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Paper Size:</span>
                            <span className="text-gray-900">{formData.paperSize || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Quantity:</span>
                            <span className="text-gray-900">{formData.quantity ? `${formData.quantity} units` : "Not specified"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Pages:</span>
                            <span className="text-gray-900">{formData.pages || "1"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Color:</span>
                            <span className="text-gray-900 capitalize">{formData.colorType?.replace('-', ' ') || "Not specified"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project Description */}
                    {formData.projectDescription && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="font-semibold text-gray-800 mb-2">Project Description</h4>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                          {formData.projectDescription}
                        </p>
                      </div>
                    )}

                    {/* Finishing Options */}
                    {(formData.bindingType !== 'none' || formData.lamination !== 'none' ||
                      formData.folding !== 'none' || formData.cutting !== 'standard') && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="font-semibold text-gray-800 mb-3">Finishing Options</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {formData.bindingType !== 'none' && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-700">Binding:</span>
                                <span className="text-gray-900 capitalize">{formData.bindingType?.replace('-', ' ')}</span>
                              </div>
                            )}
                            {formData.lamination !== 'none' && (
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-700">Lamination:</span>
                                <span className="text-gray-900 capitalize">{formData.lamination?.replace('-', ' ')}</span>
                              </div>
                            )}
                            {formData.folding !== 'none' && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-700">Folding:</span>
                                <span className="text-gray-900 capitalize">{formData.folding?.replace('-', ' ')}</span>
                              </div>
                            )}
                            {formData.cutting !== 'standard' && (
                              <div className="flex items-center gap-2">
                                <Scissors className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-700">Cutting:</span>
                                <span className="text-gray-900 capitalize">{formData.cutting?.replace('-', ' ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• We'll review your job sheet and prepare a detailed quote</p>
                      <p>• You'll receive the quote via email within 24 hours</p>
                      <p>• Upon approval, we'll begin production immediately</p>
                      <p>• We'll keep you updated throughout the production process</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-12 py-4 text-lg font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Submitting Job Sheet...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-3" />
                          Submit Job Sheet & Get Quote
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      By submitting this form, you agree to receive quotes and communications from GanpathiOverseas
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 4 && (
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="border-gray-300 hover:bg-gray-50 px-6 py-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </Button>
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={currentStep === 4 || !isStepValid}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2"
                  >
                    Next Step
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}

              {currentStep === 4 && (
                <div className="flex justify-start mt-8 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="border-gray-300 hover:bg-gray-50 px-6 py-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>© 2024 GanpathiOverseas. Professional printing services for all your needs.</p>
            <p className="mt-1">
              Need help? Contact us at{" "}
              <a href="mailto:info@ganpathioverseas.com" className="text-gray-700 hover:text-gray-900">
                info@ganpathioverseas.com
              </a>{" "}
              or call{" "}
              <a href="tel:+919876543210" className="text-gray-700 hover:text-gray-900">
                +91 96519 11111
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }
