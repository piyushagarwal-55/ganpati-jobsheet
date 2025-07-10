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
import { useAuth } from "@/components/auth/auth-provider";
import { signOut, getRoleDisplayName } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
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
  LogOut,
  User,
  Monitor,
  Activity,
  TrendingUp,
  Calendar,
  Building2,
  Cog,
  Timer,
  CheckCircle2,
} from "lucide-react";
import {
  supabase,
  subscribeToJobUpdates,
  subscribeToNotifications,
} from "@/lib/supabase";
import type { JobSheet, Machine, OperatorNotification } from "@/lib/supabase";

export default function OperatorDashboard() {
  const { user, loading: authLoading } = useAuth();
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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

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
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <PlayCircle className="mr-2 h-4 w-4" />
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
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
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Job
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
      case "assigned":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getJobStats = () => {
    const total = jobs.length;
    const pending = jobs.filter((j) => j.job_status === "pending").length;
    const assigned = jobs.filter((j) => j.job_status === "assigned").length;
    const inProgress = jobs.filter(
      (j) => j.job_status === "in_progress"
    ).length;
    const completed = jobs.filter((j) => j.job_status === "completed").length;

    return { total, pending, assigned, inProgress, completed };
  };

  // Skip loading screen - show dashboard immediately

  const selectedMachineData = machines.find(
    (m) => m.id.toString() === selectedMachine
  );
  const stats = getJobStats();
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Ganpati Overseas
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Operator Dashboard
                </p>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center space-x-4">
              {selectedMachine && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadJobs}
                  disabled={jobsLoading}
                  className="hidden md:flex"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${jobsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              )}

              <ThemeToggle />

              <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">
                    {user?.name || "Operator"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getRoleDisplayName(user?.role || "operator")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Machine Selection */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-xl">Machine Selection</CardTitle>
            </div>
            <CardDescription>
              Choose your assigned machine to view and manage jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-full max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select your machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id.toString()}>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          machine.status === "active"
                            ? "bg-green-500 shadow-green-500/50 shadow-lg"
                            : machine.status === "maintenance"
                              ? "bg-yellow-500 shadow-yellow-500/50 shadow-lg"
                              : "bg-red-500 shadow-red-500/50 shadow-lg"
                        }`}
                      />
                      <div>
                        <span className="font-medium">{machine.name}</span>
                        {machine.operator_name && (
                          <span className="text-sm text-muted-foreground ml-2">
                            • {machine.operator_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedMachineData && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Cog className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <div>
                      <p className="font-medium">{selectedMachineData.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedMachineData.type} •{" "}
                        {selectedMachineData.operator_name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      selectedMachineData.status === "active"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-yellow-100 text-yellow-800 border-yellow-200"
                    }`}
                  >
                    {selectedMachineData.status}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedMachine && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Total Jobs
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {stats.total}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Assigned
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {stats.assigned}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Timer className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      In Progress
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {stats.inProgress}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Completed
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.completed}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Alerts
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {unreadNotifications}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="jobs" className="space-y-6">
              <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg">
                <TabsTrigger
                  value="jobs"
                  className="flex items-center space-x-2"
                >
                  <Activity className="h-4 w-4" />
                  <span>Active Jobs</span>
                  <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                    {stats.assigned + stats.inProgress}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="flex items-center space-x-2"
                >
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                  {unreadNotifications > 0 && (
                    <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                      {unreadNotifications}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Jobs Tab */}
              <TabsContent value="jobs" className="space-y-6">
                {jobsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card
                        key={i}
                        className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                      >
                        <CardContent className="p-6">
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2"></div>
                            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-2/3"></div>
                            <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <Alert className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No jobs assigned</AlertTitle>
                    <AlertDescription>
                      There are currently no jobs assigned to this machine.
                      Check back later or contact your supervisor.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {jobs.map((job) => (
                      <Card
                        key={job.id}
                        className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                              Job #{job.id}
                            </CardTitle>
                            <Badge
                              className={`${getJobStatusColor(job.job_status)} border font-medium`}
                            >
                              {getStatusIcon(job.job_status)}
                              <span className="ml-1.5 capitalize">
                                {job.job_status.replace("_", " ")}
                              </span>
                            </Badge>
                          </div>
                          <CardDescription className="text-slate-600 dark:text-slate-400 line-clamp-2">
                            {job.description || "No description provided"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <User className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-500">Client</span>
                              </div>
                              <p className="font-medium text-slate-800 dark:text-slate-200">
                                {job.party_name}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-500">Created</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400">
                                {new Date(job.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {(job.assigned_at || job.started_at) && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {job.assigned_at && (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-500">
                                      Assigned
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {new Date(
                                      job.assigned_at
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                              {job.started_at && (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <PlayCircle className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-500">
                                      Started
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {new Date(
                                      job.started_at
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {job.operator_notes && (
                            <>
                              <Separator className="bg-slate-200 dark:bg-slate-700" />
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Operator Notes:
                                </p>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {job.operator_notes}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          <Separator className="bg-slate-200 dark:bg-slate-700" />
                          {getStatusActions(job)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                {notifications.length === 0 ? (
                  <Alert className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <Bell className="h-4 w-4" />
                    <AlertTitle>No notifications</AlertTitle>
                    <AlertDescription>
                      You have no notifications at this time. New alerts will
                      appear here.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={`shadow-lg border-0 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:shadow-xl ${
                          notification.read
                            ? "bg-white/60 dark:bg-slate-800/60"
                            : "bg-blue-50/80 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800"
                        }`}
                        onClick={() =>
                          !notification.read &&
                          markNotificationAsRead(notification.id)
                        }
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Bell className="w-4 h-4 text-blue-600" />
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                                  {notification.title}
                                </h4>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400">
                                {notification.message}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {new Date(
                                    notification.created_at
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
