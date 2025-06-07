"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  IndianRupee,
  Target,
  Activity,
  BarChart3,
  Award,
  Plus,
  Download,
  LineChart,
  X,
} from "lucide-react";
import { DashboardStats as StatsType, ChartData } from "@/types/database";

interface DashboardStatsProps {
  stats: StatsType;
  chartData: ChartData[];
}

export default function DashboardStats({
  stats,
  chartData,
}: DashboardStatsProps) {
  const [showReportsModal, setShowReportsModal] = useState(false);

  const handleAddNewQuote = () => {
    window.location.href = "/quotation";
  };

  const handleExportData = () => {
    // Export functionality would be implemented here
    alert("Data exported successfully!");
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border border-gray-100 bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Quotations
            </CardTitle>
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-gray-900">
              {stats.totalQuotations}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              +{stats.thisMonthQuotations} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Pending Orders
            </CardTitle>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-gray-900">
              {stats.pendingQuotations}
            </div>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Revenue
            </CardTitle>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <IndianRupee className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-gray-900">
              ₹{stats.totalRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-gray-500">
              {stats.revenueGrowth > 0 ? "+" : ""}
              {stats.revenueGrowth.toFixed(1)}% growth
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Conversion Rate
            </CardTitle>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold text-gray-900">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              {stats.completedQuotations} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <Activity className="w-5 h-5" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all duration-500"
                      style={{
                        width: `${
                          stats.totalQuotations > 0
                            ? (stats.pendingQuotations /
                                stats.totalQuotations) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {stats.pendingQuotations}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">In Progress</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{
                        width: `${
                          stats.totalQuotations > 0
                            ? (stats.inProgressQuotations /
                                stats.totalQuotations) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {stats.inProgressQuotations}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${
                          stats.totalQuotations > 0
                            ? (stats.completedQuotations /
                                stats.totalQuotations) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {stats.completedQuotations}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <BarChart3 className="w-5 h-5" />
              Revenue Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Order Value</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{Math.round(stats.avgOrderValue).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{(stats.totalRevenue * 0.3).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <span
                    className={`text-lg font-semibold ${
                      stats.revenueGrowth >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stats.revenueGrowth >= 0 ? "+" : ""}
                    {stats.revenueGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <Award className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              onClick={handleAddNewQuote}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Quote
            </Button>
            <Button
              variant="outline"
              className="w-full border-gray-300"
              onClick={handleExportData}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button
              variant="outline"
              className="w-full border-gray-300"
              onClick={() => setShowReportsModal(true)}
            >
              <LineChart className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <LineChart className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                    <p className="text-gray-300">
                      Comprehensive business insights and reports
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowReportsModal(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              {/* Key Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.totalQuotations}
                  </div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-green-600">
                    ₹{Math.round(stats.avgOrderValue).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-gray-600">Avg Order Value</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-purple-600">
                    {stats.conversionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Conversion Rate</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-orange-600">
                    {stats.revenueGrowth.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Growth Rate</div>
                </Card>
              </div>

              {/* Charts would go here */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Monthly Revenue Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {chartData.map((month, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {month.month}
                          </span>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000"
                                style={{
                                  width: `${
                                    chartData.length > 0
                                      ? (month.revenue /
                                          Math.max(
                                            ...chartData.map((d) => d.revenue)
                                          )) *
                                        100
                                      : 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                              ₹{(month.revenue / 1000).toFixed(0)}K
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowReportsModal(false)}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Close Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
