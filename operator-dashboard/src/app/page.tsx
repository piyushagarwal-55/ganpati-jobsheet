"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Bell,
  Settings,
  RefreshCw,
  CheckCircle,
  Clock,
  PlayCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  supabase,
  subscribeToJobUpdates,
  subscribeToNotifications,
} from "@/lib/supabase";
import type { JobSheet, Machine, OperatorNotification } from "@/lib/supabase";

export default function OperatorDashboard() {
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [jobs, setJobs] = useState<JobSheet[]>([]);
  const [notifications, setNotifications] = useState<OperatorNotification[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Get machine_id from URL parameters if provided
  useEffect(() => {
    const machineIdFromUrl = searchParams.get("machine_id");
    if (machineIdFromUrl) {
      setSelectedMachine(machineIdFromUrl);
    }
  }, [searchParams]);

  // Load machines on component mount
  useEffect(() => {
    loadMachines();
  }, []);

  // Load jobs and notifications when machine is selected
  useEffect(() => {
    if (selectedMachine) {
      loadJobs();
      loadNotifications();

      // Setup real-time subscriptions
      const unsubscribeJobs = subscribeToJobUpdates(
        parseInt(selectedMachine),
        (payload) => {
          console.log("Job update received:", payload);
          loadJobs(); // Reload jobs on any change
          toast({
            title: "Job Updated",
            description: `Job #${payload.new?.id} has been updated`,
          });
        }
      );

      const unsubscribeNotifications = subscribeToNotifications(
        parseInt(selectedMachine),
        (payload) => {
          console.log("Notification received:", payload);
          loadNotifications(); // Reload notifications
          if (payload.eventType === "INSERT") {
            toast({
              title: payload.new?.title || "New Notification",
              description:
                payload.new?.message || "You have a new notification",
              className: "bounce-notification",
            });
          }
        }
      );

      return () => {
        unsubscribeJobs();
        unsubscribeNotifications();
      };
    }
  }, [selectedMachine, toast]);

  const loadMachines = async () => {
    try {
      const { data: machinesData, error } = await supabase
        .from("machines")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setMachines(machinesData || []);
    } catch (error) {
      console.error("Error loading machines:", error);
      toast({
        title: "Error",
        description: "Failed to load machines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    if (!selectedMachine) return;

    setJobsLoading(true);
    try {
      const response = await fetch(
        `/api/jobs?machine_id=${selectedMachine}&limit=20`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setJobsLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!selectedMachine) return;

    try {
      const response = await fetch(
        `/api/notifications?machine_id=${selectedMachine}&limit=10`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const updateJobStatus = async (
    jobId: number,
    newStatus: string,
    notes?: string
  ) => {
    setUpdating(jobId.toString());
    try {
      const response = await fetch(`/api/jobs?job_id=${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_status: newStatus,
          operator_notes: notes,
          machine_id: parseInt(selectedMachine),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast({
        title: "Success",
        description: `Job #${jobId} status updated to ${newStatus}`,
      });

      // Reload jobs to get updated data
      loadJobs();
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(
        `/api/notifications?notification_id=${notificationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ read: true }),
        }
      );

      if (!response.ok) throw new Error("Failed to mark notification as read");
      loadNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "assigned":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <PlayCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusActions = (job: JobSheet) => {
    const jobId = job.id;
    const currentStatus = job.job_status;
    const isUpdating = updating === jobId.toString();

    switch (currentStatus) {
      case "assigned":
        return (
          <Button
            size="sm"
            onClick={() => updateJobStatus(jobId, "in_progress")}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Job
          </Button>
        );
      case "in_progress":
        return (
          <div className="space-y-2">
            <Button
              size="sm"
              onClick={() => updateJobStatus(jobId, "completed")}
              disabled={isUpdating}
              className="w-full"
              variant="default"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Complete
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateJobStatus(jobId, "cancelled", "Cancelled by operator")
              }
              disabled={isUpdating}
              className="w-full"
              variant="destructive"
            >
              Cancel Job
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading Operator Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Operator Dashboard
          </h1>
          <p className="text-muted-foreground">
            Ganpati Overseas - Real-time Job Management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadJobs}
            disabled={jobsLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${jobsLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Machine Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Your Machine</CardTitle>
          <CardDescription>
            Choose the machine you're operating to view assigned jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        machine.status === "active"
                          ? "bg-green-500"
                          : machine.status === "maintenance"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span>{machine.name}</span>
                    {machine.operator_name && (
                      <span className="text-sm text-muted-foreground">
                        ({machine.operator_name})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMachine && (
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              {notifications.filter((n) => !n.read).length > 0 && (
                <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                  {notifications.filter((n) => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {jobsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="loading-shimmer h-4 mb-2 rounded" />
                      <div className="loading-shimmer h-3 mb-2 rounded w-3/4" />
                      <div className="loading-shimmer h-3 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No jobs assigned</AlertTitle>
                <AlertDescription>
                  There are currently no jobs assigned to this machine.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="job-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Job #{job.id}</CardTitle>
                        <Badge
                          className={`status-badge status-${job.job_status}`}
                        >
                          {getStatusIcon(job.job_status)}
                          <span className="ml-1 capitalize">
                            {job.job_status.replace("_", " ")}
                          </span>
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {job.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Client:</span>
                          <span className="font-medium">{job.party_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Created:
                          </span>
                          <span>
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {job.assigned_at && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Assigned:
                            </span>
                            <span>
                              {new Date(job.assigned_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {job.started_at && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Started:
                            </span>
                            <span>
                              {new Date(job.started_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {job.operator_notes && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Notes:
                            </p>
                            <p className="text-sm bg-muted p-2 rounded">
                              {job.operator_notes}
                            </p>
                          </div>
                        </>
                      )}

                      <Separator />
                      {getStatusActions(job)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {notifications.length === 0 ? (
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertTitle>No notifications</AlertTitle>
                <AlertDescription>
                  You have no notifications at this time.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-colors ${
                      notification.read
                        ? "notification-read"
                        : "notification-unread"
                    }`}
                    onClick={() =>
                      !notification.read &&
                      markNotificationAsRead(notification.id)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
