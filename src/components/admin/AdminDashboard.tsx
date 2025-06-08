"use client";

import { useState, useEffect } from "react";
import { useJobSheets } from "@/hooks/useJobSheets";
import {
  DashboardStats as DashboardStatsType,
  ChartData,
  Notification,
  JobSheet,
} from "@/types/database";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import DashboardNavbar from "./DashboardNavbar";
import DashboardStats from "./DashboardStats";
import JobSheetsTable from "./JobSheetsTable";
import RealTimeIndicators from "./RealTimeIndicators";
import EnhancedDashboard from "./EnhancedDashboard";

export default function EnhancedAdminDashboard() {
  const {
    jobSheets,
    notes,
    loading,
    error,
    updateJobSheet,
    deleteJobSheet,
    addNote,
    generateReport,
    softDeleteJobSheet,
  } = useJobSheets();

  // State management
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin-notifications");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [
      {
        id: "1",
        title: "New Job Sheet Created",
        message: "A new job sheet has been created",
        type: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
      },
      {
        id: "2",
        title: "Payment Received",
        message: "Payment received for recent order",
        type: "success",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: false,
      },
    ];
  });

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

  const [parties, setParties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedJobSheet, setSelectedJobSheet] = useState<JobSheet | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch parties and transactions data
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
  }, []);

  // Calculate stats when job sheets, parties, or transactions data changes
  useEffect(() => {
    if (jobSheets.length > 0 || parties.length > 0 || transactions.length > 0) {
      calculateStats(jobSheets, parties, transactions);
    }
  }, [jobSheets, parties, transactions]);

  // Real-time data updates every 15 seconds
  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        const response = await fetch("/api/dashboard/realtime");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.data.stats);
            setChartData(data.data.charts.monthlyTrend);
          }
        }
      } catch (error) {
        console.error("Error fetching realtime dashboard data:", error);
      }
    };

    // Fetch immediately
    fetchRealtimeData();

    // Auto-refresh every 3 minutes for real-time updates (reduced frequency)
    const realtimeInterval = setInterval(fetchRealtimeData, 180000);

    return () => clearInterval(realtimeInterval);
  }, []);

  const calculateStats = (
    data: JobSheet[],
    partiesData: any[] = [],
    transactionsData: any[] = []
  ) => {
    // Calculate basic stats from job sheets
    const totalJobSheets = data.length;
    const totalRevenue = data.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    // Add transaction revenue (exclude soft-deleted transactions)
    const transactionRevenue = transactionsData
      .filter(
        (t) => t.type === "payment" && !t.description?.includes("[DELETED]")
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const combinedRevenue = totalRevenue + transactionRevenue;
    const avgOrderValue =
      totalJobSheets > 0 ? combinedRevenue / totalJobSheets : 0;

    // This month's data
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthData = data.filter((sheet) => {
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

    const lastMonthData = data.filter((sheet) => {
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

    setStats({
      totalJobSheets,
      totalParties: partiesData.length,
      totalRevenue: combinedRevenue,
      avgOrderValue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth,
      totalOrders: totalJobSheets,
    });

    // Generate chart data
    const chartData: ChartData[] = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthJobSheets = data.filter((sheet) => {
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

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      );
      localStorage.setItem("admin-notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRefresh = async () => {
    // Refresh job sheets data
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <EnhancedDashboard stats={stats} chartData={chartData} />

        <JobSheetsTable
          jobSheets={jobSheets}
          notes={notes}
          searchTerm={searchTerm}
          dateFilter={statusFilter}
          setDateFilter={setStatusFilter}
          updateJobSheet={updateJobSheet}
          deleteJobSheet={deleteJobSheet}
          addNote={addNote}
          generateReport={generateReport}
          setSelectedJobSheet={setSelectedJobSheet}
          onRefresh={handleRefresh}
          softDeleteJobSheet={softDeleteJobSheet}
        />
      </div>
    </div>
  );
}
