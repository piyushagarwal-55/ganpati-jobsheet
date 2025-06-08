"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  BarChart3,
  DollarSign,
  Calendar,
  AlertCircle,
  ArrowRight,
  Building2,
  Activity,
  Clock,
  Target,
  Zap,
  LineChart,
  PieChart,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import Loading from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  ComposedChart,
} from "recharts";

interface DashboardStats {
  totalJobSheets: number;
  totalParties: number;
  totalBalance: number;
  totalRevenue: number;
  monthlyRevenue: number;
  sheetsProcessed: number;
  impressions: number;
  pendingJobs: number;
  recentTransactions: any[];
  recentJobSheets: any[];
  totalPayments: number;
  totalOrders: number;
  roi: number;
  estimatedCosts: number;
  grossProfit: number;
  transactionVolume: number;
}

interface LoadingState {
  parties: boolean;
  transactions: boolean;
  jobSheets: boolean;
  charts: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobSheets: 0,
    totalParties: 0,
    totalBalance: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    sheetsProcessed: 0,
    impressions: 25,
    pendingJobs: 0,
    recentTransactions: [],
    recentJobSheets: [],
    totalPayments: 0,
    totalOrders: 0,
    roi: 0,
    estimatedCosts: 0,
    grossProfit: 0,
    transactionVolume: 0,
  });

  const [loading, setLoading] = useState<LoadingState>({
    parties: true,
    transactions: true,
    jobSheets: true,
    charts: true,
  });

  const [connectionStatus, setConnectionStatus] = useState<
    "online" | "offline" | "slow"
  >("online");
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cached data with timestamps
  const [cachedData, setCachedData] = useState<{
    parties: { data: any[] | null; timestamp: number };
    transactions: { data: any[] | null; timestamp: number };
    jobSheets: { data: any[] | null; timestamp: number };
  }>({
    parties: { data: null, timestamp: 0 },
    transactions: { data: null, timestamp: 0 },
    jobSheets: { data: null, timestamp: 0 },
  });

  const [performanceData, setPerformanceData] = useState([
    { name: "Revenue Growth", value: 0, color: "#10b981" },
    { name: "Order Volume", value: 0, color: "#3b82f6" },
    { name: "Monthly Performance", value: 0, color: "#f59e0b" },
    { name: "Business Growth", value: 0, color: "#8b5cf6" },
  ]);

  const [chartData, setChartData] = useState([
    {
      month: "Jan",
      jobs: 12,
      impressions: 890,
      sheets: 1200,
      parties: 8,
    },
    {
      month: "Feb",
      jobs: 15,
      impressions: 1150,
      sheets: 1450,
      parties: 9,
    },
    {
      month: "Mar",
      jobs: 13,
      impressions: 965,
      sheets: 1300,
      parties: 8,
    },
    {
      month: "Apr",
      jobs: 18,
      impressions: 1320,
      sheets: 1650,
      parties: 11,
    },
    {
      month: "May",
      jobs: 20,
      impressions: 1485,
      sheets: 1750,
      parties: 12,
    },
    {
      month: "Jun",
      jobs: 22,
      impressions: 1650,
      sheets: 1850,
      parties: 13,
    },
  ]);

  // Check if cached data is still valid
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);

  // Optimized API fetch with timeout and retry
  const fetchWithRetry = useCallback(
    async (url: string, retries = 2): Promise<any> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(url, {
            signal: controller.signal,
            cache: "force-cache",
            headers: {
              "Cache-Control": "max-age=60",
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          if (attempt === retries) {
            throw error;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 500)
          );
        }
      }
    },
    []
  );

  // Progressive data loading
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch realtime dashboard data
  const fetchRealtimeData = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/realtime");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.stats.recentActivity) {
          // Update stats with real-time data including recent transactions
          setStats((prevStats) => ({
            ...prevStats,
            totalJobSheets: data.data.stats.totalJobSheets,
            totalParties: data.data.stats.totalParties,
            totalRevenue: data.data.stats.totalRevenue,
            monthlyRevenue: data.data.stats.thisMonthRevenue,
            recentTransactions:
              data.data.stats.recentActivity.recentTransactions || [],
            recentJobSheets:
              data.data.stats.recentActivity.weeklyJobSheets || [],
            roi: data.data.stats.revenueGrowth || 0,
          }));

          // Update chart data
          if (data.data.charts?.monthlyTrend) {
            setChartData(data.data.charts.monthlyTrend);
          }

          setLastUpdated(new Date());
          setConnectionStatus("online");
        }
      }
    } catch (error) {
      console.error("Error fetching realtime data:", error);
      setConnectionStatus("offline");
    }
  }, []);

  const loadDashboardData = useCallback(
    async (forceRefresh = false) => {
      try {
        setConnectionStatus("online");

        // Show immediate UI with cached data if available and valid
        if (!forceRefresh) {
          const validCachedParties =
            cachedData.parties.data &&
            isCacheValid(cachedData.parties.timestamp);
          const validCachedTransactions =
            cachedData.transactions.data &&
            isCacheValid(cachedData.transactions.timestamp);
          const validCachedJobSheets =
            cachedData.jobSheets.data &&
            isCacheValid(cachedData.jobSheets.timestamp);

          if (
            validCachedParties ||
            validCachedTransactions ||
            validCachedJobSheets
          ) {
            updateStatsFromCache();
          }
        }

        // Load data progressively - don't wait for all APIs
        const dataPromises = [
          loadPartiesData(forceRefresh),
          loadTransactionsData(forceRefresh),
          loadJobSheetsData(forceRefresh),
          fetchRealtimeData(), // Add realtime data fetching
        ];

        // Don't wait for all - process as they complete
        dataPromises.forEach((promise) => {
          promise.catch((error) => {
            setConnectionStatus("slow");
          });
        });

        // Wait for at least one to complete
        await Promise.race(dataPromises);
        setLastUpdated(new Date());
        setRetryCount(0);
      } catch (error) {
        setConnectionStatus("offline");
        setRetryCount((prev) => prev + 1);

        // Use fallback data if all fails
        if (!cachedData.parties.data) {
          setFallbackData();
        }
      }
    },
    [cachedData, isCacheValid, fetchRealtimeData]
  );

  // Auto-refresh realtime data every 2 minutes (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 120000); // 2 minutes instead of 15 seconds

    return () => clearInterval(interval);
  }, [fetchRealtimeData]);

  const loadPartiesData = useCallback(
    async (forceRefresh = false) => {
      try {
        if (
          !forceRefresh &&
          cachedData.parties.data &&
          isCacheValid(cachedData.parties.timestamp)
        ) {
          setLoading((prev) => ({ ...prev, parties: false }));
          return;
        }

        const data = await fetchWithRetry("/api/parties");
        setCachedData((prev) => ({
          ...prev,
          parties: { data, timestamp: Date.now() },
        }));
        setLoading((prev) => ({ ...prev, parties: false }));
        updateStats({ parties: data });
      } catch (error) {
        setLoading((prev) => ({ ...prev, parties: false }));
        throw error;
      }
    },
    [cachedData, fetchWithRetry, isCacheValid]
  );

  const loadTransactionsData = useCallback(
    async (forceRefresh = false) => {
      try {
        if (
          !forceRefresh &&
          cachedData.transactions.data &&
          isCacheValid(cachedData.transactions.timestamp)
        ) {
          setLoading((prev) => ({ ...prev, transactions: false }));
          return;
        }

        const data = await fetchWithRetry("/api/parties/transactions");
        setCachedData((prev) => ({
          ...prev,
          transactions: { data, timestamp: Date.now() },
        }));
        setLoading((prev) => ({ ...prev, transactions: false }));
        updateStats({ transactions: data });
      } catch (error) {
        setLoading((prev) => ({ ...prev, transactions: false }));
        throw error;
      }
    },
    [cachedData, fetchWithRetry, isCacheValid]
  );

  const loadJobSheetsData = useCallback(
    async (forceRefresh = false) => {
      try {
        if (
          !forceRefresh &&
          cachedData.jobSheets.data &&
          isCacheValid(cachedData.jobSheets.timestamp)
        ) {
          setLoading((prev) => ({ ...prev, jobSheets: false, charts: false }));
          return;
        }

        const data = await fetchWithRetry("/api/job-sheets");
        const jobSheets = data?.data || data || [];
        setCachedData((prev) => ({
          ...prev,
          jobSheets: { data: jobSheets, timestamp: Date.now() },
        }));
        setLoading((prev) => ({ ...prev, jobSheets: false, charts: false }));
        updateStats({ jobSheets });
      } catch (error) {
        setLoading((prev) => ({ ...prev, jobSheets: false, charts: false }));
        throw error;
      }
    },
    [cachedData, fetchWithRetry, isCacheValid]
  );

  const updateStatsFromCache = useCallback(() => {
    const { parties, transactions, jobSheets } = cachedData;
    if (parties.data || transactions.data || jobSheets.data) {
      updateStats({
        parties: parties.data,
        transactions: transactions.data,
        jobSheets: jobSheets.data,
      });
    }
  }, [cachedData]);

  const updateStats = useCallback(
    ({
      parties,
      transactions,
      jobSheets,
    }: {
      parties?: any[] | null;
      transactions?: any[] | null;
      jobSheets?: any[] | null;
    }) => {
      // Use existing cache if not provided
      const currentParties = parties || cachedData.parties.data || [];
      const currentTransactions =
        transactions || cachedData.transactions.data || [];
      const currentJobSheets = jobSheets || cachedData.jobSheets.data || [];

      // Quick calculations - optimized for speed
      // Filter out soft-deleted transactions (those with [DELETED] in description)
      const activeTransactions = currentTransactions.filter(
        (t: any) => !t.description?.includes("[DELETED]")
      );

      const totalBalance = currentParties.reduce(
        (sum: number, party: any) => sum + (party.balance || 0),
        0
      );

      const jobSheetRevenue = currentJobSheets.reduce(
        (sum: number, job: any) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );

      const totalPayments = activeTransactions
        .filter((t: any) => t.type === "payment")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const totalOrders = activeTransactions
        .filter((t: any) => t.type === "order")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Calculate monthly revenue (simplified)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyJobs = currentJobSheets.filter((job: any) => {
        if (!job.created_at) return false;
        const jobDate = new Date(job.created_at);
        return (
          jobDate.getMonth() === currentMonth &&
          jobDate.getFullYear() === currentYear
        );
      });

      const monthlyRevenue = monthlyJobs.reduce(
        (sum: number, job: any) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );

      const estimatedCosts = jobSheetRevenue * 0.65;
      const grossProfit = jobSheetRevenue - estimatedCosts;
      const roi = estimatedCosts > 0 ? (grossProfit / estimatedCosts) * 100 : 0;

      const newStats = {
        totalJobSheets: currentJobSheets.length,
        totalParties: currentParties.length,
        totalBalance,
        totalRevenue: jobSheetRevenue,
        monthlyRevenue,
        sheetsProcessed: Math.round(currentJobSheets.length * 0.8),
        impressions:
          currentJobSheets.reduce(
            (sum: number, job: any) => sum + (job.imp || 0),
            0
          ) || 25,
        pendingJobs: Math.max(
          0,
          currentJobSheets.length - Math.round(currentJobSheets.length * 0.8)
        ),
        recentTransactions: activeTransactions.slice(0, 5),
        recentJobSheets: currentJobSheets.slice(0, 5),
        totalPayments,
        totalOrders,
        roi,
        estimatedCosts,
        grossProfit,
        transactionVolume: activeTransactions.length,
      };

      setStats(newStats);

      // Update charts immediately - don't wait for idle callback
      console.log("Updating dashboard with data:", {
        jobSheets: currentJobSheets.length,
        parties: currentParties.length,
        transactions: currentTransactions.length,
      });

      const calculatedPerformanceData = calculatePerformanceMetrics(
        currentJobSheets,
        currentTransactions,
        currentParties
      );
      console.log("Calculated performance data:", calculatedPerformanceData);
      setPerformanceData(calculatedPerformanceData);

      // Update chart data with live data
      const newChartData = generateMonthlyChartData(
        currentJobSheets,
        currentParties
      );
      console.log("Generated chart data:", newChartData);
      setChartData(newChartData);
    },
    [cachedData]
  );

  const setFallbackData = useCallback(() => {
    setStats({
      totalJobSheets: 3,
      totalParties: 5,
      totalBalance: 0,
      totalRevenue: 253321,
      monthlyRevenue: 84440,
      sheetsProcessed: 2,
      impressions: 25,
      pendingJobs: 1,
      recentTransactions: [],
      recentJobSheets: [],
      totalPayments: 0,
      totalOrders: 0,
      roi: 15.5,
      estimatedCosts: 164659,
      grossProfit: 88662,
      transactionVolume: 0,
    });

    setPerformanceData([
      { name: "Revenue Growth", value: 12.5, color: "#10b981" },
      { name: "Order Volume", value: 75.0, color: "#3b82f6" },
      { name: "Monthly Performance", value: 68.0, color: "#f59e0b" },
      { name: "Business Growth", value: 82.0, color: "#8b5cf6" },
    ]);

    // Set fallback chart data
    setChartData([
      { month: "Jan", jobs: 3, impressions: 150, sheets: 400, parties: 2 },
      { month: "Feb", jobs: 5, impressions: 280, sheets: 650, parties: 3 },
      { month: "Mar", jobs: 4, impressions: 220, sheets: 520, parties: 3 },
      { month: "Apr", jobs: 6, impressions: 320, sheets: 720, parties: 4 },
      { month: "May", jobs: 7, impressions: 380, sheets: 850, parties: 5 },
      { month: "Jun", jobs: 8, impressions: 450, sheets: 920, parties: 5 },
    ]);

    setLoading({
      parties: false,
      transactions: false,
      jobSheets: false,
      charts: false,
    });
  }, []);

  // Calculate performance metrics from real data
  const calculatePerformanceMetrics = useCallback(
    (jobSheets: any[], transactions: any[], parties: any[]) => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Current month revenue
      const currentMonthJobs = jobSheets.filter((job) => {
        if (!job.created_at) return false;
        const jobDate = new Date(job.created_at);
        return (
          jobDate.getMonth() === currentMonth &&
          jobDate.getFullYear() === currentYear
        );
      });

      const currentRevenue = currentMonthJobs.reduce(
        (sum, job) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );

      // Last month revenue for growth calculation
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const lastMonthJobs = jobSheets.filter((job) => {
        if (!job.created_at) return false;
        const jobDate = new Date(job.created_at);
        return (
          jobDate.getMonth() === lastMonth && jobDate.getFullYear() === lastYear
        );
      });

      const lastRevenue = lastMonthJobs.reduce(
        (sum, job) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );

      const revenueGrowth =
        lastRevenue > 0
          ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
          : currentRevenue > 0
            ? 25
            : 0;

      // Order volume calculation
      const currentMonthOrderCount = currentMonthJobs.length;
      const lastMonthOrderCount = lastMonthJobs.length;
      const orderVolumeGrowth =
        lastMonthOrderCount > 0
          ? ((currentMonthOrderCount - lastMonthOrderCount) /
              lastMonthOrderCount) *
            100
          : currentMonthOrderCount > 0
            ? 15
            : 0;

      // Monthly performance (based on revenue vs target)
      const monthlyTarget = 50000; // You can adjust this target
      const monthlyPerformance =
        currentRevenue > 0
          ? Math.min(100, (currentRevenue / monthlyTarget) * 100)
          : 0;

      // Business growth (overall trend based on total jobs vs last period)
      const totalJobsThisMonth = currentMonthJobs.length;
      const avgJobsPerMonth = jobSheets.length / 6; // Average over 6 months
      const businessGrowth =
        avgJobsPerMonth > 0
          ? Math.min(100, (totalJobsThisMonth / avgJobsPerMonth) * 100)
          : totalJobsThisMonth > 0
            ? 50
            : 0;

      return [
        {
          name: "Revenue Growth",
          value: Math.max(0, Math.min(100, Math.abs(revenueGrowth))),
          color: "#10b981",
        },
        {
          name: "Order Volume",
          value: Math.max(0, Math.min(100, Math.abs(orderVolumeGrowth))),
          color: "#3b82f6",
        },
        {
          name: "Monthly Performance",
          value: Math.max(0, Math.min(100, monthlyPerformance)),
          color: "#f59e0b",
        },
        {
          name: "Business Growth",
          value: Math.max(0, Math.min(100, businessGrowth)),
          color: "#8b5cf6",
        },
      ];
    },
    []
  );

  // Generate monthly chart data from real job sheets
  const generateMonthlyChartData = useCallback(
    (jobSheets: any[], parties: any[] = []) => {
      const monthlyData: { [key: string]: any } = {};

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("en-US", { month: "short" });

        monthlyData[monthKey] = {
          month: monthName,
          jobs: 0,
          impressions: 0,
          sheets: 0,
          parties: 0,
        };
      }

      jobSheets.forEach((job) => {
        if (!job.created_at && !job.job_date) return;

        const date = new Date(job.created_at || job.job_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (monthlyData[monthKey]) {
          monthlyData[monthKey].jobs += 1;
          monthlyData[monthKey].impressions += job.imp || 0;
          monthlyData[monthKey].sheets += job.size || 0;
        }
      });

      // Count active parties per month (approximate distribution)
      const activePartiesCount = parties.length;
      Object.keys(monthlyData).forEach((key, index) => {
        monthlyData[key].parties = Math.max(
          1,
          Math.floor(activePartiesCount * (0.6 + index * 0.1))
        );
      });

      // Convert to array
      const chartArray = Object.values(monthlyData);

      return chartArray;
    },
    []
  );

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Format numbers
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }, []);

  // Format tooltip values for charts
  const formatTooltipValue = useCallback(
    (value: any, name: string) => {
      if (name === "jobs") {
        return [formatNumber(value), "Job Sheets"];
      }
      if (name === "sheets") {
        return [formatNumber(value), "Sheets Printed"];
      }
      if (name === "impressions") {
        return [formatNumber(value), "Impressions"];
      }
      if (name === "parties") {
        return [formatNumber(value), "Active Parties"];
      }
      return [formatNumber(value), name];
    },
    [formatNumber]
  );

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Show full-screen loading when all main data is loading
  if (loading.parties && loading.transactions && loading.jobSheets) {
    return (
      <Loading message="Loading Business Dashboard..." size="lg" fullScreen />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-2 max-w-7xl">
        {/* Header Section */}
        <PageHeader
          title="Business Dashboard"
          description="Real-time insights for your printing business"
          icon={BarChart3}
          iconColor="text-blue-600"
          lastUpdated={lastUpdated || undefined}
        >
          {/* Connection Status & Refresh */}
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

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={
              loading.parties && loading.transactions && loading.jobSheets
            }
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                loading.parties || loading.transactions || loading.jobSheets
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </Button>

          <div className="flex gap-2">
            <Link href="/admin/job-sheet-form">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Job Sheet
              </Button>
            </Link>
            <Link href="/parties">
              <Button variant="outline">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Parties
              </Button>
            </Link>
          </div>
        </PageHeader>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              {loading.jobSheets ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-green-400 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-green-400 rounded w-24"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                  <p className="text-xs text-green-100">
                    {formatCurrency(stats.monthlyRevenue)} this month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Job Sheets */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Job Sheets
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              {loading.jobSheets ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-blue-400 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-blue-400 rounded w-20"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats.totalJobSheets}
                  </div>
                  <p className="text-xs text-blue-100">
                    {stats.pendingJobs} pending completion
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Parties */}
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                Active Parties
              </CardTitle>
              <Users className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              {loading.parties ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-purple-400 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-purple-400 rounded w-24"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalParties}</div>
                  <p className="text-xs text-purple-100">
                    {formatCurrency(stats.totalBalance)} total balance
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* ROI */}
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">
                ROI
              </CardTitle>
              <Target className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              {loading.jobSheets ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-orange-400 rounded w-20 mb-2"></div>
                  <div className="h-4 bg-orange-400 rounded w-16"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats.roi.toFixed(1)}%
                  </div>
                  <p className="text-xs text-orange-100">
                    {formatCurrency(stats.grossProfit)} profit
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="space-y-8 mb-8">
          {/* Performance Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {performanceData.map((metric, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {metric.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: metric.color }}
                        >
                          {metric.value.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${metric.color}20` }}
                    >
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, metric.value)}%`,
                          backgroundColor: metric.color,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Job Sheets Trend */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Job Sheets Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading.charts ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-pulse text-gray-500">
                      Loading job data...
                    </div>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="jobsGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="opacity-30"
                        />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          formatter={(value: any, name: string) => [
                            formatNumber(value),
                            "Job Sheets",
                          ]}
                          labelStyle={{ color: "#374151" }}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="jobs"
                          stroke="#3b82f6"
                          fill="url(#jobsGradient)"
                          strokeWidth={3}
                          dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                          activeDot={{
                            r: 6,
                            strokeWidth: 2,
                            stroke: "#3b82f6",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Analytics */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Production Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading.charts ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-pulse text-gray-500">
                      Loading production data...
                    </div>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="opacity-30"
                        />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis yAxisId="left" stroke="#6b7280" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#6b7280"
                        />
                        <Tooltip
                          formatter={(value: any, name: string) => [
                            formatNumber(value),
                            name === "sheets"
                              ? "Sheets Printed"
                              : name === "impressions"
                                ? "Total Impressions"
                                : "Active Parties",
                          ]}
                          labelStyle={{ color: "#374151" }}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="sheets"
                          fill="#10b981"
                          name="Sheets Printed"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="parties"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          name="Active Parties"
                          dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Impressions Volume */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Impressions Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading.charts ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-pulse text-gray-500">
                      Loading impressions data...
                    </div>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="impressionsGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="opacity-30"
                        />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          formatter={(value: any) => [
                            formatNumber(value),
                            "Impressions",
                          ]}
                          labelStyle={{ color: "#374151" }}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="impressions"
                          stroke="#8b5cf6"
                          fill="url(#impressionsGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Performance Pie Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <PieChart className="w-5 h-5 text-orange-600" />
                  Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading.charts ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-pulse text-gray-500">
                      Loading performance data...
                    </div>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={performanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [
                            `${value.toFixed(1)}%`,
                            "Performance",
                          ]}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value, entry) => (
                            <span
                              style={{ color: entry.color, fontWeight: 500 }}
                            >
                              {value}
                            </span>
                          )}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Recent Transactions
                </span>
                <Link href="/parties">
                  <Button variant="outline" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.transactions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center space-x-4"
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentTransactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === "payment"
                              ? "bg-green-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {transaction.type === "payment" ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {transaction.type === "payment"
                              ? "Payment Received"
                              : "New Order"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.description || "No description"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            transaction.type === "payment"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(
                            transaction.created_at
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent transactions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Job Sheets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Recent Job Sheets
                </span>
                <Link href="/admin/job-sheet-form">
                  <Button variant="outline" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.jobSheets ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center space-x-4"
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recentJobSheets.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentJobSheets.map((job, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {job.party_name || "Unknown Party"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.description || "No description"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {formatCurrency(
                            (job.printing || 0) +
                              (job.uv || 0) +
                              (job.baking || 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent job sheets</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/job-sheet-form">
                <Button className="w-full h-16 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">New Job Sheet</span>
                </Button>
              </Link>
              <Link href="/parties">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center gap-2"
                >
                  <Building2 className="w-6 h-6" />
                  <span className="text-sm">Manage Parties</span>
                </Button>
              </Link>
              <Link href="/admin/job-sheet-form">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center gap-2"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-sm">View Reports</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-2"
                onClick={handleRefresh}
              >
                <RefreshCw
                  className={`w-6 h-6 ${
                    loading.parties || loading.transactions || loading.jobSheets
                      ? "animate-spin"
                      : ""
                  }`}
                />
                <span className="text-sm">Refresh Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Recovery */}
        {(error || connectionStatus === "offline") && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">
                    Connection Issue
                  </h3>
                  <p className="text-red-700 text-sm">
                    {error ||
                      "Unable to connect to server. Showing cached data."}
                  </p>
                  {retryCount > 0 && (
                    <p className="text-red-600 text-xs mt-1">
                      Retry attempts: {retryCount}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
