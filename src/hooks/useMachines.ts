import { useState, useEffect } from "react";
import {
  Machine,
  MachineFormData,
  MachineWithStats,
  OperatorDashboardData,
  MachineAssignmentData,
} from "@/types/machine";

export interface UseMachinesReturn {
  machines: Machine[];
  machinesWithStats: MachineWithStats[];
  loading: boolean;
  error: string | null;
  createMachine: (data: MachineFormData) => Promise<Machine | null>;
  updateMachine: (
    id: number,
    data: Partial<MachineFormData>
  ) => Promise<Machine | null>;
  deleteMachine: (id: number) => Promise<boolean>;
  assignJob: (data: MachineAssignmentData) => Promise<boolean>;
  reassignJob: (
    jobId: number,
    newMachineId: number,
    reason?: string,
    operatorNotes?: string
  ) => Promise<boolean>;
  refreshMachines: () => Promise<void>;
}

export function useMachines(): UseMachinesReturn {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesWithStats, setMachinesWithStats] = useState<
    MachineWithStats[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("/api/machines", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch machines");
      }

      setMachines(result.data || []);

      // Fetch stats for each machine (with error handling)
      const machinesWithStatsData = await Promise.all(
        (result.data || []).map(async (machine: Machine) => {
          try {
            const statsController = new AbortController();
            const statsTimeoutId = setTimeout(
              () => statsController.abort(),
              5000
            );

            const statsResponse = await fetch(
              `/api/machines/${machine.id}/operator`,
              {
                signal: statsController.signal,
              }
            );

            clearTimeout(statsTimeoutId);

            if (statsResponse.ok) {
              const statsResult = await statsResponse.json();
              if (statsResult.success) {
                return {
                  ...machine,
                  stats: statsResult.data.stats,
                };
              }
            }
            return machine;
          } catch (err) {
            console.warn(
              `Failed to fetch stats for machine ${machine.id}:`,
              err
            );
            return machine;
          }
        })
      );

      setMachinesWithStats(machinesWithStatsData);
    } catch (err) {
      console.error("Error fetching machines:", err);
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("Request timed out. Please check your connection.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred");
      }
      // Set empty arrays on error so UI doesn't break
      setMachines([]);
      setMachinesWithStats([]);
    } finally {
      setLoading(false);
    }
  };

  const createMachine = async (
    data: MachineFormData
  ): Promise<Machine | null> => {
    try {
      setError(null);

      const response = await fetch("/api/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create machine");
      }

      // Refresh machines list
      await fetchMachines();
      return result.data;
    } catch (err) {
      console.error("Error creating machine:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    }
  };

  const updateMachine = async (
    id: number,
    data: Partial<MachineFormData>
  ): Promise<Machine | null> => {
    try {
      setError(null);

      const response = await fetch("/api/machines", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...data }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update machine");
      }

      // Refresh machines list
      await fetchMachines();
      return result.data;
    } catch (err) {
      console.error("Error updating machine:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    }
  };

  const deleteMachine = async (id: number): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/machines?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete machine");
      }

      // Refresh machines list
      await fetchMachines();
      return true;
    } catch (err) {
      console.error("Error deleting machine:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const assignJob = async (data: MachineAssignmentData): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch("/api/machines/assign-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to assign job");
      }

      // Refresh machines to update availability
      await fetchMachines();
      return true;
    } catch (err) {
      console.error("Error assigning job:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const reassignJob = async (
    jobId: number,
    newMachineId: number,
    reason?: string,
    operatorNotes?: string
  ): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch("/api/machines/assign-job", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_sheet_id: jobId,
          new_machine_id: newMachineId,
          reason,
          operator_notes: operatorNotes,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to reassign job");
      }

      // Refresh machines to update availability
      await fetchMachines();
      return true;
    } catch (err) {
      console.error("Error reassigning job:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const refreshMachines = async () => {
    await fetchMachines();
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  return {
    machines,
    machinesWithStats,
    loading,
    error,
    createMachine,
    updateMachine,
    deleteMachine,
    assignJob,
    reassignJob,
    refreshMachines,
  };
}

export interface UseOperatorDashboardReturn {
  dashboardData: OperatorDashboardData | null;
  loading: boolean;
  error: string | null;
  updateJobStatus: (
    jobId: number,
    action: string,
    operatorNotes?: string
  ) => Promise<boolean>;
  refreshDashboard: () => Promise<void>;
}

export function useOperatorDashboard(
  machineId: number
): UseOperatorDashboardReturn {
  const [dashboardData, setDashboardData] =
    useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!machineId) return;

    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/machines/${machineId}/operator`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch dashboard data");
      }

      setDashboardData(result.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError("Request timed out. Please check your connection.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (
    jobId: number,
    action: string,
    operatorNotes?: string
  ): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/machines/${machineId}/operator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_sheet_id: jobId,
          action,
          operator_notes: operatorNotes,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update job status");
      }

      // Refresh dashboard data
      await fetchDashboardData();
      return true;
    } catch (err) {
      console.error("Error updating job status:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const refreshDashboard = async () => {
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [machineId]);

  return {
    dashboardData,
    loading,
    error,
    updateJobStatus,
    refreshDashboard,
  };
}
