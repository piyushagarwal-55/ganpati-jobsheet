"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import custom hooks and types
import { useJobSheets } from "@/hooks/useJobSheets";
import {
  JobSheet,
  JobSheetNote,
  JobSheetStats,
  JobSheetChartData,
  JobSheetNotification,
} from "@/types/jobsheet";
// Import modular components
import JobSheetDashboardNavbar from "./admin/JobSheetDashboardNavbar";
import JobSheetDashboardStats from "./admin/JobSheetDashboardStats";
import JobSheetsTable from "./admin/JobSheetsTable";
import JobSheetDetailModal from "./admin/JobSheetDetailModal";
import { Navbar } from "./navbar";

export default function JobSheetAdminDashboard() {
  // Use custom hook for database operations
  const {
    jobSheets,
    notes,
    loading,
    error,
    updateJobSheet,
    deleteJobSheet,
    addNote,
    generateReport,
    refetch,
    softDeleteJobSheet,
  } = useJobSheets();

  // State for notifications
  const [notifications, setNotifications] = useState<JobSheetNotification[]>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("jobsheet-admin-notifications");
        if (saved) {
          return JSON.parse(saved);
        }
      }
      return [
        {
          id: "1",
          title: "New Job Sheet Created",
          message: "A new production job sheet has been created",
          type: "info",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          read: false,
        },
        {
          id: "2",
          title: "Production Complete",
          message: "Job sheet #123 production completed successfully",
          type: "success",
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          read: false,
        },
      ];
    }
  );

  // Dashboard statistics state
  const [stats, setStats] = useState<JobSheetStats>({
    totalJobSheets: 0,
    totalRevenue: 0,
    avgJobValue: 0,
    thisMonthJobs: 0,
    lastMonthJobs: 0,
    revenueGrowth: 0,
    totalSheets: 0,
    totalImpressions: 0,
  });

  // Chart data for analytics
  const [chartData, setChartData] = useState<JobSheetChartData[]>([
    // Initialize with default data to ensure charts always show something
    { month: "Jan", jobs: 0, revenue: 0, sheets: 0 },
    { month: "Feb", jobs: 0, revenue: 0, sheets: 0 },
    { month: "Mar", jobs: 0, revenue: 0, sheets: 0 },
    { month: "Apr", jobs: 0, revenue: 0, sheets: 0 },
    { month: "May", jobs: 0, revenue: 0, sheets: 0 },
    { month: "Jun", jobs: 0, revenue: 0, sheets: 0 },
  ]);

  // UI state
  const [selectedJobSheet, setSelectedJobSheet] = useState<JobSheet | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Calculate dashboard statistics from real data
  useEffect(() => {
    console.log("JobSheets data changed:", {
      count: jobSheets.length,
      jobSheets: jobSheets.slice(0, 2), // Log first 2 for debugging
    });

    // Always calculate stats and generate chart data
    calculateStats(jobSheets);
    generateChartData();
  }, [jobSheets]);

  // Function to calculate statistics
  const calculateStats = (data: JobSheet[]) => {
    console.log("Calculating stats for job sheets:", data.length);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Separate active and deleted job sheets
    const activeData = data.filter((sheet) => !sheet.is_deleted);
    const deletedData = data.filter((sheet) => sheet.is_deleted);

    const totalJobSheets = data.length;
    const activeJobSheets = activeData.length;

    // Calculate total revenue from active (non-deleted) transactions only
    const totalRevenue = activeData.reduce((sum, sheet) => {
      // Use correct field names and handle potential null values
      const printing = parseFloat(sheet.printing?.toString() || "0");
      const uv = parseFloat(sheet.uv?.toString() || "0");
      const baking = parseFloat(sheet.baking?.toString() || "0");
      const total = printing + uv + baking;

      // Debug individual sheet calculations
      if (total > 0) {
        console.log(
          `Sheet ${sheet.id} revenue: printing=${printing}, uv=${uv}, baking=${baking}, total=${total}`
        );
      }

      return sum + total;
    }, 0);

    console.log(
      `Total revenue calculated from ${activeData.length} active job sheets (${deletedData.length} deleted): ₹${totalRevenue}`
    );

    const avgJobValue =
      activeJobSheets > 0 ? totalRevenue / activeJobSheets : 0;

    const thisMonthJobs = activeData.filter(
      (sheet) => sheet.job_date && new Date(sheet.job_date) >= thisMonth
    ).length;

    const lastMonthJobs = activeData.filter(
      (sheet) =>
        sheet.job_date &&
        new Date(sheet.job_date) >= lastMonth &&
        new Date(sheet.job_date) <= endOfLastMonth
    ).length;

    const revenueGrowth =
      lastMonthJobs > 0
        ? ((thisMonthJobs - lastMonthJobs) / lastMonthJobs) * 100
        : 0;

    // Use correct field names - 'paper_sheet' and 'imp' from active transactions only
    const totalSheets = activeData.reduce((sum, sheet) => {
      const sheets = parseInt(sheet.paper_sheet?.toString() || "0");
      return sum + sheets;
    }, 0);

    const totalImpressions = activeData.reduce((sum, sheet) => {
      const impressions = parseInt(sheet.imp?.toString() || "0");
      return sum + impressions;
    }, 0);

    const newStats = {
      totalJobSheets: activeJobSheets, // Show only active job sheets in main stats
      totalRevenue,
      avgJobValue,
      thisMonthJobs,
      lastMonthJobs,
      revenueGrowth,
      totalSheets,
      totalImpressions,
    };

    console.log("Calculated stats (active only):", newStats);
    console.log(
      `Total transactions: ${totalJobSheets} (${activeJobSheets} active, ${deletedData.length} deleted)`
    );
    console.log("Previous stats for comparison:", stats);

    // Always update stats state to trigger re-render
    setStats(newStats);
  };

  // Function to generate chart data
  const generateChartData = () => {
    const months = [];
    const now = new Date();

    console.log("Generating chart data. JobSheets count:", jobSheets.length);
    console.log("Sample job sheet data:", jobSheets[0]);

    // Always try to generate real data first, fall back to sample data if no real data exists
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthJobSheets = jobSheets.filter((sheet) => {
        if (!sheet.job_date) return false;
        const jobDate = new Date(sheet.job_date);
        return jobDate >= monthStart && jobDate <= monthEnd;
      });

      console.log(
        `Month ${date.toLocaleDateString("en-US", { month: "short" })}:`,
        {
          monthJobSheets: monthJobSheets.length,
          jobs: monthJobSheets,
        }
      );

      const monthRevenue = monthJobSheets.reduce((sum, sheet) => {
        // Use correct field names from the actual data structure
        const printing = parseFloat(sheet.printing?.toString() || "0");
        const uv = parseFloat(sheet.uv?.toString() || "0");
        const baking = parseFloat(sheet.baking?.toString() || "0");
        const total = printing + uv + baking;
        console.log(`Sheet revenue calculation:`, {
          printing,
          uv,
          baking,
          total,
        });
        return sum + total;
      }, 0);

      const monthSheets = monthJobSheets.reduce((sum, sheet) => {
        // Use correct field name - it's 'paper_sheet' not 'sheet'
        const sheets = parseInt(sheet.paper_sheet?.toString() || "0");
        console.log(`Sheet count:`, { paper_sheet: sheet.paper_sheet, sheets });
        return sum + sheets;
      }, 0);

      months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        jobs: monthJobSheets.length,
        revenue: monthRevenue,
        sheets: monthSheets,
      });
    }

    // If no real data for any month, use sample data for visualization
    const hasRealData = months.some(
      (m) => m.jobs > 0 || m.revenue > 0 || m.sheets > 0
    );

    if (!hasRealData && jobSheets.length === 0) {
      console.log("No real data found, using sample data for demonstration");

      // Generate realistic sample data
      const sampleData = [
        { revenue: 150000, jobs: 2, sheets: 45 },
        { revenue: 175000, jobs: 3, sheets: 52 },
        { revenue: 200000, jobs: 4, sheets: 60 },
        { revenue: 180000, jobs: 3, sheets: 48 },
        { revenue: 220000, jobs: 5, sheets: 65 },
        { revenue: 253321, jobs: 3, sheets: 55 },
      ];

      for (let i = 0; i < months.length; i++) {
        const dataIndex = i;
        months[i] = {
          ...months[i],
          jobs: sampleData[dataIndex]?.jobs || 0,
          revenue: sampleData[dataIndex]?.revenue || 0,
          sheets: sampleData[dataIndex]?.sheets || 0,
        };
      }
    }

    console.log("Final generated chart data:", months);
    setChartData(months);
  };

  // Function to mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "jobsheet-admin-notifications",
          JSON.stringify(updated)
        );
      }
      return updated;
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading Job Sheet Dashboard
          </h2>
          <p className="text-gray-500">
            Please wait while we fetch your production data...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Database Connection Error
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      {/* <JobSheetDashboardNavbar
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      /> */}
      {/* <Navbar /> */}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-2">
        {/* Dashboard Statistics */}
        <JobSheetDashboardStats stats={stats} chartData={chartData} />

        {/* Job Sheets Table */}
        <JobSheetsTable
          jobSheets={jobSheets}
          notes={notes}
          searchTerm={searchTerm}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          updateJobSheet={updateJobSheet}
          deleteJobSheet={deleteJobSheet}
          addNote={addNote}
          generateReport={generateReport}
          setSelectedJobSheet={setSelectedJobSheet}
          onRefresh={refetch}
          softDeleteJobSheet={softDeleteJobSheet}
        />

        {/* Job Sheet Detail Modal */}
        {selectedJobSheet && (
          <JobSheetDetailModal
            jobSheet={selectedJobSheet}
            notes={notes}
            onClose={() => setSelectedJobSheet(null)}
            updateJobSheet={updateJobSheet}
            addNote={addNote}
            generateReport={generateReport}
          />
        )}
      </div>
    </div>
  );
}
