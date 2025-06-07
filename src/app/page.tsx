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
    { name: "Job Efficiency", value: 0, color: "#3b82f6" },
    { name: "Customer Retention", value: 0, color: "#f59e0b" },
    { name: "Production Quality", value: 0, color: "#8b5cf6" },
  ]);

  const [chartData, setChartData] = useState([
    {
      month: "Jan",
      revenue: 180000,
      jobs: 12,
      impressions: 890,
      efficiency: 85,
    },
    {
      month: "Feb",
      revenue: 220000,
      jobs: 15,
      impressions: 1150,
      efficiency: 88,
    },
    {
      month: "Mar",
      revenue: 195000,
      jobs: 13,
      impressions: 965,
      efficiency: 82,
    },
    {
      month: "Apr",
      revenue: 265000,
      jobs: 18,
      impressions: 1320,
      efficiency: 90,
    },
    {
      month: "May",
      revenue: 285000,
      jobs: 20,
      impressions: 1485,
      efficiency: 92,
    },
    {
      month: "Jun",
      revenue: 310000,
      jobs: 22,
      impressions: 1650,
      efficiency: 95,
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

  // Memoized calculations to avoid re-computation
  const businessMetrics = useMemo(
    () => [
      {
        metric: "Completed Jobs",
        current: stats.totalJobSheets,
        target: 25,
        color: "#10b981",
      },
      {
        metric: "Active Customers",
        current: stats.totalParties,
        target: 15,
        color: "#3b82f6",
      },
      {
        metric: "Revenue (₹K)",
        current: Math.round(stats.totalRevenue / 1000),
        target: 350,
        color: "#f59e0b",
      },
      {
        metric: "Efficiency %",
        current: Math.round(
          performanceData.find((p) => p.name === "Job Efficiency")?.value || 0
        ),
        target: 95,
        color: "#8b5cf6",
      },
    ],
    [stats, performanceData]
  );

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

  // Auto-refresh realtime data every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 15000);

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

        // Update charts with real data
        if (jobSheets.length > 0) {
          const monthlyData = generateMonthlyChartData(jobSheets);
          setChartData(monthlyData);
        }
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
      const activeTransactions = currentTransactions.filter(
        (t: any) => !t.is_deleted
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

      // Update performance metrics asynchronously
      requestIdleCallback(() => {
        const calculatedPerformanceData = calculatePerformanceMetrics(
          currentJobSheets,
          currentTransactions,
          currentParties
        );
        setPerformanceData(calculatedPerformanceData);
      });
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
      { name: "Job Efficiency", value: 85.0, color: "#3b82f6" },
      { name: "Customer Retention", value: 90.0, color: "#f59e0b" },
      { name: "Production Quality", value: 88.0, color: "#8b5cf6" },
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
          : 25;

      // Job efficiency (jobs with complete data)
      const completeJobs = jobSheets.filter(
        (job) => job.printing && job.size && job.description && job.party_name
      );
      const jobEfficiency =
        jobSheets.length > 0
          ? (completeJobs.length / jobSheets.length) * 100
          : 85;

      // Customer retention (parties with recent transactions)
      const recentTransactions = transactions.filter((t) => {
        if (!t.created_at) return false;
        const transDate = new Date(t.created_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return transDate >= threeMonthsAgo;
      });

      const activeParties = new Set(recentTransactions.map((t) => t.party_id));
      const customerRetention =
        parties.length > 0 ? (activeParties.size / parties.length) * 100 : 90;

      // Production quality (jobs with UV/baking processes)
      const qualityJobs = jobSheets.filter(
        (job) => (job.uv && job.uv > 0) || (job.baking && job.baking > 0)
      );
      const productionQuality =
        jobSheets.length > 0
          ? (qualityJobs.length / jobSheets.length) * 100
          : 88;

      return [
        {
          name: "Revenue Growth",
          value: Math.max(0, Math.min(100, revenueGrowth)),
          color: "#10b981",
        },
        {
          name: "Job Efficiency",
          value: Math.max(0, Math.min(100, jobEfficiency)),
          color: "#3b82f6",
        },
        {
          name: "Customer Retention",
          value: Math.max(0, Math.min(100, customerRetention)),
          color: "#f59e0b",
        },
        {
          name: "Production Quality",
          value: Math.max(0, Math.min(100, productionQuality)),
          color: "#8b5cf6",
        },
      ];
    },
    []
  );

  // Generate monthly chart data from real job sheets
  const generateMonthlyChartData = useCallback((jobSheets: any[]) => {
    const monthlyData: { [key: string]: any } = {};

    jobSheets.forEach((job) => {
      if (!job.created_at) return;

      const date = new Date(job.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          revenue: 0,
          jobs: 0,
          impressions: 0,
          efficiency: 0,
        };
      }

      monthlyData[monthKey].revenue +=
        (job.printing || 0) + (job.uv || 0) + (job.baking || 0);
      monthlyData[monthKey].jobs += 1;
      monthlyData[monthKey].impressions += job.imp || 0;
    });

    // Convert to array and calculate efficiency
    const chartArray = Object.values(monthlyData).map((data: any) => ({
      ...data,
      efficiency:
        data.jobs > 0 ? Math.min(100, (data.impressions / data.jobs) * 2) : 85,
    }));

    // Sort by month and return last 6 months
    chartArray.sort((a: any, b: any) => a.month.localeCompare(b.month));
    return chartArray.slice(-6);
  }, []);

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
      if (name === "revenue") {
        return [formatCurrency(value), "Revenue"];
      }
      if (name === "efficiency") {
        return [`${value}%`, "Efficiency"];
      }
      return [value, name];
    },
    [formatCurrency]
  );

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-2 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Business Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Real-time insights for your printing business
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Connection Status & Refresh */}
          <div className="flex items-center gap-4">
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
          </div>
        </div>

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

        {/* Business Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {businessMetrics.map((metric, index) => (
            <Card key={index} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    {metric.metric}
                  </span>
                  <Badge
                    variant={
                      metric.current >= metric.target ? "default" : "secondary"
                    }
                  >
                    {((metric.current / metric.target) * 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: metric.color }}
                  >
                    {metric.current}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {metric.target}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (metric.current / metric.target) * 100)}%`,
                      backgroundColor: metric.color,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Trend Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-blue-600" />
                Revenue & Efficiency Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.charts ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-gray-500">
                    Loading charts...
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        fill="#3b82f6"
                        name="Revenue"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="efficiency"
                        stroke="#10b981"
                        strokeWidth={3}
                        name="Efficiency %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-green-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.charts ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-gray-500">
                    Loading metrics...
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={performanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value.toFixed(1)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
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
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Production Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Jobs & Impressions Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Production Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.charts ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-gray-500">
                    Loading production data...
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          formatNumber(value),
                          name === "jobs" ? "Jobs" : "Impressions",
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="jobs"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                        name="Jobs"
                      />
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        stackId="2"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.6}
                        name="Impressions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalPayments)}
                  </div>
                  <div className="text-sm text-green-700">Total Payments</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.totalOrders)}
                  </div>
                  <div className="text-sm text-blue-700">Total Orders</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Revenue Growth</span>
                  <span className="text-sm font-bold text-green-600">
                    +
                    {performanceData
                      .find((p) => p.name === "Revenue Growth")
                      ?.value.toFixed(1) || 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, performanceData.find((p) => p.name === "Revenue Growth")?.value || 0)}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Customer Satisfaction
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {performanceData
                      .find((p) => p.name === "Customer Retention")
                      ?.value.toFixed(1) || 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${performanceData.find((p) => p.name === "Customer Retention")?.value || 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Production Quality
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    {performanceData
                      .find((p) => p.name === "Production Quality")
                      ?.value.toFixed(1) || 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${performanceData.find((p) => p.name === "Production Quality")?.value || 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <Link href="/admin">
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
              <Link href="/admin">
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
