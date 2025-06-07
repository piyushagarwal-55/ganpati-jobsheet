"use client";

import { useState, useEffect, useCallback } from "react";
import { JobSheet, JobSheetNote } from "@/types/jobsheet";

export const useJobSheets = () => {
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobSheets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/job-sheets", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch job sheets: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setJobSheets(data.data);
      } else if (data.warning) {
        setJobSheets(data.data || []);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch job sheets");
      setJobSheets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobSheetNotes = useCallback(
    async (jobSheetId: number): Promise<JobSheetNote[]> => {
      try {
        const response = await fetch(
          `/api/job-sheet-notes?job_sheet_id=${jobSheetId}`
        );

        if (!response.ok) {
          return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        return [];
      }
    },
    []
  );

  const updateJobSheet = useCallback(
    async (id: number, updates: Partial<JobSheet>) => {
      try {
        const response = await fetch(`/api/job-sheets/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Update failed: ${response.status} ${errorText}`);
        }

        const updatedJobSheet = await response.json();

        setJobSheets((prev) =>
          prev.map((job) =>
            job.id === id ? { ...job, ...updatedJobSheet } : job
          )
        );

        return { success: true, data: updatedJobSheet };
      } catch (err: any) {
        const errorMessage = err.message || "Failed to update job sheet";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const softDeleteJobSheet = useCallback(async (id: number, reason: string) => {
    try {
      const response = await fetch(`/api/job-sheets/${id}/soft-delete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deletion_reason: reason,
          deleted_by: "User",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Soft delete failed: ${response.status}`
        );
      }

      // Update the job sheet in state to mark it as deleted instead of removing it
      setJobSheets((prev) =>
        prev.map((job) =>
          job.id === id
            ? {
                ...job,
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deletion_reason: reason,
                deleted_by: "User",
              }
            : job
        )
      );
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || "Failed to soft delete job sheet";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const deleteJobSheet = useCallback(
    async (id: number) => {
      try {
        console.log(`[HOOK] Attempting to delete job sheet ${id}`);

        const response = await fetch(`/api/job-sheets/${id}`, {
          method: "DELETE",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        console.log(`[HOOK] Delete response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[HOOK] Delete failed: ${response.status} ${errorText}`
          );
          throw new Error(`Delete failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log(`[HOOK] Delete result:`, result);

        if (!result.success) {
          throw new Error(result.error || "Delete operation failed");
        }

        // Remove from state immediately for real-time update
        setJobSheets((prev) => {
          const filteredSheets = prev.filter((job) => job.id !== id);
          console.log(
            `[HOOK] Removed job ${id} from state. Before: ${prev.length}, After: ${filteredSheets.length}`
          );
          return filteredSheets;
        });

        console.log(
          `[HOOK] Successfully deleted job sheet ${id} from both server and state`
        );
        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || "Failed to delete job sheet";
        console.error("[HOOK] Delete error:", err);
        setError(errorMessage);

        // If delete failed, ensure we refresh to get the current state
        console.log(
          "[HOOK] Delete failed, refreshing data to ensure consistency"
        );
        fetchJobSheets();

        return { success: false, error: errorMessage };
      }
    },
    [fetchJobSheets]
  );

  const addJobSheetNote = useCallback(
    async (jobSheetId: number, noteText: string) => {
      try {
        const response = await fetch("/api/job-sheet-notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_sheet_id: jobSheetId,
            note: noteText,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to add note: ${response.status} ${errorText}`
          );
        }

        const newNote = await response.json();
        return { success: true, data: newNote };
      } catch (err: any) {
        const errorMessage = err.message || "Failed to add note";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const generateJobSheetReport = useCallback(async (jobSheetId: number) => {
    try {
      const response = await fetch(`/api/job-sheets/${jobSheetId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Report generation failed: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate report";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  useEffect(() => {
    fetchJobSheets();
  }, [fetchJobSheets]);

  return {
    jobSheets,
    loading,
    error,
    fetchJobSheets,
    fetchJobSheetNotes,
    updateJobSheet,
    softDeleteJobSheet,
    deleteJobSheet,
    addJobSheetNote,
    generateJobSheetReport,
    refetch: fetchJobSheets, // Alias for easier use
  };
};
