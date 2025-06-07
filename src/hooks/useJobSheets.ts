"use client";

import { useEffect, useState } from "react";
import { JobSheet, JobSheetNote } from "@/types/jobsheet";

export function useJobSheets() {
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([]);
  const [notes, setNotes] = useState<JobSheetNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch job sheets
  const fetchJobSheets = async () => {
    try {
      setLoading(true);
      console.log("Fetching job sheets...");

      const response = await fetch("/api/job-sheets");

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response not ok:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Job sheets response:", data);

      if (data.success) {
        setJobSheets(data.data || []);
        setError(null);

        if (data.warning) {
          console.warn("API Warning:", data.warning);
        }
      } else {
        throw new Error(data.error || "Failed to fetch job sheets");
      }
    } catch (err: any) {
      console.error("Error fetching job sheets:", err);
      setError(err.message || "Failed to load job sheets");
      setJobSheets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch notes (with error handling for missing table)
  const fetchNotes = async () => {
    try {
      console.log("Fetching job sheet notes...");
      const response = await fetch("/api/job-sheet-notes");

      if (response.ok) {
        const data = await response.json();
        console.log("Notes response:", data);

        if (data.success) {
          setNotes(data.data || []);
        }
      } else {
        console.warn("Notes API not available or table doesn't exist");
        setNotes([]); // Set empty array if notes table doesn't exist
      }
    } catch (err) {
      console.warn("Error fetching notes (table might not exist):", err);
      setNotes([]); // Don't set this as an error since notes are optional
    }
  };

  // Refetch function that refreshes both job sheets and notes
  const refetch = async () => {
    await fetchJobSheets();
    await fetchNotes();
  };

  // Update job sheet
  const updateJobSheet = async (id: number, updates: Partial<JobSheet>) => {
    try {
      console.log(`Updating job sheet ${id}:`, updates);

      const response = await fetch(`/api/job-sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setJobSheets((prev) =>
            prev.map((
              sheet,
            ) => (sheet.id === id ? { ...sheet, ...updates } : sheet))
          );
          return { success: true };
        }
      }

      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update job sheet");
    } catch (err: any) {
      console.error("Error updating job sheet:", err);
      return { success: false, error: err.message };
    }
  };

  // Soft delete job sheet (mark as deleted with reason)
  const softDeleteJobSheet = async (id: number, reason: string) => {
    try {
      console.log(`Soft deleting job sheet ${id} with reason: ${reason}`);

      const response = await fetch(`/api/job-sheets/${id}/soft-delete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletion_reason: reason,
          deleted_by: "Admin", // You can make this dynamic based on current user
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state to mark as deleted
          setJobSheets((prev) =>
            prev.map((sheet) =>
              sheet.id === id
                ? {
                  ...sheet,
                  is_deleted: true,
                  deleted_at: new Date().toISOString(),
                  deletion_reason: reason,
                  deleted_by: "Admin",
                }
                : sheet
            )
          );

          // Force a fresh fetch to ensure data consistency
          setTimeout(() => {
            fetchJobSheets();
          }, 100);

          return { success: true };
        }
      }

      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete job sheet");
    } catch (err: any) {
      console.error("Error soft deleting job sheet:", err);
      return { success: false, error: err.message };
    }
  };

  // Delete job sheet
  const deleteJobSheet = async (id: number) => {
    try {
      console.log(`Deleting job sheet ${id}`);

      const response = await fetch(`/api/job-sheets/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Update local state immediately
        setJobSheets((prev) => {
          const updatedSheets = prev.filter((sheet) => sheet.id !== id);
          console.log(
            `Job sheet ${id} deleted. Remaining sheets:`,
            updatedSheets.length,
          );
          return updatedSheets;
        });

        // Also update notes
        setNotes((prev) => prev.filter((note) => note.job_sheet_id !== id));

        // Force a fresh fetch to ensure data consistency
        setTimeout(() => {
          fetchJobSheets();
        }, 100);

        return { success: true };
      }

      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete job sheet");
    } catch (err: any) {
      console.error("Error deleting job sheet:", err);
      return { success: false, error: err.message };
    }
  };

  // Add note
  const addNote = async (jobSheetId: number, noteText: string) => {
    try {
      console.log(`Adding note to job sheet ${jobSheetId}:`, noteText);

      const response = await fetch("/api/job-sheet-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_sheet_id: jobSheetId,
          note: noteText,
          author: "Admin",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setNotes((prev) => [...prev, data.data]);
          return { success: true };
        }
      }

      const errorData = await response.json();

      // If table doesn't exist, show a helpful message
      if (errorData.code === "TABLE_NOT_FOUND") {
        return {
          success: false,
          error:
            "Notes feature not available. Please create the job_sheet_notes table.",
        };
      }

      throw new Error(errorData.error || "Failed to add note");
    } catch (err: any) {
      console.error("Error adding note:", err);
      return { success: false, error: err.message };
    }
  };

  // Generate report
  const generateReport = async (jobSheetId: number) => {
    try {
      console.log(`Generating report for job sheet ${jobSheetId}`);

      const response = await fetch(`/api/job-sheets/${jobSheetId}/report`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Report generated:", data);
          alert(`Report ${data.reportNumber} generated successfully!`);
          return { success: true };
        }
      }

      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate report");
    } catch (err: any) {
      console.error("Error generating report:", err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchJobSheets();
    fetchNotes();
  }, []);

  return {
    jobSheets,
    notes,
    loading,
    error,
    updateJobSheet,
    deleteJobSheet,
    addNote,
    generateReport,
    refetch, // Make sure this is included in the return object
    softDeleteJobSheet,
  };
}
