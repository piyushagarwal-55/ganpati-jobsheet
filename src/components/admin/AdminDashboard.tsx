"use client";

import { useState, useEffect } from "react";
import { useQuotations } from "@/hooks/useQuotations";
import {
  DashboardStats as DashboardStatsType,
  ChartData,
  Notification,
  QuotationRequest,
} from "@/types/database";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import DashboardNavbar from "./DashboardNavbar";
import DashboardStats from "./DashboardStats";
import QuotationsTable from "./QuotationsTable";
import QuotationDetailModal from "./QuotationDetailModal";

export default function EnhancedAdminDashboard() {
  const {
    quotations,
    notes,
    loading,
    error,
    updateQuotationStatus,
    updateQuotationPrice,
    addNote,
    generateInvoice,
    deleteQuotation,
  } = useQuotations();

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
        title: "New Quotation Request",
        message: "A new quotation request has been submitted",
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
    totalQuotations: 0,
    pendingQuotations: 0,
    completedQuotations: 0,
    inProgressQuotations: 0,
    cancelledQuotations: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    thisMonthQuotations: 0,
    lastMonthQuotations: 0,
    revenueGrowth: 0,
    conversionRate: 0,
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate dashboard statistics from real data
  useEffect(() => {
    if (quotations.length > 0) {
      calculateStats(quotations);
      generateChartData();
    }
  }, [quotations]);

  const calculateStats = (data: QuotationRequest[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const totalQuotations = data.length;
    const pendingQuotations = data.filter((q) => q.status === "pending").length;
    const completedQuotations = data.filter(
      (q) => q.status === "completed"
    ).length;
    const inProgressQuotations = data.filter(
      (q) => q.status === "in-progress"
    ).length;
    const cancelledQuotations = data.filter(
      (q) => q.status === "cancelled"
    ).length;

    const totalRevenue = data
      .filter((q) => q.final_price && q.status === "completed")
      .reduce((sum, q) => sum + (q.final_price || 0), 0);

    const avgOrderValue =
      completedQuotations > 0 ? totalRevenue / completedQuotations : 0;

    const thisMonthQuotations = data.filter(
      (q) => q.created_at && new Date(q.created_at) >= thisMonth
    ).length;

    const lastMonthQuotations = data.filter(
      (q) =>
        q.created_at &&
        new Date(q.created_at) >= lastMonth &&
        new Date(q.created_at) <= endOfLastMonth
    ).length;

    const revenueGrowth =
      lastMonthQuotations > 0
        ? ((thisMonthQuotations - lastMonthQuotations) / lastMonthQuotations) *
          100
        : 0;

    const conversionRate =
      totalQuotations > 0 ? (completedQuotations / totalQuotations) * 100 : 0;

    setStats({
      totalQuotations,
      pendingQuotations,
      completedQuotations,
      inProgressQuotations,
      cancelledQuotations,
      totalRevenue,
      avgOrderValue,
      thisMonthQuotations,
      lastMonthQuotations,
      revenueGrowth,
      conversionRate,
    });
  };

  const generateChartData = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthQuotations = quotations.filter((q) => {
        if (!q.created_at) return false;
        const createdDate = new Date(q.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });

      const monthRevenue = monthQuotations
        .filter((q) => q.final_price && q.status === "completed")
        .reduce((sum, q) => sum + (q.final_price || 0), 0);

      months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        quotations: monthQuotations.length,
        revenue: monthRevenue,
      });
    }
    setChartData(months);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("admin-notifications", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading Dashboard
          </h2>
          <p className="text-gray-500">
            Please wait while we fetch your data from the database...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Database Connection Error
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
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

      <div className="container mx-auto px-4 py-8">
        <DashboardStats stats={stats} chartData={chartData} />

        <QuotationsTable
          quotations={quotations}
          notes={notes}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchTerm={searchTerm}
          updateQuotationStatus={updateQuotationStatus}
          updateQuotationPrice={updateQuotationPrice}
          addNote={addNote}
          generateInvoice={generateInvoice}
          deleteQuotation={deleteQuotation}
          setSelectedQuotation={setSelectedQuotation}
        />

        {selectedQuotation && (
          <QuotationDetailModal
            quotation={selectedQuotation}
            notes={notes}
            onClose={() => setSelectedQuotation(null)}
            updateQuotationPrice={updateQuotationPrice}
            addNote={addNote}
            generateInvoice={generateInvoice}
          />
        )}
      </div>
    </div>
  );
}
