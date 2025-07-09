import { useState, useEffect, useCallback } from "react";

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

interface WorkflowStatus {
  job_sheet_id: number;
  status: string;
  machine_id?: number;
  machine_name?: string;
  inventory_consumed: boolean;
  party_balance_updated: boolean;
  created_at: string;
  updated_at: string;
}

export function useIntegration() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [overview, setOverview] = useState<WorkflowOverview | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workflow statistics
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/workflow?action=stats");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch stats");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch workflow overview
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/workflow?action=overview");
      const result = await response.json();

      if (result.success) {
        setOverview(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch overview");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch recent activities
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/workflow");
      const result = await response.json();

      if (result.success) {
        setRecentActivities(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch activities");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specific job workflow status
  const getJobStatus = useCallback(
    async (jobSheetId: number): Promise<WorkflowStatus | null> => {
      try {
        const response = await fetch(
          `/api/workflow?action=status&jobSheetId=${jobSheetId}`
        );
        const result = await response.json();

        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.error || "Failed to fetch job status");
        }
      } catch (err: any) {
        console.error("Failed to get job status:", err);
        return null;
      }
    },
    []
  );

  // Update job status
  const updateJobStatus = useCallback(
    async (
      jobSheetId: number,
      status: string,
      operatorNotes?: string
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        const response = await fetch("/api/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_status",
            job_sheet_id: jobSheetId,
            status,
            operator_notes: operatorNotes,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Refresh data after successful update
          await Promise.all([fetchStats(), fetchOverview(), fetchActivities()]);
        }

        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchStats, fetchOverview, fetchActivities]
  );

  // Reassign job to different machine
  const reassignJob = useCallback(
    async (
      jobSheetId: number,
      machineId: number,
      operatorNotes?: string
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        const response = await fetch("/api/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reassign_machine",
            job_sheet_id: jobSheetId,
            machine_id: machineId,
            operator_notes: operatorNotes,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Refresh data after successful reassignment
          await Promise.all([fetchStats(), fetchOverview(), fetchActivities()]);
        }

        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchStats, fetchOverview, fetchActivities]
  );

  // Release machine from job
  const releaseMachine = useCallback(
    async (
      jobSheetId: number,
      operatorNotes?: string
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        const response = await fetch("/api/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "release_machine",
            job_sheet_id: jobSheetId,
            operator_notes: operatorNotes,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Refresh data after successful release
          await Promise.all([fetchStats(), fetchOverview(), fetchActivities()]);
        }

        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchStats, fetchOverview, fetchActivities]
  );

  // Bulk update job statuses
  const bulkUpdateStatus = useCallback(
    async (
      jobSheetIds: number[],
      targetStatus: string
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        const response = await fetch("/api/workflow", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_status_update",
            job_sheet_ids: jobSheetIds,
            target_status: targetStatus,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Refresh data after successful bulk update
          await Promise.all([fetchStats(), fetchOverview(), fetchActivities()]);
        }

        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchStats, fetchOverview, fetchActivities]
  );

  // Bulk assign jobs to machine
  const bulkAssignMachine = useCallback(
    async (
      jobSheetIds: number[],
      machineId: number
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        const response = await fetch("/api/workflow", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_machine_assign",
            job_sheet_ids: jobSheetIds,
            target_machine_id: machineId,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Refresh data after successful bulk assignment
          await Promise.all([fetchStats(), fetchOverview(), fetchActivities()]);
        }

        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchStats, fetchOverview, fetchActivities]
  );

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([fetchStats(), fetchOverview(), fetchActivities()]);
  }, [fetchStats, fetchOverview, fetchActivities]);

  // Auto-refresh data
  useEffect(() => {
    refreshData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    // Data
    stats,
    overview,
    recentActivities,
    loading,
    error,

    // Individual actions
    getJobStatus,
    updateJobStatus,
    reassignJob,
    releaseMachine,

    // Bulk actions
    bulkUpdateStatus,
    bulkAssignMachine,

    // Data management
    refreshData,
    fetchStats,
    fetchOverview,
    fetchActivities,
  };
}
