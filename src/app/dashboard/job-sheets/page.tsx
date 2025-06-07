"use client";
import React, { useEffect, useState } from "react";
import JobSheetsTable from "@/components/job-sheets/JobSheetsTable";
import JobSheetFormModal from "@/components/job-sheets/JobSheetFormModal";
import JobSheetDetailModal from "@/components/job-sheets/JobSheetDetailModal";
import { Button } from "@/components/ui/button";

export default function JobSheetsAdminPage() {
  const [jobSheets, setJobSheets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingSheet, setEditingSheet] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [viewSheet, setViewSheet] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchJobSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job-sheets");
      const result = await res.json();

      if (result.success) {
        setJobSheets(result.data || []);
        console.log("Job sheets loaded:", result.data?.length, "records");
      } else {
        console.error("Failed to fetch job sheets:", result.error);
        setJobSheets([]);
      }
    } catch (error) {
      console.error("Error fetching job sheets:", error);
      setJobSheets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobSheets();
  }, []);

  const handleAdd = () => {
    setEditingSheet(null);
    setShowFormModal(true);
  };

  const handleEdit = (sheet: any) => {
    setEditingSheet(sheet);
    setShowFormModal(true);
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Delete this job sheet?")) return;
    setLoading(true);
    try {
      await fetch("/api/job-sheet", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchJobSheets();
    } catch (error) {
      console.error("Error deleting job sheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (sheet: any) => {
    setViewSheet(sheet);
    setShowDetailModal(true);
  };

  const handleFormSubmit = async () => {
    setShowFormModal(false);
    setEditingSheet(null);
    // Refresh the job sheets list and party balances
    await fetchJobSheets();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Job Sheets Management</h1>
          <p className="text-gray-600">
            Manage printing job sheets and party balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => (window.location.href = "/job-sheet-form")}
            variant="outline"
          >
            New Job Sheet Form
          </Button>
          <Button onClick={handleAdd} className="bg-blue-600 text-white">
            Quick Add Job Sheet
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Loading job sheets...</span>
          </div>
        </div>
      )}

      <JobSheetsTable
        jobSheets={jobSheets}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onRefresh={fetchJobSheets}
      />

      {showFormModal && (
        <JobSheetFormModal
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleFormSubmit}
          editingSheet={editingSheet}
        />
      )}

      {showDetailModal && viewSheet && (
        <JobSheetDetailModal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          sheet={viewSheet}
        />
      )}
    </div>
  );
}
