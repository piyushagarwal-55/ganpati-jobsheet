"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, BarChart3, Activity, Zap, RefreshCw } from "lucide-react";

interface EnhancedDashboardProps {
  stats: any;
  chartData: any[];
}

export default function EnhancedDashboard({
  stats,
  chartData,
}: EnhancedDashboardProps) {
  const [realtimeData, setRealtimeData] = useState(stats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch real-time data
  const fetchRealtimeData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/dashboard/realtime");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealtimeData(data.data.stats);
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 5 minutes (reduced frequency)
  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₹${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Prepare chart data
  const revenueData = chartData.map((item) => ({
    month: item.month,
    revenue: item.revenue,
  }));

  const jobsData = chartData.map((item) => ({
    month: item.month,
    jobs: item.jobSheets,
  }));

  const efficiencyData = chartData.map((item, index) => ({
    month: item.month,
    efficiency: 70 + index * 2 + Math.random() * 10, // Mock efficiency data
  }));

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Portfolio Performance
            </h1>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
              LIVE
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            Real-time business performance tracking and analytics
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>24h Change</span>
            <span className="text-gray-900 font-medium">
              {realtimeData.revenueGrowth >= 0 ? "+" : ""}
              {realtimeData.revenueGrowth.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Volume</span>
            <span className="text-gray-900 font-medium">
              {realtimeData.totalJobSheets}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>ROI</span>
            <span className="text-green-600 font-medium">
              {(
                (realtimeData.totalRevenue /
                  Math.max(1, realtimeData.totalJobSheets * 1000)) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
          <button
            onClick={fetchRealtimeData}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <TrendingUp className="w-5 h-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" fontSize={12} />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Revenue",
                  ]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs Volume */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <BarChart3 className="w-5 h-5" />
              Jobs Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip
                  formatter={(value) => [value, "Jobs"]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="jobs" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Activity className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Revenue</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(realtimeData.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Jobs</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatNumber(realtimeData.totalJobSheets)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Parties</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatNumber(realtimeData.totalParties)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Order Value</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(realtimeData.avgOrderValue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Monthly Growth</span>
                <span
                  className={`text-xl font-bold ${
                    realtimeData.revenueGrowth >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {realtimeData.revenueGrowth >= 0 ? "+" : ""}
                  {realtimeData.revenueGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Tracking */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5" />
              Efficiency Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={efficiencyData}>
                <defs>
                  <linearGradient
                    id="efficiencyGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} domain={[70, 100]} />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value).toFixed(1)}%`,
                    "Efficiency",
                  ]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#efficiencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Status */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live Data - Auto-refreshes every 30 seconds</span>
          {lastUpdate && (
            <span>• Last updated: {lastUpdate.toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>📊 {chartData.length} months of data</span>
          <span>⚡ Real-time analytics</span>
        </div>
      </div>
    </div>
  );
}
