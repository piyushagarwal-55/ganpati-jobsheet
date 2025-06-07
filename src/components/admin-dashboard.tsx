"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import custom hooks and types
import { useQuotations } from "@/hooks/useQuotations";
import {
  QuotationRequest,
  QuotationNote,
  DashboardStats as DashboardStatsType,
  ChartData,
  Notification,
} from "@/types/database";

// Import modular components
import DashboardNavbar from "./admin/DashboardNavbar";
import DashboardStatsComponent from "./admin/DashboardStats";
import QuotationsTable from "./admin/QuotationsTable";
import QuotationDetailModal from "./admin/QuotationDetailModal";

export default function EnhancedAdminDashboard() {
  // Use custom hook for database operations
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

  // State for notifications (mock data - replace with real API)
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

  // Dashboard statistics state
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

  // Chart data for analytics
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // UI state
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate dashboard statistics from real data
  useEffect(() => {
    if (quotations.length > 0) {
      calculateStats(quotations);
      generateChartData();
    }
  }, [quotations]);

  // Function to calculate statistics
  const calculateStats = (data: QuotationRequest[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const totalQuotations = data.length;
    const pendingQuotations = data.filter((q) => q.status === "pending").length;
    const completedQuotations = data.filter((q) => q.status === "completed").length;
    const inProgressQuotations = data.filter((q) => q.status === "in-progress").length;
    const cancelledQuotations = data.filter((q) => q.status === "cancelled").length;

    const totalRevenue = data
      .filter((q) => q.final_price && q.status === "completed")
      .reduce((sum, q) => sum + (q.final_price || 0), 0);

    const avgOrderValue = completedQuotations > 0 ? totalRevenue / completedQuotations : 0;

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
        ? ((thisMonthQuotations - lastMonthQuotations) / lastMonthQuotations) * 100
        : 0;

    const conversionRate = totalQuotations > 0 ? (completedQuotations / totalQuotations) * 100 : 0;

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

  // Function to generate chart data
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

  // Function to mark notification as read
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
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Dashboard</h2>
          <p className="text-gray-500">Please wait while we fetch your data from the database...</p>
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
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Database Connection Error</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <DashboardNavbar
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Statistics */}
        <DashboardStatsComponent stats={stats} chartData={chartData} />

        {/* Quotations Table */}
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

        {/* Quotation Detail Modal */}
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