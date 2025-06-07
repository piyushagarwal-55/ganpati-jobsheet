"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Layers,
  DollarSign,
  Download,
  Edit,
  Save,
  X,
  MessageSquare,
  Settings,
  BarChart3,
  FileImage,
  Calculator,
  User,
  Clock,
  TrendingUp,
  Info,
  Weight,
  Building2,
  Hash,
  Factory,
  Package,
  Ruler,
  Printer,
  Archive,
  Palette,
} from "lucide-react";
import { JobSheet, JobSheetNote } from "@/types/jobsheet";

interface JobSheetDetailModalProps {
  jobSheet: JobSheet;
  notes: JobSheetNote[];
  onClose: () => void;
  updateJobSheet: (
    id: number,
    updates: Partial<JobSheet>
  ) => Promise<{ success: boolean; error?: string }>;
  addNote: (
    jobSheetId: number,
    note: string
  ) => Promise<{ success: boolean; error?: string }>;
  generateReport: (
    jobSheetId: number
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function JobSheetDetailModal({
  jobSheet,
  notes,
  onClose,
  updateJobSheet,
  addNote,
  generateReport,
}: JobSheetDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSheet, setEditedSheet] = useState<Partial<JobSheet>>(jobSheet);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const jobSheetNotes = (notes || []).filter(
    (note) => note.job_sheet_id === jobSheet.id
  );

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatBalance = (balance: number | null | undefined): string => {
    return balance != null ? `₹${balance.toFixed(2)}` : "₹0.00";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTotalCost = () => {
    return (
      (editedSheet.printing || 0) +
      (editedSheet.uv || 0) +
      (editedSheet.baking || 0)
    );
  };

  const handleSave = async () => {
    setIsLoading(true);

    // Convert string values to appropriate types
    const updates: any = { ...editedSheet };

    // Convert numeric fields
    const numericFields = ["sheet", "plate", "paper_sheet", "imp"];
    const floatFields = ["sq_inch", "rate", "printing", "uv", "baking"];

    numericFields.forEach((field) => {
      if (updates[field] !== undefined) {
        updates[field] = updates[field]
          ? parseInt(updates[field].toString())
          : null;
      }
    });

    floatFields.forEach((field) => {
      if (updates[field] !== undefined) {
        updates[field] = updates[field]
          ? parseFloat(updates[field].toString())
          : null;
      }
    });

    const result = await updateJobSheet(jobSheet.id, updates);

    setIsLoading(false);

    if (result.success) {
      setIsEditing(false);
      // Update the jobSheet object with new values
      Object.assign(jobSheet, updates);
    } else {
      alert(`Failed to update job sheet: ${result.error}`);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsLoading(true);
    const result = await addNote(jobSheet.id, newNote.trim());
    setIsLoading(false);

    if (result.success) {
      setNewNote("");
    } else {
      alert(`Failed to add note: ${result.error}`);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    const result = await generateReport(jobSheet.id);
    setIsLoading(false);

    if (!result.success) {
      alert(`Failed to generate report: ${result.error}`);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <span>Job Sheet #{jobSheet.id}</span>
                <p className="text-sm font-normal text-gray-500 mt-1">
                  Created on {formatDate(jobSheet.job_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Report
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedSheet(jobSheet);
                    }}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Production
            </TabsTrigger>
            <TabsTrigger value="costing" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Costing
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes ({jobSheetNotes.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Close Button - Moved to top right */}
            <div className="flex justify-end -mt-4 mb-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 rounded-full p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Job Information */}
              <div className="space-y-6">
                {/* Basic Job Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Job Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-blue-700">
                        Job ID:
                      </Label>
                      <span className="font-mono text-blue-900">
                        #{jobSheet.id}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-blue-700">
                        Date:
                      </Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editedSheet.job_date || ""}
                          onChange={(e) =>
                            setEditedSheet({
                              ...editedSheet,
                              job_date: e.target.value,
                            })
                          }
                          className="w-32 h-8 text-sm"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-900">
                            {formatDate(jobSheet.job_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-blue-700">
                        Status:
                      </Label>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300"
                      >
                        Active
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-blue-700">
                        Priority:
                      </Label>
                      <Badge variant="secondary">Normal</Badge>
                    </div>
                  </div>
                </div>

                {/* Party Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Party Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Party Name:
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editedSheet.party_name || ""}
                          onChange={(e) =>
                            setEditedSheet({
                              ...editedSheet,
                              party_name: e.target.value,
                            })
                          }
                          className="mt-1"
                          placeholder="Enter party/client name"
                        />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {jobSheet.party_name || "No party name"}
                          </span>
                        </div>
                      )}
                    </div>

                    {jobSheet.party_id && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Party ID:
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Hash className="w-4 h-4 text-gray-500" />
                          <span className="font-mono text-sm">
                            {jobSheet.party_id}
                          </span>
                        </div>
                      </div>
                    )}

                    {(jobSheet.party_balance_before != null ||
                      jobSheet.party_balance_after != null) && (
                      <div className="bg-white border rounded p-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Balance Information:
                        </Label>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          {jobSheet.party_balance_before != null && (
                            <div>
                              <span className="text-gray-500">Before:</span>
                              <span className="font-semibold ml-1">
                                {formatBalance(jobSheet.party_balance_before)}
                              </span>
                            </div>
                          )}
                          {jobSheet.party_balance_after != null && (
                            <div>
                              <span className="text-gray-500">After:</span>
                              <span className="font-semibold ml-1">
                                {formatBalance(jobSheet.party_balance_after)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Job Description:
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedSheet.description || ""}
                      onChange={(e) =>
                        setEditedSheet({
                          ...editedSheet,
                          description: e.target.value,
                        })
                      }
                      className="mt-1"
                      rows={4}
                      placeholder="Describe the job details..."
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 rounded min-h-[100px] border">
                      <p className="text-sm leading-relaxed">
                        {jobSheet.description || "No description provided"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Production & Paper Details */}
              <div className="space-y-6">
                {/* Production Specifications */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Factory className="w-4 h-4" />
                    Production Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-purple-700">
                        Sheets:
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">
                          {jobSheet.sheet?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-purple-700">
                        Plates:
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">
                          {jobSheet.plate?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-purple-700">
                        Size:
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Ruler className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">
                          {jobSheet.size || "Not specified"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-purple-700">
                        Sq. Inches:
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calculator className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">
                          {jobSheet.sq_inch?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-purple-700">
                        Paper Sheets:
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Archive className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">
                          {jobSheet.paper_sheet?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-purple-700">
                        Impressions:
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Printer className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">
                          {jobSheet.imp?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paper Information */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Paper Specifications
                  </h4>
                  <div className="space-y-3">
                    {jobSheet.paper_type_name && (
                      <div>
                        <Label className="text-sm font-medium text-green-700">
                          Paper Type:
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Palette className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">
                            {jobSheet.paper_type_name}
                          </span>
                        </div>
                      </div>
                    )}

                    {jobSheet.gsm && (
                      <div>
                        <Label className="text-sm font-medium text-green-700">
                          GSM (Weight):
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Weight className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">
                            {jobSheet.gsm} GSM
                          </span>
                        </div>
                      </div>
                    )}

                    {jobSheet.job_type && (
                      <div>
                        <Label className="text-sm font-medium text-green-700">
                          Job Type:
                        </Label>
                        <Badge
                          variant={
                            jobSheet.job_type === "front-back"
                              ? "default"
                              : "secondary"
                          }
                          className="mt-1"
                        >
                          {jobSheet.job_type === "front-back"
                            ? "Front-Back"
                            : "Single-Single"}
                        </Badge>
                      </div>
                    )}

                    {/* Paper provided by party details */}
                    {jobSheet.paper_provided_by_party && (
                      <div className="bg-white border rounded p-3">
                        <Label className="text-sm font-medium text-green-700 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Party Provided Paper:
                        </Label>
                        <div className="mt-2 space-y-1 text-sm">
                          {jobSheet.paper_type && (
                            <div>
                              Type:{" "}
                              <span className="font-medium">
                                {jobSheet.paper_type}
                              </span>
                            </div>
                          )}
                          {jobSheet.paper_size && (
                            <div>
                              Size:{" "}
                              <span className="font-medium">
                                {jobSheet.paper_size}
                              </span>
                            </div>
                          )}
                          {jobSheet.paper_gsm && (
                            <div>
                              GSM:{" "}
                              <span className="font-medium">
                                {jobSheet.paper_gsm}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Card */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Production Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center bg-white rounded p-2 border">
                      <div className="text-lg font-bold text-orange-600">
                        {jobSheet.sheet && jobSheet.imp
                          ? (jobSheet.imp / jobSheet.sheet).toFixed(1)
                          : "0"}
                      </div>
                      <div className="text-orange-700">Imp/Sheet</div>
                    </div>

                    <div className="text-center bg-white rounded p-2 border">
                      <div className="text-lg font-bold text-orange-600">
                        {jobSheet.paper_sheet && jobSheet.sheet
                          ? (
                              (jobSheet.sheet / jobSheet.paper_sheet) *
                              100
                            ).toFixed(1)
                          : "0"}
                        %
                      </div>
                      <div className="text-orange-700">Efficiency</div>
                    </div>

                    <div className="text-center bg-white rounded p-2 border">
                      <div className="text-lg font-bold text-orange-600">
                        {jobSheet.sq_inch && jobSheet.sheet
                          ? (jobSheet.sq_inch * jobSheet.sheet).toLocaleString()
                          : "0"}
                      </div>
                      <div className="text-orange-700">Total Sq.In</div>
                    </div>

                    <div className="text-center bg-white rounded p-2 border">
                      <div className="text-lg font-bold text-orange-600">
                        ₹
                        {(
                          (jobSheet.printing || 0) +
                          (jobSheet.uv || 0) +
                          (jobSheet.baking || 0)
                        ).toFixed(0)}
                      </div>
                      <div className="text-orange-700">Total Cost</div>
                    </div>
                  </div>
                </div>

                {/* File Information */}
                {jobSheet.file_url && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Attached Files:
                    </Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      {jobSheet.file_url.match(/\.(jpg|jpeg|png)$/i) ? (
                        <a
                          href={jobSheet.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={jobSheet.file_url}
                            alt="Job File"
                            className="w-full max-w-xs rounded border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a
                          href={jobSheet.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Attached File</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <Separator />
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Created At:</Label>
                  <div className="font-medium">
                    {formatDate(jobSheet.created_at)}
                  </div>
                </div>
                {jobSheet.updated_at && (
                  <div>
                    <Label className="text-gray-600">Last Updated:</Label>
                    <div className="font-medium">
                      {formatDate(jobSheet.updated_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="sheet" className="text-sm font-medium">
                  Sheets *
                </Label>
                {isEditing ? (
                  <Input
                    id="sheet"
                    type="number"
                    min="1"
                    value={editedSheet.sheet || ""}
                    onChange={(e) =>
                      setEditedSheet({
                        ...editedSheet,
                        sheet: parseInt(e.target.value) || null,
                      })
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded font-medium">
                    {jobSheet.sheet?.toLocaleString() || 0}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="plate" className="text-sm font-medium">
                  Plates *
                </Label>
                {isEditing ? (
                  <Input
                    id="plate"
                    type="number"
                    min="1"
                    value={editedSheet.plate || ""}
                    onChange={(e) =>
                      setEditedSheet({
                        ...editedSheet,
                        plate: parseInt(e.target.value) || null,
                      })
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded font-medium">
                    {jobSheet.plate?.toLocaleString() || 0}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="sq_inch" className="text-sm font-medium">
                  Square Inches *
                </Label>
                {isEditing ? (
                  <Input
                    id="sq_inch"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedSheet.sq_inch || ""}
                    onChange={(e) =>
                      setEditedSheet({
                        ...editedSheet,
                        sq_inch: parseFloat(e.target.value) || null,
                      })
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded font-medium">
                    {jobSheet.sq_inch?.toFixed(2) || "0.00"} sq in
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="paper_sheet" className="text-sm font-medium">
                  Paper Sheets *
                </Label>
                {isEditing ? (
                  <Input
                    id="paper_sheet"
                    type="number"
                    min="1"
                    value={editedSheet.paper_sheet || ""}
                    onChange={(e) =>
                      setEditedSheet({
                        ...editedSheet,
                        paper_sheet: parseInt(e.target.value) || null,
                      })
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded font-medium">
                    {jobSheet.paper_sheet?.toLocaleString() || 0}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="imp" className="text-sm font-medium">
                  Impressions *
                </Label>
                {isEditing ? (
                  <Input
                    id="imp"
                    type="number"
                    min="1"
                    value={editedSheet.imp || ""}
                    onChange={(e) =>
                      setEditedSheet({
                        ...editedSheet,
                        imp: parseInt(e.target.value) || null,
                      })
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded font-medium">
                    {jobSheet.imp?.toLocaleString() || 0}
                  </div>
                )}
              </div>
            </div>

            {/* Production Metrics */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">Efficiency</h4>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {jobSheet.sheet && jobSheet.imp
                    ? (jobSheet.imp / jobSheet.sheet).toFixed(1)
                    : "0"}
                </div>
                <p className="text-sm text-purple-700">Impressions per sheet</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Coverage</h4>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {jobSheet.paper_sheet && jobSheet.sheet
                    ? ((jobSheet.sheet / jobSheet.paper_sheet) * 100).toFixed(1)
                    : "0"}
                  %
                </div>
                <p className="text-sm text-green-700">Sheet utilization</p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-900">Area Total</h4>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {jobSheet.sq_inch && jobSheet.sheet
                    ? (jobSheet.sq_inch * jobSheet.sheet).toFixed(0)
                    : "0"}
                </div>
                <p className="text-sm text-orange-700">Total square inches</p>
              </div>
            </div>
          </TabsContent>

          {/* Costing Tab */}
          <TabsContent value="costing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rate" className="text-sm font-medium">
                    Rate per Unit *
                  </Label>
                  {isEditing ? (
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedSheet.rate || ""}
                        onChange={(e) =>
                          setEditedSheet({
                            ...editedSheet,
                            rate: parseFloat(e.target.value) || null,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {formatCurrency(jobSheet.rate || 0)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="printing" className="text-sm font-medium">
                    Printing Cost *
                  </Label>
                  {isEditing ? (
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="printing"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedSheet.printing || ""}
                        onChange={(e) =>
                          setEditedSheet({
                            ...editedSheet,
                            printing: parseFloat(e.target.value) || null,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {formatCurrency(jobSheet.printing || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="uv" className="text-sm font-medium">
                    UV Coating Cost
                  </Label>
                  {isEditing ? (
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="uv"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedSheet.uv || ""}
                        onChange={(e) =>
                          setEditedSheet({
                            ...editedSheet,
                            uv: parseFloat(e.target.value) || null,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {formatCurrency(jobSheet.uv || 0)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="baking" className="text-sm font-medium">
                    Baking Cost
                  </Label>
                  {isEditing ? (
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="baking"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedSheet.baking || ""}
                        onChange={(e) =>
                          setEditedSheet({
                            ...editedSheet,
                            baking: parseFloat(e.target.value) || null,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {formatCurrency(jobSheet.baking || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Summary */}
            <Separator />
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                Cost Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Printing Cost:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(
                        editedSheet.printing || jobSheet.printing || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">UV Coating:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(editedSheet.uv || jobSheet.uv || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Baking:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(
                        editedSheet.baking || jobSheet.baking || 0
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                    <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(getTotalCost())}
                    </p>
                    {jobSheet.imp && getTotalCost() > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {formatCurrency(getTotalCost() / jobSheet.imp)} per
                        impression
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            {/* Add New Note */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <Label
                htmlFor="new-note"
                className="text-sm font-medium mb-2 block"
              >
                Add New Note
              </Label>
              <div className="flex gap-3">
                <Textarea
                  id="new-note"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this job sheet..."
                  className="flex-1"
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isLoading}
                  className="self-end"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {jobSheetNotes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No notes yet</p>
                  <p className="text-sm">
                    Add the first note to track progress and updates
                  </p>
                </div>
              ) : (
                jobSheetNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-white border rounded-lg shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {note.created_at || "Admin"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(note.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{note.note}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
