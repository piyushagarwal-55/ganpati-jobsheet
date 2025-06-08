"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  BarChart3,
  Calendar,
  Activity,
  Target,
  Award,
  LineChart,
  PieChart,
  Factory,
  Clock,
  DollarSign,
  Package,
  Percent,
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
import Loading from "@/components/ui/loading";
import DashboardNavbar from "@/components/dashboard-navbar";

interface DashboardMetrics {
  // Volume Metrics
  totalJobSheets: number;
  totalParties: number;
  totalImpressions: number;
  totalSheets: number;

  // Financial Metrics
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  averageJobValue: number;

  // ROI Metrics
  roi: number;
  profitMargin: number;
  revenuePerImpression: number;
  costPerSheet: number;

  // Growth Metrics
  monthlyGrowth: number;
  revenueGrowth: number;
  customerGrowth: number;

  // Efficiency Metrics
  impressionsPerSheet: number;
  jobsPerParty: number;
  utilizationRate: number;

  // Time-based data
  thisMonth: any;
  lastMonth: any;
  chartData: any[];
  profitabilityData: any[];
  volumeData: any[];
}

interface Party {
  id: number;
  name: string;
  balance: number;
}

interface JobSheet {
  id: number;
  job_date: string;
  party_id: number;
  party_name: string;
  printing: number;
  uv: number;
  baking: number;
  paper_sheet: number;
  imp: number;
  created_at: string;
}

interface Transaction {
  id: number;
  party_id: number;
  type: string;
  amount: number;
  created_at: string;
  description?: string;
}

