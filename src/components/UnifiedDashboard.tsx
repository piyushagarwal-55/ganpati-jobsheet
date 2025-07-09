"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cog,
  Package,
  Pause,
  Play,
  RefreshCw,
  TrendingUp,
  Users,
  Warehouse,
  Zap,
  BarChart3,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WorkflowStats {
  total_jobs: number;
  jobs_by_status: Record<string, number>;
  machine_utilization: Record<string, number>;
  inventory_consumption_today: number;
  active_machines: number;
  busy_machines: number;
}

interface WorkflowOverview {
  active_jobs: any[];
  machine_status: any[];
  low_inventory: any[];
}

interface JobWorkflow {
  id: number;
  job_date: string;
  party_name: string;
  description: string;
  job_status: string;
  machine_id?: number;
  machine_name?: string;
  operator_name?: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  paper_sheet: number;
  used_from_inventory: boolean;
  inventory_consumed: boolean;
  party_balance_updated: boolean;
  total_cost: number;
}

export default function UnifiedDashboard() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [overview, setOverview] = useState<WorkflowOverview | null>(null);
  const [recentActivities, setRecentActivities] = useState<JobWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWorkflow | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, overviewResponse, activitiesResponse] =
        await Promise.allSettled([
          fetch("/api/workflow?action=stats"),
          fetch("/api/workflow?action=overview"),
          fetch("/api/workflow"),
        ]);

      if (statsResponse.status === "fulfilled" && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      if (
        overviewResponse.status === "fulfilled" &&
        overviewResponse.value.ok
      ) {
        const overviewData = await overviewResponse.value.json();
        if (overviewData.success) {
          setOverview(overviewData.data);
        }
      }

      if (
        activitiesResponse.status === "fulfilled" &&
        activitiesResponse.value.ok
      ) {
        const activitiesData = await activitiesResponse.value.json();
        if (activitiesData.success) {
          setRecentActivities(activitiesData.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const updateJobStatus = async (jobId: number, newStatus: string) => {
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          job_sheet_id: jobId,
          status: newStatus,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        await refreshDashboard();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "created":
        return "bg-blue-100 text-blue-800";
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "created":
        return <FileText className="w-4 h-4" />;
      case "assigned":
        return <Clock className="w-4 h-4" />;
      case "in_progress":
        return <Play className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <Pause className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unified Dashboard</h1>
          <p className="text-gray-600">
            Real-time integration across job sheets, machines, and inventory
          </p>
        </div>
        <Button
          onClick={refreshDashboard}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="w-4 h-4 mr-2 text-blue-600" />
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_jobs}</div>
              <div className="text-xs text-gray-500 mt-1">
                Active:{" "}
                {(stats.jobs_by_status?.assigned || 0) +
                  (stats.jobs_by_status?.in_progress || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Cog className="w-4 h-4 mr-2 text-green-600" />
                Machines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_machines}</div>
              <div className="text-xs text-gray-500 mt-1">
                Busy: {stats.busy_machines}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Package className="w-4 h-4 mr-2 text-orange-600" />
                Inventory Used Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.inventory_consumption_today}
              </div>
              <div className="text-xs text-gray-500 mt-1">sheets</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.jobs_by_status?.completed || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">jobs</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="machines">Machine Status</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Alerts</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Job Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.jobs_by_status && (
                    <div className="space-y-3">
                      {Object.entries(stats.jobs_by_status).map(
                        ([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              {getStatusIcon(status)}
                              <span className="ml-2 capitalize">{status}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${(count / stats.total_jobs) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8">
                                {count}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Machine Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Machine Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.machine_utilization && (
                    <div className="space-y-3">
                      {Object.entries(stats.machine_utilization).map(
                        ([machine, utilization]) => (
                          <div key={machine} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{machine}</span>
                              <span>{utilization}%</span>
                            </div>
                            <Progress
                              value={Number(utilization)}
                              className="h-2"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          {overview?.active_jobs && (
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overview.active_jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(job.job_status)}>
                            {getStatusIcon(job.job_status)}
                            <span className="ml-1">{job.job_status}</span>
                          </Badge>
                          <span className="font-medium">#{job.id}</span>
                          <span className="text-gray-600">
                            {job.party_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {job.description}
                        </p>
                        {job.machine_name && (
                          <p className="text-sm text-blue-600">
                            Machine: {job.machine_name}
                            {job.operator_name && ` (${job.operator_name})`}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {job.job_status === "assigned" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateJobStatus(job.id, "in_progress")
                            }
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {job.job_status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateJobStatus(job.id, "completed")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {overview.active_jobs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No active jobs at the moment
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          {overview?.machine_status && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.machine_status.map((machine) => (
                <Card key={machine.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{machine.name}</span>
                      <Badge
                        variant={machine.is_available ? "default" : "secondary"}
                      >
                        {machine.is_available ? "Available" : "Busy"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Jobs:</span>
                        <span>
                          {machine.current_job_count} /{" "}
                          {machine.max_concurrent_jobs}
                        </span>
                      </div>
                      <Progress
                        value={
                          (machine.current_job_count /
                            machine.max_concurrent_jobs) *
                          100
                        }
                        className="h-2"
                      />
                      {machine.operator_name && (
                        <div className="flex justify-between text-sm">
                          <span>Operator:</span>
                          <span>{machine.operator_name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          {overview?.low_inventory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                  Low Inventory Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.low_inventory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50"
                    >
                      <div>
                        <div className="font-medium">
                          {item.paper_type_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.gsm} GSM
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-orange-700">
                          {item.available_quantity} sheets
                        </div>
                        <div className="text-sm text-gray-600">available</div>
                      </div>
                    </div>
                  ))}
                  {overview.low_inventory.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No low inventory alerts
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={`${activity.id}-${activity.workflow_updated_at}`}
                    className="flex items-start space-x-3 p-3 border-l-2 border-blue-200"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(activity.job_status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">#{activity.id}</span>
                        <Badge
                          className={getStatusColor(activity.job_status)}
                          size="sm"
                        >
                          {activity.job_status}
                        </Badge>
                        {activity.inventory_consumed && (
                          <Badge variant="outline" size="sm">
                            <Package className="w-3 h-3 mr-1" />
                            Inventory Used
                          </Badge>
                        )}
                        {activity.machine_name && (
                          <Badge variant="outline" size="sm">
                            <Cog className="w-3 h-3 mr-1" />
                            {activity.machine_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.party_name}
                      </p>
                      {activity.total_cost > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Cost: ₹{activity.total_cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(
                        activity.workflow_updated_at
                      ).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No recent activities
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
