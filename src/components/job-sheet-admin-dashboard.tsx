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
import {
  DashboardStats as DashboardStatsType,
  ChartData,
  Notification,
} from "@/types/database";

// Import modular components
import DashboardStats from "./admin/DashboardStats";
import JobSheetsTable from "./admin/JobSheetsTable";
import JobSheetDetailModal from "./admin/JobSheetDetailModal";

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
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jobsheet-reports-notifications");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [
      {
        id: "1",
        title: "Report Generated",
        message: "Monthly job sheet report has been generated",
        type: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        read: false,
      },
      {
        id: "2",
        title: "Production Analysis",
        message: "Quarterly production analysis completed",
        type: "success",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        read: false,
      },
    ];
  });

  // Dashboard statistics state using the consistent DashboardStatsType
  const [stats, setStats] = useState<DashboardStatsType>({
    totalJobSheets: 0,
    totalParties: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
  });

  // Additional state for parties and transactions data
  const [parties, setParties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Chart data for analytics using consistent ChartData type
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // UI state
  const [selectedJobSheet, setSelectedJobSheet] = useState<JobSheet | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Fetch parties and transactions data like the main dashboard
  useEffect(() => {
    const fetchPartiesData = async () => {
      try {
        const [partiesResponse, transactionsResponse] = await Promise.all([
          fetch("/api/parties"),
          fetch("/api/parties/transactions"),
        ]);

        if (partiesResponse.ok && transactionsResponse.ok) {
          const [partiesData, transactionsData] = await Promise.all([
            partiesResponse.json(),
            transactionsResponse.json(),
          ]);

          setParties(partiesData);
          setTransactions(transactionsData);
        }
      } catch (error) {
        console.error("Error fetching parties data:", error);
      }
    };

    fetchPartiesData();

    // Auto-refresh parties and transactions data every 30 seconds
    const interval = setInterval(fetchPartiesData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate dashboard statistics from real data
  useEffect(() => {
    if (jobSheets.length > 0 || parties.length > 0 || transactions.length > 0) {
      calculateStats(jobSheets, parties, transactions);
    }
  }, [jobSheets, parties, transactions]);

  // Function to calculate statistics - matching main dashboard logic
  const calculateStats = (
    data: JobSheet[],
    partiesData: any[] = [],
    transactionsData: any[] = []
  ) => {
    console.log("Calculating stats for reports dashboard:", {
      jobSheets: data.length,
      parties: partiesData.length,
      transactions: transactionsData.length,
    });

    // Filter active (non-deleted) job sheets
    const activeData = data.filter((sheet) => !sheet.is_deleted);

    // Calculate basic stats from job sheets
    const totalJobSheets = activeData.length;
    const totalRevenue = activeData.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    // Add transaction revenue
    const transactionRevenue = transactionsData
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const combinedRevenue = totalRevenue + transactionRevenue;
    const avgOrderValue =
      totalJobSheets > 0 ? combinedRevenue / totalJobSheets : 0;

    // This month's data
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthData = activeData.filter((sheet) => {
      return new Date(sheet.job_date) >= thisMonth;
    });
    const thisMonthRevenue = thisMonthData.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    // Last month's data
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    const nextMonth = new Date(lastMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const lastMonthData = activeData.filter((sheet) => {
      const sheetDate = new Date(sheet.job_date);
      return sheetDate >= lastMonth && sheetDate < nextMonth;
    });
    const lastMonthRevenue = lastMonthData.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    const newStats = {
      totalJobSheets,
      totalParties: partiesData.length,
      totalRevenue: combinedRevenue,
      avgOrderValue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth,
      totalOrders: totalJobSheets,
    };

    console.log("Calculated reports stats:", newStats);
    setStats(newStats);

    // Generate chart data
    const chartData: ChartData[] = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthJobSheets = activeData.filter((sheet) => {
        const sheetDate = new Date(sheet.job_date);
        return sheetDate >= monthStart && sheetDate <= monthEnd;
      });

      const monthRevenue = monthJobSheets.reduce((sum, sheet) => {
        return (
          sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
        );
      }, 0);

      chartData.push({
        month: month.toLocaleDateString("en-US", { month: "short" }),
        jobSheets: monthJobSheets.length,
        revenue: monthRevenue,
      });
    }
    setChartData(chartData);
  };

  // Function to mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "jobsheet-reports-notifications",
          JSON.stringify(updated)
        );
      }
      return updated;
    });
  };

  const handleRefresh = async () => {
    console.log("Refreshing reports dashboard data...");

    // Refresh job sheets data
    await refetch();

    // Refresh parties and transactions data
    try {
      const [partiesResponse, transactionsResponse] = await Promise.all([
        fetch("/api/parties"),
        fetch("/api/parties/transactions"),
      ]);

      if (partiesResponse.ok && transactionsResponse.ok) {
        const [partiesData, transactionsData] = await Promise.all([
          partiesResponse.json(),
          transactionsResponse.json(),
        ]);

        setParties(partiesData);
        setTransactions(transactionsData);

        console.log("Reports dashboard data refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Error Loading Reports
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Reports Dashboard
          </h1>
          <p className="text-gray-600">
            Comprehensive business analytics and job sheet reports
          </p>
        </div>

        {/* Dashboard Statistics */}
        <DashboardStats stats={stats} chartData={chartData} />

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
          onRefresh={handleRefresh}
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
