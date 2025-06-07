// src/components/job-sheets/JobSheetsTable.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Calendar,
  Banknote,
  Layers,
  Filter,
  Search,
  Plus,
  Eye,
  MessageSquare,
  User,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { JobSheet, JobSheetNote } from "@/types/jobsheet";
import { Label } from "@/components/ui/label";

interface JobSheetsTableProps {
  jobSheets: JobSheet[];
  notes: JobSheetNote[];
  searchTerm: string;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  updateJobSheet: (
    id: number,
    updates: Partial<JobSheet>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteJobSheet: (id: number) => Promise<{ success: boolean; error?: string }>;
  addNote: (
    jobSheetId: number,
    note: string
  ) => Promise<{ success: boolean; error?: string }>;
  generateReport: (
    jobSheetId: number
  ) => Promise<{ success: boolean; error?: string }>;
  setSelectedJobSheet: (jobSheet: JobSheet | null) => void;
  onRefresh?: () => Promise<void> | void;
  softDeleteJobSheet?: (
    id: number,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function JobSheetsTable({
  jobSheets,
  notes,
  searchTerm,
  dateFilter,
  setDateFilter,
  updateJobSheet,
  deleteJobSheet,
  addNote,
  generateReport,
  setSelectedJobSheet,
  onRefresh,
  softDeleteJobSheet,
}: JobSheetsTableProps) {
  const [isLoading, setIsLoading] = useState<{ [key: number]: boolean }>({});
  const [quickEditId, setQuickEditId] = useState<number | null>(null);
  const [quickEditValues, setQuickEditValues] = useState<{
    [key: string]: string;
  }>({});
  const [newNoteId, setNewNoteId] = useState<number | null>(null);
  const [newNoteText, setNewNoteText] = useState("");

  // Soft delete dialog state
  const [softDeleteId, setSoftDeleteId] = useState<number | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  // Filter job sheets
  const filteredJobSheets = jobSheets.filter((sheet) => {
    const matchesSearch =
      sheet.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.size?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.id.toString().includes(searchTerm);

    const matchesDate = (() => {
      if (dateFilter === "all") return true;
      if (!sheet.job_date) return false;

      const jobDate = new Date(sheet.job_date);
      const now = new Date();

      switch (dateFilter) {
        case "today":
          return jobDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return jobDate >= weekAgo;
        case "month":
          return (
            jobDate.getMonth() === now.getMonth() &&
            jobDate.getFullYear() === now.getFullYear()
          );
        case "quarter":
          const quarterStart = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1
          );
          return jobDate >= quarterStart;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesDate;
  });

  // For now, treat all job sheets as active until soft delete is properly implemented
  const activeJobSheets = filteredJobSheets;
  const deletedJobSheets: any[] = [];

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTotalCost = (sheet: JobSheet) => {
    return (sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0);
  };

  const getJobSheetNotes = (jobSheetId: number) => {
    return notes
      ? notes.filter((note) => note.job_sheet_id === jobSheetId)
      : [];
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Party Name",
      "Description",
      "Size",
      "Sheets",
      "Plates",
      "Paper Sheets",
      "Impressions",
      "Square Inches",
      "Rate",
      "Plate Code",
      "Printing Cost",
      "UV Cost",
      "Baking Cost",
      "Total Cost",
    ];

    const csvData = filteredJobSheets.map((sheet) => [
      sheet.id,
      formatDate(sheet.job_date),
      sheet.party_name || "",
      sheet.description || "",
      sheet.size || "",
      sheet.sheet || 0,
      sheet.plate || 0,
      sheet.paper_sheet || 0,
      sheet.imp || 0,
      sheet.sq_inch || 0,
      sheet.rate || 0,
      sheet.plate_code || 0,
      sheet.printing || 0,
      sheet.uv || 0,
      sheet.baking || 0,
      getTotalCost(sheet),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `job-sheets-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickEdit = async (id: number, field: string, value: string) => {
    setIsLoading({ ...isLoading, [id]: true });

    const updates: any = { [field]: value };

    // Convert to appropriate types
    if (["sheet", "plate", "paper_sheet", "imp"].includes(field)) {
      updates[field] = parseInt(value) || null;
    } else if (
      ["sq_inch", "rate", "printing", "uv", "baking"].includes(field)
    ) {
      updates[field] = parseFloat(value) || null;
    }

    const result = await updateJobSheet(id, updates);

    setIsLoading({ ...isLoading, [id]: false });

    if (result.success) {
      setQuickEditId(null);
      setQuickEditValues({});
    } else {
      alert(`Failed to update: ${result.error}`);
    }
  };

  const handleDelete = async (id: number) => {
    console.log(`[TABLE] Starting delete process for job sheet ${id}`);
    setIsLoading({ ...isLoading, [id]: true });

    const result = await deleteJobSheet(id);
    setIsLoading({ ...isLoading, [id]: false });

    if (result.success) {
      console.log(`[TABLE] Job sheet ${id} successfully deleted`);

      // Call refresh callback if provided to ensure dashboard updates
      if (onRefresh) {
        console.log(`[TABLE] Calling onRefresh callback`);
        await onRefresh();
      }

      // Show success message
      alert(
        "Job sheet deleted successfully. The item should now be removed from the table."
      );
    } else {
      console.error(`[TABLE] Failed to delete job sheet ${id}:`, result.error);
      alert(`Failed to delete: ${result.error}`);
    }
  };

  const handleAddNote = async (jobSheetId: number) => {
    if (!newNoteText.trim()) return;

    setIsLoading({ ...isLoading, [jobSheetId]: true });
    const result = await addNote(jobSheetId, newNoteText.trim());
    setIsLoading({ ...isLoading, [jobSheetId]: false });

    if (result.success) {
      setNewNoteId(null);
      setNewNoteText("");
    } else {
      alert(`Failed to add note: ${result.error}`);
    }
  };

  const handleGenerateReport = async (id: number) => {
    setIsLoading({ ...isLoading, [id]: true });
    const result = await generateReport(id);
    setIsLoading({ ...isLoading, [id]: false });

    if (!result.success) {
      alert(`Failed to generate report: ${result.error}`);
    }
  };

  const handleSoftDelete = async (id: number, reason: string) => {
    if (!softDeleteJobSheet) {
      alert("Soft delete functionality not available");
      return;
    }

    setIsLoading({ ...isLoading, [id]: true });
    const result = await softDeleteJobSheet(id, reason);
    setIsLoading({ ...isLoading, [id]: false });

    if (result.success) {
      console.log(`Job sheet ${id} successfully soft deleted`);

      // Call refresh callback if provided to ensure dashboard updates
      if (onRefresh) {
        await onRefresh();
      }

      // Reset dialog state
      setSoftDeleteId(null);
      setDeletionReason("");

      // Show success message
      alert(
        "Transaction marked as deleted successfully. It remains visible for audit purposes."
      );
    } else {
      alert(`Failed to delete transaction: ${result.error}`);
    }
  };

  return (
    <div className="mt-8">
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Job Sheets Management
              <Badge
                variant="secondary"
                className="ml-2 bg-primary/10 text-primary"
              >
                {filteredJobSheets.length} of {jobSheets.length}
              </Badge>
            </CardTitle>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Refresh Button */}
              <Button
                onClick={onRefresh}
                variant="outline"
                className="w-full sm:w-auto border-blue-200 hover:border-blue-400 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>

              {/* Export Button */}
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="w-full sm:w-auto border-success/20 hover:border-success/40 hover:bg-success/5"
                disabled={filteredJobSheets.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>

              {/* New Job Sheet Button */}
              <Button
                onClick={() => (window.location.href = "/job-sheet-form")}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Job Sheet
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search Results Info */}
          {searchTerm && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-primary">
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Showing {filteredJobSheets.length} results for "{searchTerm}"
                </span>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold text-foreground">
                    ID
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Party Name
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Description
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Size
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    GSM
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Job Type
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Impressions
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Total Cost
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Balance
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobSheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <FileText className="w-12 h-12" />
                        <div>
                          <p className="font-medium">No job sheets found</p>
                          <p className="text-sm">
                            {searchTerm
                              ? `No job sheets match "${searchTerm}"`
                              : "Create your first job sheet to get started"}
                          </p>
                        </div>
                        {!searchTerm && (
                          <Button
                            onClick={() =>
                              (window.location.href = "/job-sheet-form")
                            }
                            className="mt-2 bg-primary hover:bg-primary/90"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Job Sheet
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobSheets.map((sheet) => {
                    const sheetNotes = getJobSheetNotes(sheet.id);
                    const totalCost = getTotalCost(sheet);
                    const loading = isLoading[sheet.id];

                    return (
                      <TableRow
                        key={sheet.id}
                        className={`transition-colors ${
                          sheet.is_deleted
                            ? "bg-red-50 hover:bg-red-100 opacity-75"
                            : "hover:bg-muted/20"
                        }`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                sheet.is_deleted
                                  ? "text-red-600"
                                  : "text-primary"
                              }`}
                            >
                              #{sheet.id}
                            </span>
                            {sheet.is_deleted && (
                              <Badge variant="destructive" className="text-xs">
                                DELETED
                              </Badge>
                            )}
                          </div>
                          {sheet.is_deleted && sheet.deletion_reason && (
                            <div className="text-xs text-red-600 mt-1">
                              Reason: {sheet.deletion_reason}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(sheet.job_date)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {sheet.party_name || "No party name"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {quickEditId === sheet.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={
                                  quickEditValues.description ||
                                  sheet.description ||
                                  ""
                                }
                                onChange={(e) =>
                                  setQuickEditValues({
                                    ...quickEditValues,
                                    description: e.target.value,
                                  })
                                }
                                className="w-48"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleQuickEdit(
                                      sheet.id,
                                      "description",
                                      quickEditValues.description || ""
                                    );
                                  } else if (e.key === "Escape") {
                                    setQuickEditId(null);
                                    setQuickEditValues({});
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleQuickEdit(
                                    sheet.id,
                                    "description",
                                    quickEditValues.description || ""
                                  )
                                }
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90"
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted/30 p-1 rounded max-w-xs transition-colors"
                              onClick={() => {
                                setQuickEditId(sheet.id);
                                setQuickEditValues({
                                  description: sheet.description || "",
                                });
                              }}
                            >
                              <p className="text-sm font-medium truncate">
                                {sheet.description ||
                                  "Click to add description"}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium">
                                {sheet.size || "N/A"}
                              </div>
                              {sheet.sq_inch && (
                                <div className="text-xs text-muted-foreground">
                                  {sheet.sq_inch} sq in
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {sheet.gsm || "N/A"} GSM
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {sheet.paper_sheet || 0} paper sheets
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              sheet.job_type === "front-back"
                                ? "secondary"
                                : "default"
                            }
                            className={`text-xs ${
                              sheet.job_type === "front-back"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {sheet.job_type === "front-back"
                              ? "Front-Back"
                              : sheet.job_type === "single-single"
                                ? "Single-Single"
                                : "N/A"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {sheet.imp?.toLocaleString() || 0}
                            </div>
                            <div className="text-muted-foreground">
                              {sheet.plate || 0} plates
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-success" />
                            <div>
                              <div className="font-semibold text-success">
                                {formatCurrency(totalCost)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rate: {formatCurrency(sheet.rate || 0)}
                                {sheet.plate_code &&
                                  parseFloat(sheet.plate_code.toString()) >
                                    0 && (
                                    <div>
                                      Plate: ₹{sheet.plate_code} ×{" "}
                                      {sheet.plate || 0}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-sm">
                                ₹{(sheet.party_balance_after ?? 0).toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sheet.party_name}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedJobSheet(sheet)}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={loading}
                                  className="hover:bg-muted/50"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setSelectedJobSheet(sheet)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setQuickEditId(sheet.id);
                                    setQuickEditValues({
                                      description: sheet.description || "",
                                      party_name: sheet.party_name || "",
                                    });
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleGenerateReport(sheet.id)}
                                  disabled={loading}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Generate Report
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* Soft delete temporarily disabled until database migration is applied */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Job Sheet
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete job
                                        sheet #{sheet.id}? This action cannot be
                                        undone and will also delete all
                                        associated notes.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(sheet.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer with Summary */}
          {filteredJobSheets.length > 0 && (
            <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border/30">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Active Job Sheets</p>
                  <p className="font-semibold">{activeJobSheets.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deleted Job Sheets</p>
                  <p className="font-semibold text-red-600">
                    {deletedJobSheets.length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Revenue</p>
                  <p className="font-semibold text-success">
                    {formatCurrency(
                      activeJobSheets.reduce(
                        (sum, sheet) => sum + getTotalCost(sheet),
                        0
                      )
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Sheets</p>
                  <p className="font-semibold">
                    {activeJobSheets
                      .reduce((sum, sheet) => sum + (sheet.paper_sheet || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Impressions</p>
                  <p className="font-semibold">
                    {activeJobSheets
                      .reduce((sum, sheet) => sum + (sheet.imp || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog
        open={softDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSoftDeleteId(null);
            setDeletionReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Transaction as Deleted</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark job sheet #{softDeleteId} as deleted while keeping
              it visible for audit purposes. Please provide a reason for this
              deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deletion-reason" className="text-sm font-medium">
              Deletion Reason <span className="text-red-500">*</span>
            </Label>
            <Input
              id="deletion-reason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Enter reason for deletion..."
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSoftDeleteId(null);
                setDeletionReason("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (softDeleteId && deletionReason.trim()) {
                  handleSoftDelete(softDeleteId, deletionReason.trim());
                } else {
                  alert("Please provide a reason for deletion");
                }
              }}
              disabled={!deletionReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Mark as Deleted
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
