"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Search,
  FileText,
  Target,
  DollarSign,
  Users,
  Home,
  Download,
  Calendar,
  Package,
  CheckCircle,
} from "lucide-react";

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
import Loading from "./ui/loading";
import { PageHeader } from "./ui/page-header";

export default function JobSheetAdminDashboard() {
  // Use custom hook for database operations
  const {
    jobSheets,
    loading,
    error,
    updateJobSheet,
    deleteJobSheet,
    refetch,
    softDeleteJobSheet,
  } = useJobSheets();

  // Local state for missing properties
  const [notes, setNotes] = useState<JobSheetNote[]>([]);
  const addNote = async (jobSheetId: number, content: string) => {
    console.log("Add note:", jobSheetId, content);
    return { success: true };
  };
  const generateReport = async (jobSheetId: number) => {
    console.log("Generate report:", jobSheetId);
    return { success: true };
  };

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

  // Auto-refresh control state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [userActivity, setUserActivity] = useState(Date.now());

  // Track user activity to prevent unwanted refreshes
  useEffect(() => {
    const updateActivity = () => setUserActivity(Date.now());

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

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

  // UI state - matching parties page
  const [selectedJobSheet, setSelectedJobSheet] = useState<JobSheet | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "online" | "offline" | "slow"
  >("online");

  // Fetch parties and transactions data like the main dashboard
  useEffect(() => {
    const fetchPartiesData = async () => {
      try {
        setConnectionStatus("online");
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
          setLastUpdated(new Date());
        } else {
          setConnectionStatus("offline");
        }
      } catch (error) {
        console.error("Error fetching parties data:", error);
        setConnectionStatus("offline");
      }
    };

    fetchPartiesData();

    // Conditional auto-refresh: only if enabled and user inactive for 2+ minutes
    let interval: NodeJS.Timeout;
    if (autoRefreshEnabled) {
      interval = setInterval(() => {
        const timeSinceActivity = Date.now() - userActivity;
        // Only refresh if user has been inactive for more than 2 minutes
        if (timeSinceActivity > 120000) {
          fetchPartiesData();
        }
      }, 300000); // 5 minutes instead of 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled, userActivity]);

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

    // Add transaction revenue (exclude soft-deleted transactions)
    const transactionRevenue = transactionsData
      .filter(
        (t) => t.type === "payment" && !t.description?.includes("[DELETED]")
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const combinedRevenue = totalRevenue + transactionRevenue;
    // Average order value should be based only on job sheet prices, not including advances/payments
    const avgOrderValue =
      totalJobSheets > 0 ? totalRevenue / totalJobSheets : 0;

    // This month's data
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthData = activeData.filter((sheet) => {
      return (
        new Date(sheet.job_date || sheet.created_at || new Date()) >= thisMonth
      );
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
      const sheetDate = new Date(
        sheet.job_date || sheet.created_at || new Date()
      );
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
        const sheetDate = new Date(
          sheet.job_date || sheet.created_at || new Date()
        );
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
    setConnectionStatus("online");

    // Refresh job sheets data
    await refetch();

    // Refresh parties and transactions data
    try {
      const [partiesResponse, transactionsResponse] = await Promise.all([
        fetch("/api/parties", { cache: "no-cache" }),
        fetch("/api/parties/transactions", { cache: "no-cache" }),
      ]);

      if (partiesResponse.ok && transactionsResponse.ok) {
        const [partiesData, transactionsData] = await Promise.all([
          partiesResponse.json(),
          transactionsResponse.json(),
        ]);

        setParties(partiesData);
        setTransactions(transactionsData);
        setLastUpdated(new Date());

        console.log("Reports dashboard data refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      setConnectionStatus("offline");
    }
  };

  // Conditional auto-refresh for dashboard data
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefreshEnabled) {
      interval = setInterval(() => {
        const timeSinceActivity = Date.now() - userActivity;
        // Only refresh if user has been inactive for more than 2 minutes
        if (timeSinceActivity > 120000) {
          handleRefresh();
        }
      }, 300000); // 5 minutes instead of 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled, userActivity]);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Filter job sheets based on search term
  const filteredJobSheets = jobSheets.filter((sheet) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      sheet.party_name?.toLowerCase().includes(searchLower) ||
      sheet.description?.toLowerCase().includes(searchLower) ||
      sheet.job_type?.toLowerCase().includes(searchLower)
    );
  });

  // Recent job sheets for the second tab
  const recentJobSheets = jobSheets
    .filter((sheet) => !sheet.is_deleted)
    .sort(
      (a, b) =>
        new Date(b.created_at || b.job_date || "").getTime() -
        new Date(a.created_at || a.job_date || "").getTime()
    )
    .slice(0, 10);

  // Show loading state
  if (loading) {
    return (
      <Loading message="Loading Reports Dashboard..." size="lg" fullScreen />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Error Loading Reports
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={handleRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Main dashboard render with parties page UI
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-2 max-w-7xl">
        {/* Header Section - Matching parties page */}
        <PageHeader
          title="Reports Dashboard"
          description="Comprehensive business analytics and job sheet reports"
          icon={BarChart3}
          iconColor="text-orange-600"
          lastUpdated={lastUpdated || undefined}
        >
          {/* Connection Status & Actions */}
          <div className="flex items-center gap-2">
            {connectionStatus === "online" ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : connectionStatus === "slow" ? (
              <Activity className="w-4 h-4 text-yellow-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span
              className={`text-sm font-medium ${
                connectionStatus === "online"
                  ? "text-green-600"
                  : connectionStatus === "slow"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {connectionStatus === "online"
                ? "Online"
                : connectionStatus === "slow"
                  ? "Slow Connection"
                  : "Offline"}
            </span>
          </div>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh
            </label>
            {autoRefreshEnabled && (
              <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                5min when idle
              </span>
            )}
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                // Export functionality would go here
                console.log("Export functionality triggered");
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Link href="/">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </PageHeader>

        {/* Main Stats Cards - Matching parties page gradient style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Job Sheets
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobSheets}</div>
              <p className="text-xs text-blue-100">
                {stats.totalOrders} total orders
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">
                This Month Jobs
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  jobSheets.filter((js) => {
                    const jobDate = new Date(js.job_date || js.created_at);
                    const thisMonth = new Date();
                    return (
                      jobDate.getMonth() === thisMonth.getMonth() &&
                      jobDate.getFullYear() === thisMonth.getFullYear() &&
                      !js.is_deleted
                    );
                  }).length
                }
              </div>
              <p className="text-xs text-green-100">Active this month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                Monthly Growth
              </CardTitle>
              {stats.revenueGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-purple-200" />
              ) : (
                <TrendingDown className="h-4 w-4 text-purple-200" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(stats.revenueGrowth)}
              </div>
              <p className="text-xs text-purple-100">vs last month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">
                Active Parties
              </CardTitle>
              <Users className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParties}</div>
              <p className="text-xs text-orange-100">registered clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar - Matching parties page */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search job sheets by party name, description, or job type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg border-gray-200 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={() => {
                  // Advanced filters functionality would go here
                  console.log("Advanced filters triggered");
                }}
                className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Filter by Date
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs - Matching parties page */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 h-10"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics Overview ({filteredJobSheets.length})
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center gap-2 h-10"
            >
              <FileText className="w-4 h-4" />
              Recent Job Sheets ({recentJobSheets.length})
            </TabsTrigger>
          </TabsList>

          {/* Analytics Overview Tab */}
          <TabsContent value="overview">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Dashboard Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Dashboard Statistics Component */}
                <DashboardStats stats={stats} chartData={chartData} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Job Sheets Reports Tab */}
          <TabsContent value="reports">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Job Sheets Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JobSheetsTable
                  jobSheets={filteredJobSheets}
                  notes={notes}
                  searchTerm=""
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