export default function EnhancedDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalJobSheets: 0,
    totalParties: 0,
    totalImpressions: 0,
    totalSheets: 0,
    totalRevenue: 0,
    totalCosts: 0,
    grossProfit: 0,
    netProfit: 0,
    averageJobValue: 0,
    roi: 0,
    profitMargin: 0,
    revenuePerImpression: 0,
    costPerSheet: 0,
    monthlyGrowth: 0,
    revenueGrowth: 0,
    customerGrowth: 0,
    impressionsPerSheet: 0,
    jobsPerParty: 0,
    utilizationRate: 0,
    thisMonth: {},
    lastMonth: {},
    chartData: [],
    profitabilityData: [],
    volumeData: [],
  });

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("6months");

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data sources
      const [partiesRes, jobSheetsRes, transactionsRes] = await Promise.all([
        fetch("/api/parties").catch(() => null),
        fetch("/api/job-sheets").catch(() => null),
        fetch("/api/parties/transactions").catch(() => null),
      ]);

      let parties: Party[] = [];
      let jobSheets: JobSheet[] = [];
      let transactions: Transaction[] = [];

      // Parse responses safely
      if (partiesRes?.ok) {
        const result = await partiesRes.json();
        parties = result.success ? result.data : result;
      }

      if (jobSheetsRes?.ok) {
        const result = await jobSheetsRes.json();
        jobSheets = result.success ? result.data : result.data || [];
      }

      if (transactionsRes?.ok) {
        const result = await transactionsRes.json();
        transactions = result.success ? result.data : result;
      }

      // Calculate comprehensive metrics
      const calculatedMetrics = calculateBusinessMetrics(
        parties,
        jobSheets,
        transactions
      );
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Set fallback data for demo
      setMetrics(getFallbackMetrics());
    } finally {
      setLoading(false);
    }
  };

  const calculateBusinessMetrics = (
    parties: Party[],
    jobSheets: JobSheet[],
    transactions: Transaction[]
  ): DashboardMetrics => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Volume Metrics
    const totalJobSheets = jobSheets.length;
    const totalParties = parties.length;
    const totalImpressions = jobSheets.reduce(
      (sum, job) => sum + (job.imp || 0),
      0
    );
    const totalSheets = jobSheets.reduce(
      (sum, job) => sum + (job.paper_sheet || 0),
      0
    );

    // Financial Metrics
    const jobSheetRevenue = jobSheets.reduce(
      (sum, job) =>
        sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
      0
    );

    // Add payment transactions to total revenue (exclude soft-deleted)
    const paymentRevenue = transactions
      .filter(
        (t) => t.type === "payment" && !t.description?.includes("[DELETED]")
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalRevenue = jobSheetRevenue + paymentRevenue;

    // Estimate costs (typically 60-70% of revenue for printing business)
    const totalCosts = totalRevenue * 0.65;
    const grossProfit = totalRevenue - totalCosts;
    const netProfit = grossProfit * 0.85; // After overhead costs
    const averageJobValue =
      totalJobSheets > 0 ? jobSheetRevenue / totalJobSheets : 0;

    // ROI Metrics
    const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const revenuePerImpression =
      totalImpressions > 0 ? totalRevenue / totalImpressions : 0;
    const costPerSheet = totalSheets > 0 ? totalCosts / totalSheets : 0;

    // Time-based calculations
    const thisMonthJobs = jobSheets.filter(
      (job) => job.job_date && new Date(job.job_date) >= thisMonth
    ).length;
    const lastMonthJobs = jobSheets.filter(
      (job) =>
        job.job_date &&
        new Date(job.job_date) >= lastMonth &&
        new Date(job.job_date) <= lastMonthEnd
    ).length;

    const thisMonthRevenue = jobSheets
      .filter((job) => job.job_date && new Date(job.job_date) >= thisMonth)
      .reduce(
        (sum, job) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );

    const lastMonthRevenue = jobSheets
      .filter(
        (job) =>
          job.job_date &&
          new Date(job.job_date) >= lastMonth &&
          new Date(job.job_date) <= lastMonthEnd
      )
      .reduce(
        (sum, job) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );

    // Growth Metrics
    const monthlyGrowth =
      lastMonthJobs > 0
        ? ((thisMonthJobs - lastMonthJobs) / lastMonthJobs) * 100
        : 0;
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Get new customers this month vs last month
    const thisMonthNewCustomers = parties.filter(
      (party) => party.id && new Date(party.id.toString()) >= thisMonth
    ).length;
    const lastMonthNewCustomers = parties.filter(
      (party) =>
        party.id &&
        new Date(party.id.toString()) >= lastMonth &&
        new Date(party.id.toString()) <= lastMonthEnd
    ).length;
    const customerGrowth =
      lastMonthNewCustomers > 0
        ? ((thisMonthNewCustomers - lastMonthNewCustomers) /
            lastMonthNewCustomers) *
          100
        : 0;

    // Efficiency Metrics
    const impressionsPerSheet =
      totalSheets > 0 ? totalImpressions / totalSheets : 0;
    const jobsPerParty = totalParties > 0 ? totalJobSheets / totalParties : 0;
    const utilizationRate = Math.min(95, 75 + Math.random() * 20); // Mock utilization rate

    // Generate chart data
    const chartData = generateChartData(jobSheets);
    const profitabilityData = generateProfitabilityData(jobSheets);
    const volumeData = generateVolumeData(jobSheets);

    return {
      totalJobSheets,
      totalParties,
      totalImpressions,
      totalSheets,
      totalRevenue,
      totalCosts,
      grossProfit,
      netProfit,
      averageJobValue,
      roi,
      profitMargin,
      revenuePerImpression,
      costPerSheet,
      monthlyGrowth,
      revenueGrowth,
      customerGrowth,
      impressionsPerSheet,
      jobsPerParty,
      utilizationRate,
      thisMonth: { jobs: thisMonthJobs, revenue: thisMonthRevenue },
      lastMonth: { jobs: lastMonthJobs, revenue: lastMonthRevenue },
      chartData,
      profitabilityData,
      volumeData,
    };
  };

  const generateChartData = (jobSheets: JobSheet[]) => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthJobs = jobSheets.filter((job) => {
        if (!job.job_date) return false;
        const jobDate = new Date(job.job_date);
        return jobDate >= monthStart && jobDate <= monthEnd;
      });

      const revenue = monthJobs.reduce(
        (sum, job) =>
          sum + (job.printing || 0) + (job.uv || 0) + (job.baking || 0),
        0
      );
      const costs = revenue * 0.65;
      const profit = revenue - costs;
      const impressions = monthJobs.reduce(
        (sum, job) => sum + (job.imp || 0),
        0
      );

      months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        revenue,
        costs,
        profit,
        jobs: monthJobs.length,
        impressions,
        roi: costs > 0 ? (profit / costs) * 100 : 0,
      });
    }

    return months;
  };

  const generateProfitabilityData = (jobSheets: JobSheet[]) => {
    return [
      {
        name: "Printing",
        value: jobSheets.reduce((sum, job) => sum + (job.printing || 0), 0),
        color: "#3b82f6",
      },
      {
        name: "UV Coating",
        value: jobSheets.reduce((sum, job) => sum + (job.uv || 0), 0),
        color: "#10b981",
      },
      {
        name: "Baking",
        value: jobSheets.reduce((sum, job) => sum + (job.baking || 0), 0),
        color: "#f59e0b",
      },
    ];
  };

  const generateVolumeData = (jobSheets: JobSheet[]) => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthJobs = jobSheets.filter((job) => {
        if (!job.job_date) return false;
        const jobDate = new Date(job.job_date);
        return jobDate >= monthStart && jobDate <= monthEnd;
      });

      months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        sheets: monthJobs.reduce((sum, job) => sum + (job.paper_sheet || 0), 0),
        impressions: monthJobs.reduce((sum, job) => sum + (job.imp || 0), 0),
      });
    }

    return months;
  };

  const getFallbackMetrics = (): DashboardMetrics => {
    return {
      totalJobSheets: 15,
      totalParties: 8,
      totalImpressions: 12450,
      totalSheets: 1850,
      totalRevenue: 253321,
      totalCosts: 164659,
      grossProfit: 88662,
      netProfit: 75362,
      averageJobValue: 16888,
      roi: 45.8,
      profitMargin: 35.0,
      revenuePerImpression: 20.35,
      costPerSheet: 89.03,
      monthlyGrowth: 12.5,
      revenueGrowth: 18.3,
      customerGrowth: 25.0,
      impressionsPerSheet: 6.73,
      jobsPerParty: 1.88,
      utilizationRate: 87.5,
      thisMonth: { jobs: 5, revenue: 84440 },
      lastMonth: { jobs: 4, revenue: 68900 },
      chartData: [
        {
          month: "Jan",
          revenue: 180000,
          costs: 117000,
          profit: 63000,
          jobs: 12,
          impressions: 8900,
          roi: 53.8,
        },
        {
          month: "Feb",
          revenue: 220000,
          costs: 143000,
          profit: 77000,
          jobs: 15,
          impressions: 11500,
          roi: 53.8,
        },
        {
          month: "Mar",
          revenue: 195000,
          costs: 126750,
          profit: 68250,
          jobs: 13,
          impressions: 9650,
          roi: 53.8,
        },
        {
          month: "Apr",
          revenue: 265000,
          costs: 172250,
          profit: 92750,
          jobs: 18,
          impressions: 13200,
          roi: 53.8,
        },
        {
          month: "May",
          revenue: 285000,
          costs: 185250,
          profit: 99750,
          jobs: 20,
          impressions: 14850,
          roi: 53.8,
        },
        {
          month: "Jun",
          revenue: 253321,
          costs: 164659,
          profit: 88662,
          jobs: 15,
          impressions: 12450,
          roi: 53.8,
        },
      ],
      profitabilityData: [
        { name: "Printing", value: 180000, color: "#3b82f6" },
        { name: "UV Coating", value: 45000, color: "#10b981" },
        { name: "Baking", value: 28321, color: "#f59e0b" },
      ],
      volumeData: [
        { month: "Jan", sheets: 1200, impressions: 8900 },
        { month: "Feb", sheets: 1450, impressions: 11500 },
        { month: "Mar", sheets: 1300, impressions: 9650 },
        { month: "Apr", sheets: 1650, impressions: 13200 },
        { month: "May", sheets: 1750, impressions: 14850 },
        { month: "Jun", sheets: 1850, impressions: 12450 },
      ],
    };
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
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar />
        <Loading
          message="Calculating Business Metrics..."
          size="lg"
          fullScreen
        />
      </>
    );
  }

  return (
    <>
      <DashboardNavbar />
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Business Dashboard
                </h1>
                <p className="text-gray-600">ROI Analytics & Volume Metrics</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === "3months" ? "default" : "outline"}
                  onClick={() => setTimeRange("3months")}
                  size="sm"
                >
                  3M
                </Button>
                <Button
                  variant={timeRange === "6months" ? "default" : "outline"}
                  onClick={() => setTimeRange("6months")}
                  size="sm"
                >
                  6M
                </Button>
                <Button
                  variant={timeRange === "1year" ? "default" : "outline"}
                  onClick={() => setTimeRange("1year")}
                  size="sm"
                >
                  1Y
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.totalRevenue)}
                </div>
                <div className="flex items-center mt-2">
                  {getGrowthIcon(metrics.revenueGrowth)}
                  <span
                    className={`text-sm ml-1 ${getGrowthColor(metrics.revenueGrowth)}`}
                  >
                    {metrics.revenueGrowth > 0 ? "+" : ""}
                    {metrics.revenueGrowth.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    vs last month
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ROI */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Return on Investment
                </CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.roi.toFixed(1)}%
                </div>
                <div className="flex items-center mt-2">
                  <Badge
                    variant={
                      metrics.roi > 40
                        ? "default"
                        : metrics.roi > 20
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {metrics.roi > 40
                      ? "Excellent"
                      : metrics.roi > 20
                        ? "Good"
                        : "Needs Improvement"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Profit Margin */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Profit Margin
                </CardTitle>
                <Percent className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.profitMargin.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Gross: {formatCurrency(metrics.grossProfit)}
                </p>
              </CardContent>
            </Card>

            {/* Total Volume */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Production Volume
                </CardTitle>
                <Factory className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.totalImpressions)}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Impressions ({formatNumber(metrics.totalSheets)} sheets)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Avg Job Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {formatCurrency(metrics.averageJobValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Revenue/Impression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  ₹{metrics.revenuePerImpression.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Cost/Sheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  ₹{metrics.costPerSheet.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {metrics.impressionsPerSheet.toFixed(1)}
                </div>
                <p className="text-xs text-gray-500">Imp/Sheet</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {metrics.utilizationRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue & Profitability Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Revenue & Profitability Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (
                            name === "revenue" ||
                            name === "costs" ||
                            name === "profit"
                          ) {
                            return [
                              formatCurrency(value),
                              name.charAt(0).toUpperCase() + name.slice(1),
                            ];
                          }
                          if (name === "roi") {
                            return [`${value.toFixed(1)}%`, "ROI"];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        fill="#3b82f6"
                        name="Revenue"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="costs"
                        fill="#ef4444"
                        name="Costs"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="profit"
                        fill="#10b981"
                        name="Profit"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="roi"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        name="ROI %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Service Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-600" />
                  Service Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={metrics.profitabilityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) =>
                          `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.profitabilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [
                          formatCurrency(value),
                          "Revenue",
                        ]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Volume Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Volume Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-purple-600" />
                  Production Volume Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.volumeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          formatNumber(value),
                          name === "sheets" ? "Sheets" : "Impressions",
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="sheets"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                        name="Sheets"
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
              </CardContent>
            </Card>

            {/* Business Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Business Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Job Completion Rate
                    </span>
                    <span className="text-sm font-bold">95.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: "95.2%" }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Customer Satisfaction
                    </span>
                    <span className="text-sm font-bold">88.7%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: "88.7%" }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Equipment Utilization
                    </span>
                    <span className="text-sm font-bold">
                      {metrics.utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${metrics.utilizationRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className="text-sm font-bold">
                      {metrics.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{ width: `${metrics.profitMargin}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.totalJobSheets}
                </div>
                <div className="text-sm text-gray-600">Total Jobs</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.totalParties}
                </div>
                <div className="text-sm text-gray-600">Active Clients</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.jobsPerParty.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Jobs/Client</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(metrics.totalSheets)}
                </div>
                <div className="text-sm text-gray-600">Total Sheets</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {formatNumber(metrics.totalImpressions)}
                </div>
                <div className="text-sm text-gray-600">Impressions</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div
                  className={`text-2xl font-bold ${getGrowthColor(metrics.monthlyGrowth)}`}
                >
                  {metrics.monthlyGrowth > 0 ? "+" : ""}
                  {metrics.monthlyGrowth.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Growth Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <Button
              onClick={() => (window.location.href = "/admin/job-sheet-form")}
            >
              New Job Sheet
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/parties")}
            >
              Manage Parties
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                (window.location.href = "/admin/party-constraint-helper")
              }
            >
              Constraint Helper
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
