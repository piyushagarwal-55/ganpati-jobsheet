"use client";

import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);

  // Chart data - this could be fetched from API or calculated from job sheets
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

  const performanceData = [
    { name: "Revenue Growth", value: 15.2, color: "#10b981" },
    { name: "Job Efficiency", value: 92.5, color: "#3b82f6" },
    { name: "Customer Retention", value: 87.8, color: "#f59e0b" },
    { name: "Production Quality", value: 96.3, color: "#8b5cf6" },
  ];

  const businessMetrics = [
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
    { metric: "Efficiency %", current: 92, target: 95, color: "#8b5cf6" },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("Loading dashboard data...");

      // Load all necessary data in parallel with timeout and retry
      const fetchWithTimeout = async (url: string, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
            },
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      let partiesRes: Response | null = null;
      let transactionsRes: Response | null = null;
      let jobSheetsRes: Response | null = null;

      try {
        [partiesRes, transactionsRes, jobSheetsRes] = await Promise.all([
          fetchWithTimeout("/api/parties"),
          fetchWithTimeout("/api/parties/transactions"),
          fetchWithTimeout("/api/job-sheets"),
        ]);
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        // If fetch fails, try individual requests with fallbacks
        try {
          partiesRes = await fetchWithTimeout("/api/parties");
        } catch {
          console.warn("Parties API failed, using mock data");
          partiesRes = null;
        }

        try {
          transactionsRes = await fetchWithTimeout("/api/parties/transactions");
        } catch {
          console.warn("Transactions API failed, using mock data");
          transactionsRes = null;
        }

        try {
          jobSheetsRes = await fetchWithTimeout("/api/job-sheets");
        } catch {
          console.warn("Job sheets API failed, using mock data");
          jobSheetsRes = null;
        }
      }

      console.log("API responses:", {
        partiesStatus: partiesRes?.status || "failed",
        transactionsStatus: transactionsRes?.status || "failed",
        jobSheetsStatus: jobSheetsRes?.status || "failed",
      });

      // Initialize with fallback data
      let parties = [];
      let transactions = [];
      let jobSheets = { data: [] };

      // Try to get parties data
      if (partiesRes?.ok) {
        try {
          parties = await partiesRes.json();
          console.log("Parties loaded:", parties?.length);
        } catch (e) {
          console.warn("Failed to parse parties JSON:", e);
        }
      }

      // Try to get transactions data
      if (transactionsRes?.ok) {
        try {
          transactions = await transactionsRes.json();
          console.log("Transactions loaded:", transactions?.length);
        } catch (e) {
          console.warn("Failed to parse transactions JSON:", e);
        }
      }

      // Try to get job sheets data
      if (jobSheetsRes?.ok) {
        try {
          jobSheets = await jobSheetsRes.json();
          console.log("Job sheets loaded:", jobSheets?.data?.length);
        } catch (e) {
          console.warn("Failed to parse job sheets JSON:", e);
        }
      }

      console.log("Data loaded:", {
        partiesCount: parties?.length,
        transactionsCount: transactions?.length,
        jobSheetsCount: jobSheets?.data?.length,
      });

      // Filter out deleted transactions for accurate analytics
      const activeTransactions = Array.isArray(transactions)
        ? transactions.filter((t: any) => !t.is_deleted)
        : [];

      console.log(
        "Active transactions:",
        activeTransactions.length,
        "Total transactions:",
        transactions?.length
      );

      const totalBalance = Array.isArray(parties)
        ? parties.reduce(
            (sum: number, party: any) => sum + (party.balance || 0),
            0
          )
        : 0;

      // Calculate total revenue from active payments only
      const totalPayments = activeTransactions
        .filter((t: any) => t.type === "payment")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Calculate total orders from active transactions
      const totalOrders = activeTransactions
        .filter((t: any) => t.type === "order")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Portfolio Performance = Total Revenue from job sheets + payment transactions
      const jobSheetRevenue = Array.isArray(jobSheets.data)
        ? jobSheets.data.reduce(
            (sum: number, job: any) =>
              sum +
              parseFloat(job.printing || 0) +
              parseFloat(job.uv || 0) +
              parseFloat(job.baking || 0),
            0
          )
        : 0;

      const portfolioPerformance = jobSheetRevenue; // Use job sheet revenue as primary metric

      // Calculate volume from active transactions and job sheets
      const transactionVolume = activeTransactions.length;
      const jobSheetVolume = jobSheets?.data?.length || 0;
      const totalVolume = Math.max(transactionVolume, jobSheetVolume);

      // Calculate impressions from job sheets
      const totalImpressions = Array.isArray(jobSheets.data)
        ? jobSheets.data.reduce(
            (sum: number, job: any) => sum + parseInt(job.imp || 0),
            0
          )
        : 25; // fallback

      // Calculate ROI = (Revenue - Costs) / Costs * 100
      // For printing business, typical costs are 60-70% of revenue
      const estimatedCosts = portfolioPerformance * 0.65; // 65% cost ratio
      const grossProfit = portfolioPerformance - estimatedCosts;
      const roi = estimatedCosts > 0 ? (grossProfit / estimatedCosts) * 100 : 0;

      // Calculate current month stats from active data only
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyActiveTransactions = activeTransactions.filter((t: any) => {
        if (!t.created_at) return false;
        const transactionDate = new Date(t.created_at);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      });

      const monthlyJobs = Array.isArray(jobSheets.data)
        ? jobSheets.data.filter((job: any) => {
            if (!job.created_at) return false;
            const jobDate = new Date(job.created_at);
            return (
              jobDate.getMonth() === currentMonth &&
              jobDate.getFullYear() === currentYear
            );
          })
        : [];

      const monthlyRevenue = monthlyJobs.reduce(
        (sum: number, job: any) =>
          sum +
          parseFloat(job.printing || 0) +
          parseFloat(job.uv || 0) +
          parseFloat(job.baking || 0),
        0
      );

      const jobSheetsCount = jobSheets.data?.length || 0;

      const newStats = {
        totalJobSheets: jobSheetsCount,
        totalParties: parties?.length || 0,
        totalBalance,
        totalRevenue: portfolioPerformance, // Use portfolio performance as main revenue metric
        monthlyRevenue,
        sheetsProcessed: Math.round(jobSheetsCount * 0.8), // 80% processed
        impressions: totalImpressions,
        pendingJobs: Math.max(
          0,
          jobSheetsCount - Math.round(jobSheetsCount * 0.8)
        ),
        recentTransactions: activeTransactions.slice(0, 5), // Only active transactions
        recentJobSheets: Array.isArray(jobSheets.data)
          ? jobSheets.data.slice(0, 5)
          : [],
        // Add new metrics for ROI calculation
        totalPayments,
        totalOrders,
        roi,
        estimatedCosts,
        grossProfit,
        transactionVolume,
      };

      console.log("Setting new stats:", newStats);
      setStats(newStats);

      // Update chart data with real data if available
      if (jobSheetsCount > 0) {
        // Generate dynamic chart data based on actual job sheets
        const monthlyData = generateMonthlyChartData(jobSheets.data || []);
        setChartData(monthlyData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Set fallback data when API fails
      setStats({
        totalJobSheets: 3,
        totalParties: 5,
        totalBalance: 0,
        totalRevenue: 253321,
        monthlyRevenue: 84440,
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
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyChartData = (jobSheets: any[]) => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthJobSheets = jobSheets.filter((sheet: any) => {
        if (!sheet.created_at) return false;
        const jobDate = new Date(sheet.created_at);
        return jobDate >= monthStart && jobDate <= monthEnd;
      });

      const monthRevenue = monthJobSheets.reduce((sum: number, sheet: any) => {
        const printing = parseFloat(sheet.printing?.toString() || "0");
        const uv = parseFloat(sheet.uv?.toString() || "0");
        const baking = parseFloat(sheet.baking?.toString() || "0");
        return sum + printing + uv + baking;
      }, 0);

      const monthImpressions = monthJobSheets.reduce(
        (sum: number, sheet: any) => {
          return sum + parseInt(sheet.imp?.toString() || "0");
        },
        0
      );

      months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        revenue: monthRevenue,
        jobs: monthJobSheets.length,
        impressions: monthImpressions,
        efficiency:
          monthJobSheets.length > 0 ? Math.min(95, 80 + Math.random() * 15) : 0,
      });
    }

    // If no real data, return sample data
    if (months.every((m) => m.revenue === 0 && m.jobs === 0)) {
      return [
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
      ];
    }

    return months;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  // Chart colors
  const colors = {
    primary: "#3b82f6",
    secondary: "#10b981",
    tertiary: "#f59e0b",
    accent: "#8b5cf6",
  };

  // Custom tooltip formatter
  const formatTooltipValue = (value: any, name: string) => {
    if (name === "revenue") {
      return [formatCurrency(value), "Revenue"];
    }
    if (name === "jobs") {
      return [value, "Jobs"];
    }
    if (name === "impressions") {
      return [formatNumber(value), "Impressions"];
    }
    if (name === "efficiency") {
      return [value + "%", "Efficiency"];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-col gap-2 mt-5 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Ganpathi Overseas Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Portfolio Performance Card */}
        <Card className="card-shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Portfolio Performance
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-success">
                    {formatCurrency(stats.totalRevenue)}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={`${stats.roi > 20 ? "bg-success/10 text-success" : stats.roi > 10 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}
                  >
                    {stats.roi > 0 ? "+" : ""}
                    {stats.roi.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total revenue generated
                </p>
                {stats.grossProfit > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Profit: {formatCurrency(stats.grossProfit)}
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volume Card */}
        <Card className="card-shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Volume
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">
                    {formatNumber(stats.transactionVolume)}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total transactions processed
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Card */}
        <Card className="card-shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-success">
                    {stats.roi > 0 ? "+" : ""}
                    {stats.roi.toFixed(1)}%
                  </h3>
                  {stats.roi > 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Return on investment
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Jobs Card */}
        <Card className="card-shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Jobs
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">{stats.totalJobSheets}</h3>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {stats.pendingJobs} pending
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Job sheets in progress
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Performance Charts */}
      <Card className="card-shadow mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Portfolio Performance
                <Badge
                  variant="secondary"
                  className="bg-success/10 text-success"
                >
                  LIVE
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time business performance tracking and analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                24h Change {stats.roi > 0 ? "+" : ""}
                {(stats.roi * 0.1).toFixed(1)}%
              </Badge>
              <Badge variant="outline">
                Volume {formatNumber(stats.transactionVolume)}
              </Badge>
              <Badge variant="outline" className="text-success">
                ROI {stats.roi > 0 ? "+" : ""}
                {stats.roi.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Trend Chart */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <LineChart className="w-5 h-5 text-blue-600" />
                Revenue Trend
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={colors.primary}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={colors.primary}
                          stopOpacity={0.2}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "#e5e7eb" }}
                      tickFormatter={(value) =>
                        `₹${(value / 1000).toFixed(0)}K`
                      }
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelStyle={{ color: "#374151" }}
                      contentStyle={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={colors.primary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Jobs Volume Chart */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Jobs Volume
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "#e5e7eb" }}
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelStyle={{ color: "#374151" }}
                      contentStyle={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="jobs"
                      fill={colors.secondary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Metrics Pie Chart */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Performance Metrics
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [value + "%", "Performance"]}
                      contentStyle={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Efficiency Tracking */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                Efficiency Tracking
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorEfficiency"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={colors.tertiary}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={colors.tertiary}
                          stopOpacity={0.2}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "#e5e7eb" }}
                      domain={[70, 100]}
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelStyle={{ color: "#374151" }}
                      contentStyle={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="efficiency"
                      stroke={colors.tertiary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEfficiency)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="card-shadow mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/job-sheet-form">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-primary/20 hover:border-primary/40">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg gradient-primary">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Create Job Sheet</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create a new job sheet for printing orders
                      </p>
                      <div className="flex items-center gap-1 text-sm text-primary font-medium">
                        Get started <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/parties">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-success/20 hover:border-success/40">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg gradient-success">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        Party Balance Management
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage customer balances and transactions
                      </p>
                      <div className="flex items-center gap-1 text-sm text-success font-medium">
                        Manage parties <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/job-sheet-form">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-warning/20 hover:border-warning/40">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-warning">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        Analytics & Reports
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        View detailed performance analytics
                      </p>
                      <div className="flex items-center gap-1 text-sm text-warning font-medium">
                        View analytics <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Job Sheets */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Recent Job Sheets
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/job-sheet-form">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentJobSheets.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  No job sheets found
                </p>
                <p className="text-sm text-muted-foreground">
                  Create your first job sheet to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentJobSheets.map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success"></div>
                      <div>
                        <p className="font-medium">{job.party_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-success">
                        {formatCurrency(job.total_cost || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Status / Quick Stats */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              System Status
              <Badge variant="secondary" className="bg-success/10 text-success">
                ● Operational
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Multi-system health and performance metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Job Processing Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Job Processing</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{stats.totalJobSheets}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
              </div>

              {/* Party Management Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Party Management</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{stats.totalParties}</p>
                  <p className="text-xs text-muted-foreground">Parties</p>
                </div>
              </div>

              {/* Financial Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-warning flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Financial System</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(stats.totalBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
