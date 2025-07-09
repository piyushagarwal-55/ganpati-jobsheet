"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useOperatorDashboard } from "@/hooks/useMachines";
import { JobSheetWithMachine, JOB_STATUSES } from "@/types/machine";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  FileText,
  Calendar,
  Activity,
  Pause,
  X,
  RefreshCw,
  Eye,
} from "lucide-react";

const statusColorMap = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  assigned: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const JobActionDialog = ({
  open,
  onOpenChange,
  job,
  action,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobSheetWithMachine | null;
  action: string;
  onSubmit: (jobId: number, action: string, notes?: string) => Promise<void>;
}) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setLoading(true);
    try {
      await onSubmit(job.id, action, notes);
      onOpenChange(false);
      setNotes("");
    } catch (error) {
      console.error("Error submitting action:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case "start":
        return "Start Job";
      case "complete":
        return "Complete Job";
      case "cancel":
        return "Cancel Job";
      case "update_notes":
        return "Update Notes";
      default:
        return "Update Job";
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case "start":
        return "Mark this job as in progress and begin work.";
      case "complete":
        return "Mark this job as completed.";
      case "cancel":
        return "Cancel this job. Please provide a reason.";
      case "update_notes":
        return "Add or update operator notes for this job.";
      default:
        return "Update job status.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getActionTitle()}</DialogTitle>
          <DialogDescription>{getActionDescription()}</DialogDescription>
        </DialogHeader>
        {job && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium">{job.description}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Party: {job.party_name} • Date:{" "}
                {new Date(job.job_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Size: {job.size} • Sheets: {job.paper_sheet}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="operator-notes">
                  {action === "cancel"
                    ? "Cancellation Reason"
                    : "Operator Notes"}
                  {action === "cancel" && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Textarea
                  id="operator-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    action === "cancel"
                      ? "Please provide a reason for cancellation..."
                      : "Add notes about this job..."
                  }
                  rows={3}
                  required={action === "cancel"}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  variant={action === "cancel" ? "destructive" : "default"}
                >
                  {getActionTitle()}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const JobDetailDialog = ({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobSheetWithMachine | null;
}) => {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            Complete information for this job
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Job Description
              </Label>
              <p className="mt-1 font-medium">{job.description}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Party Name
              </Label>
              <p className="mt-1 font-medium">{job.party_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Job Date
              </Label>
              <p className="mt-1">
                {new Date(job.job_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Size</Label>
              <p className="mt-1">{job.size}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Square Inch
              </Label>
              <p className="mt-1">{job.sq_inch}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Paper Sheets
              </Label>
              <p className="mt-1">{job.paper_sheet}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Impressions
              </Label>
              <p className="mt-1">{job.imp}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Plate</Label>
              <p className="mt-1">{job.plate}</p>
            </div>
          </div>

          {(job.printing || job.uv || job.baking) && (
            <div className="grid grid-cols-3 gap-4">
              {job.printing && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Printing Cost
                  </Label>
                  <p className="mt-1">₹{job.printing}</p>
                </div>
              )}
              {job.uv && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    UV Cost
                  </Label>
                  <p className="mt-1">₹{job.uv}</p>
                </div>
              )}
              {job.baking && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Baking Cost
                  </Label>
                  <p className="mt-1">₹{job.baking}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Status
              </Label>
              <div className="mt-1">
                <Badge className={statusColorMap[job.job_status]}>
                  {job.job_status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Assigned At
              </Label>
              <p className="mt-1">
                {job.assigned_at
                  ? new Date(job.assigned_at).toLocaleString()
                  : "Not assigned"}
              </p>
            </div>
          </div>

          {job.operator_notes && (
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Operator Notes
              </Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{job.operator_notes}</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function OperatorDashboardPage() {
  const params = useParams();
  const machineId = parseInt(params.id as string);

  const { dashboardData, loading, error, updateJobStatus, refreshDashboard } =
    useOperatorDashboard(machineId);

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    job: JobSheetWithMachine | null;
    action: string;
  }>({ open: false, job: null, action: "" });

  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    job: JobSheetWithMachine | null;
  }>({ open: false, job: null });

  const handleJobAction = async (
    jobId: number,
    action: string,
    notes?: string
  ) => {
    const success = await updateJobStatus(jobId, action, notes);
    if (success) {
      toast({
        title: "Success",
        description: `Job ${action}ed successfully`,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <Activity className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Error Loading Dashboard
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refreshDashboard}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Machine Not Found
              </h3>
              <p className="text-gray-600">
                The requested machine could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { machine, assigned_jobs, in_progress_jobs, completed_today, stats } =
    dashboardData;

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {machine.name} - Operator Dashboard
            </h1>
            <p className="text-gray-600">
              Operator: {machine.operator_name || "Not assigned"} • Status:{" "}
              <span className="capitalize">{machine.status}</span>
            </p>
          </div>
          <Button onClick={refreshDashboard} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Assigned Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.assigned_jobs}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.in_progress_jobs}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed_today || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {stats.completed_jobs}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Jobs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Assigned Jobs ({assigned_jobs.length})
              </CardTitle>
              <CardDescription>Jobs ready to start</CardDescription>
            </CardHeader>
            <CardContent>
              {assigned_jobs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No jobs assigned
                </p>
              ) : (
                <div className="space-y-3">
                  {assigned_jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{job.description}</h4>
                        <p className="text-sm text-gray-600">
                          {job.party_name} • {job.size} • {job.paper_sheet}{" "}
                          sheets
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailDialog({ open: true, job })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              job,
                              action: "start",
                            })
                          }
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* In Progress Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-yellow-600" />
                In Progress ({in_progress_jobs.length})
              </CardTitle>
              <CardDescription>Jobs currently being worked on</CardDescription>
            </CardHeader>
            <CardContent>
              {in_progress_jobs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No jobs in progress
                </p>
              ) : (
                <div className="space-y-3">
                  {in_progress_jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{job.description}</h4>
                        <p className="text-sm text-gray-600">
                          {job.party_name} • Started:{" "}
                          {job.started_at
                            ? new Date(job.started_at).toLocaleTimeString()
                            : "Unknown"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailDialog({ open: true, job })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              job,
                              action: "update_notes",
                            })
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              job,
                              action: "complete",
                            })
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Completed Today */}
        {completed_today.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Completed Today ({completed_today.length})
              </CardTitle>
              <CardDescription>Jobs completed today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completed_today.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{job.description}</h4>
                      <p className="text-sm text-gray-600">
                        {job.party_name} • Completed:{" "}
                        {job.completed_at
                          ? new Date(job.completed_at).toLocaleTimeString()
                          : "Unknown"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailDialog({ open: true, job })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Dialog */}
        <JobActionDialog
          open={actionDialog.open}
          onOpenChange={(open) =>
            setActionDialog({
              open,
              job: actionDialog.job,
              action: actionDialog.action,
            })
          }
          job={actionDialog.job}
          action={actionDialog.action}
          onSubmit={handleJobAction}
        />

        {/* Detail Dialog */}
        <JobDetailDialog
          open={detailDialog.open}
          onOpenChange={(open) =>
            setDetailDialog({ open, job: detailDialog.job })
          }
          job={detailDialog.job}
        />
      </div>
    </div>
  );
}
