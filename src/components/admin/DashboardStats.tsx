"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  IndianRupee,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Plus,
  DollarSign,
  Package,
  Users,
  TrendingDown,
  Zap,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { DashboardStats as StatsType, ChartData } from "@/types/database";

interface DashboardStatsProps {
  stats: StatsType;
  chartData: ChartData[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function DashboardStats({
  stats,
  chartData,
}: DashboardStatsProps) {
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [realtimeStats, setRealtimeStats] = useState(stats);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Real-time data fetching using the optimized API
  const fetchRealtimeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard/realtime");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealtimeStats(data.data.stats);
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error("Error fetching realtime dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize and reduce auto-refresh frequency
  useEffect(() => {
    // Initial fetch on client side only
    fetchRealtimeData();

    // Auto-refresh every 5 minutes instead of 30 seconds to reduce interference
    const interval = setInterval(fetchRealtimeData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = () => {
    fetchRealtimeData();
  };

  // Prepare chart data
  const revenueData = chartData.map((item) => ({
    ...item,
    efficiency:
      item.jobSheets > 0 ? (item.revenue / item.jobSheets).toFixed(0) : 0,
  }));

  const pieData = [
    {
      name: "Job Sheets",
      value: realtimeStats.totalJobSheets,
      color: COLORS[0],
    },
    { name: "Parties", value: realtimeStats.totalParties, color: COLORS[1] },
    { name: "Orders", value: realtimeStats.totalOrders, color: COLORS[2] },
  ];

  const performanceData = [
    { metric: "Efficiency", value: realtimeStats.avgOrderValue, target: 5000 },
    { metric: "Volume", value: realtimeStats.totalJobSheets, target: 100 },
    {
      metric: "Growth",
      value: Math.abs(realtimeStats.revenueGrowth),
      target: 20,
    },
  ];

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

  const handleAddNewJobSheet = () => {
    window.location.href = "/admin/job-sheet-form";
  };

  const handleExportData = () => {
    // Export functionality would be implemented here
    console.log("Data export triggered");
  };

  return (
    <div className="space-y-6">
      {/* Real-time Update Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-600">
            {lastUpdate
              ? `Last updated: ${lastUpdate.toLocaleTimeString()}`
              : "Loading..."}
          </span>
          {isLoading && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Updating..." : "Refresh"}
        </button>
      </div>

      {/* Key Metrics Cards - Only Order Value and Metric */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Order Value
            </CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(realtimeStats.avgOrderValue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-blue-500" />
              Per job efficiency metric
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/10 to-green-600/10 rounded-full -mr-10 -mt-10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Performance Metric
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(realtimeStats.revenueGrowth)}
            </div>
            <div className="text-xs text-muted-foreground">
              {realtimeStats.revenueGrowth >= 0
                ? "Growth rate"
                : "Decline rate"}
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-blue-600/10 rounded-full -mr-10 -mt-10"></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Efficiency Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Revenue & Efficiency Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue" ? formatCurrency(Number(value)) : value,
                    name === "revenue"
                      ? "Revenue"
                      : name === "efficiency"
                        ? "Efficiency (₹/sheet)"
                        : "Job Sheets",
                  ]}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "value" ? value.toLocaleString() : value,
                    name === "value" ? "Current" : "Target",
                  ]}
                />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Production Volume & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Production Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="jobSheets"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Business Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Business Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>🟢 Live Data - Auto-refreshes every 30 seconds</span>
            <span>📊 {revenueData.length} months of data</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
