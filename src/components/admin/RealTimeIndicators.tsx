"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  DollarSign,
  Package,
  BarChart3,
} from "lucide-react";

interface RealTimeIndicatorsProps {
  stats: any;
}

export default function RealTimeIndicators({ stats }: RealTimeIndicatorsProps) {
  const [pulseClass, setPulseClass] = useState("");
  const [animationClass, setAnimationClass] = useState("");

  // Pulse animation when data updates
  useEffect(() => {
    setPulseClass("animate-pulse");
    setAnimationClass("scale-105");
    const timer = setTimeout(() => {
      setPulseClass("");
      setAnimationClass("");
    }, 1000);
    return () => clearTimeout(timer);
  }, [stats]);

  const indicators = [
    {
      title: "System Health",
      value: stats.healthMetrics?.activeParties > 0 ? "Excellent" : "Good",
      percentage: Math.min(100, (stats.totalJobSheets / 10) * 100),
      icon: Activity,
      color: "green",
      trend: stats.revenueGrowth >= 0 ? "up" : "down",
      description: `${stats.totalJobSheets} active jobs`,
    },
    {
      title: "Revenue Velocity",
      value: `₹${(stats.totalRevenue / 1000).toFixed(1)}K`,
      percentage: Math.min(100, (stats.avgOrderValue / 10000) * 100),
      icon: TrendingUp,
      color: "blue",
      trend: stats.revenueGrowth >= 0 ? "up" : "down",
      description: `${stats.revenueGrowth.toFixed(1)}% growth`,
    },
    {
      title: "Production Rate",
      value: `${stats.totalPaperSheets}`,
      percentage: Math.min(100, (stats.productionEfficiency / 5) * 100),
      icon: Package,
      color: "purple",
      trend: stats.productionEfficiency > 1 ? "up" : "down",
      description: `${stats.productionEfficiency}x efficiency`,
    },
    {
      title: "Client Activity",
      value: `${stats.totalParties}`,
      percentage: Math.min(100, (stats.totalParties / 20) * 100),
      icon: Users,
      color: "orange",
      trend: stats.totalParties > 0 ? "up" : "down",
      description: `${stats.healthMetrics?.activeParties || 0} active`,
    },
  ];

  const getColorClasses = (color: string, isBackground = false) => {
    const colorMap = {
      green: isBackground ? "bg-green-50" : "text-green-600",
      blue: isBackground ? "bg-blue-50" : "text-blue-600",
      purple: isBackground ? "bg-purple-50" : "text-purple-600",
      orange: isBackground ? "bg-orange-50" : "text-orange-600",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getProgressColor = (color: string) => {
    const colorMap = {
      green: "bg-green-500",
      blue: "bg-blue-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="space-y-4">
      {/* Real-time Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className={`w-5 h-5 text-yellow-500 ${pulseClass}`} />
          Live Performance
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Real-time
        </div>
      </div>

      {/* Performance Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {indicators.map((indicator, index) => {
          const IconComponent = indicator.icon;
          const TrendIcon =
            indicator.trend === "up" ? TrendingUp : TrendingDown;

          return (
            <Card
              key={indicator.title}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${animationClass} ${getColorClasses(indicator.color, true)}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${getColorClasses(indicator.color, true)}`}
                  >
                    <IconComponent
                      className={`w-4 h-4 ${getColorClasses(indicator.color)}`}
                    />
                  </div>
                  <TrendIcon
                    className={`w-4 h-4 ${
                      indicator.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                </div>
                <CardTitle className="text-sm font-medium text-gray-600">
                  {indicator.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div
                    className={`text-xl font-bold ${getColorClasses(indicator.color)}`}
                  >
                    {indicator.value}
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor(indicator.color)}`}
                        style={{ width: `${indicator.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {indicator.description}
                    </div>
                  </div>
                </div>

                {/* Animated background effect */}
                <div
                  className={`absolute -top-4 -right-4 w-16 h-16 ${getColorClasses(indicator.color, true)} rounded-full opacity-20 animate-bounce`}
                ></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Status */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900">System Status</span>
              </div>
              <div className="text-sm text-gray-600">
                All systems operational
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Avg Processing:{" "}
                  {stats.healthMetrics?.averageProcessingTime || 24}h
                </span>
              </div>

              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Weekly Activity: {stats.recentActivity?.weeklyJobSheets || 0}{" "}
                  jobs
                </span>
              </div>
            </div>
          </div>

          {/* Mini Activity Chart */}
          <div className="mt-4 flex items-end gap-1 h-8">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="bg-blue-200 rounded-t transition-all duration-500 hover:bg-blue-400"
                style={{
                  width: "14px",
                  height: `${Math.random() * 100 + 20}%`,
                  animationDelay: `${i * 100}ms`,
                }}
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
