import { NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

// Force this route to be dynamic to avoid static generation issues with cookies
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all required data in parallel for better performance
    const [jobSheetsRes, partiesRes, transactionsRes] = await Promise.all([
      supabase
        .from("job_sheets")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("parties").select("*"),
      supabase
        .from("party_transactions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (jobSheetsRes.error) {
      console.error("Job sheets error:", jobSheetsRes.error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch job sheets" },
        { status: 500 }
      );
    }

    if (partiesRes.error) {
      console.error("Parties error:", partiesRes.error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch parties" },
        { status: 500 }
      );
    }

    // Handle transaction errors gracefully (table might not exist)
    const jobSheets = jobSheetsRes.data || [];
    const parties = partiesRes.data || [];
    const transactions = transactionsRes.error
      ? []
      : transactionsRes.data || [];

    // Filter active job sheets (exclude soft deleted if column exists)
    const activeJobSheets = jobSheets.filter((sheet) => !sheet.is_deleted);

    // Calculate revenue metrics
    const totalRevenue = activeJobSheets.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    const transactionRevenue = transactions
      .filter(
        (t) => t.type === "payment" && !t.description?.includes("[DELETED]")
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const combinedRevenue = totalRevenue + transactionRevenue;

    // Calculate time-based metrics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthSheets = activeJobSheets.filter(
      (sheet) => new Date(sheet.job_date || sheet.created_at) >= thisMonth
    );
    const lastMonthSheets = activeJobSheets.filter((sheet) => {
      const date = new Date(sheet.job_date || sheet.created_at);
      return date >= lastMonth && date <= lastMonthEnd;
    });

    const thisMonthRevenue = thisMonthSheets.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    const lastMonthRevenue = lastMonthSheets.reduce((sum, sheet) => {
      return (
        sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
      );
    }, 0);

    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Generate chart data for last 12 months
    const chartData = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthSheets = activeJobSheets.filter((sheet) => {
        const sheetDate = new Date(sheet.job_date || sheet.created_at);
        return sheetDate >= monthStart && sheetDate <= monthEnd;
      });

      const monthRevenue = monthSheets.reduce((sum, sheet) => {
        return (
          sum + ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
        );
      }, 0);

      chartData.push({
        month: month.toLocaleDateString("en-US", { month: "short" }),
        jobSheets: monthSheets.length,
        revenue: monthRevenue,
        efficiency:
          monthSheets.length > 0
            ? Math.round(monthRevenue / monthSheets.length)
            : 0,
      });
    }

    // Calculate performance metrics
    const avgOrderValue =
      activeJobSheets.length > 0 ? combinedRevenue / activeJobSheets.length : 0;

    // Calculate production efficiency
    const totalPaperSheets = activeJobSheets.reduce(
      (sum, sheet) => sum + (sheet.paper_sheet || 0),
      0
    );
    const totalImpressions = activeJobSheets.reduce(
      (sum, sheet) => sum + (sheet.imp || 0),
      0
    );

    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentSheets = activeJobSheets.filter(
      (sheet) => new Date(sheet.created_at) >= weekAgo
    );

    // Recent transactions (last 7 days)
    const recentTransactions = transactions.filter(
      (t) =>
        new Date(t.created_at) >= weekAgo &&
        !t.description?.includes("[DELETED]")
    );

    // Top performing parties (by revenue)
    const partyRevenue = new Map();
    activeJobSheets.forEach((sheet) => {
      const revenue =
        (sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0);
      const partyName = sheet.party_name || "Unknown";
      partyRevenue.set(partyName, (partyRevenue.get(partyName) || 0) + revenue);
    });

    const topParties = Array.from(partyRevenue.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    // Real-time stats object
    const realtimeStats = {
      // Core metrics
      totalJobSheets: activeJobSheets.length,
      totalParties: parties.length,
      totalRevenue: combinedRevenue,
      avgOrderValue,

      // Time-based metrics
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth,

      // Production metrics
      totalOrders: activeJobSheets.length,
      totalPaperSheets,
      totalImpressions,

      // Efficiency metrics
      productionEfficiency:
        totalPaperSheets > 0
          ? Math.round(totalImpressions / totalPaperSheets)
          : 0,
      averageJobValue: avgOrderValue,

      // Recent activity
      recentActivity: {
        weeklyJobSheets: recentSheets.length,
        weeklyRevenue: recentSheets.reduce((sum, sheet) => {
          return (
            sum +
            ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
          );
        }, 0),
        recentTransactions: recentTransactions.slice(0, 5).map((t) => ({
          id: t.id,
          party_name: t.party_name || "Unknown",
          type: t.type,
          amount: t.amount,
          created_at: t.created_at,
          description: t.description,
        })),
      },

      // Top performers
      topParties,

      // Health indicators
      healthMetrics: {
        activeParties: parties.filter((p) => p.balance !== 0).length,
        pendingTransactions: transactions.filter(
          (t) => !t.description?.includes("[DELETED]")
        ).length,
        averageProcessingTime: 24, // hours (could be calculated from data)
      },
    };

    // Additional chart data for various visualizations
    const additionalCharts = {
      // Monthly trend with more detail
      monthlyTrend: chartData,

      // Party performance pie chart
      partyDistribution: topParties.map((party, index) => ({
        name: party.name,
        value: party.revenue,
        color: `hsl(${index * 72}, 70%, 50%)`, // Generates nice colors
      })),

      // Production volume by type
      productionTypes: activeJobSheets.reduce((acc, sheet) => {
        const type = sheet.job_type || "Standard";
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      }, {}),

      // Daily activity (last 30 days)
      dailyActivity: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const daySheets = activeJobSheets.filter((sheet) => {
          const sheetDate = new Date(sheet.created_at);
          return sheetDate.toDateString() === date.toDateString();
        });

        return {
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          count: daySheets.length,
          revenue: daySheets.reduce((sum, sheet) => {
            return (
              sum +
              ((sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0))
            );
          }, 0),
        };
      }),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        stats: realtimeStats,
        charts: additionalCharts,
        summary: {
          totalRecords: {
            jobSheets: jobSheets.length,
            activeJobSheets: activeJobSheets.length,
            parties: parties.length,
            transactions: transactions.length,
          },
          performance: {
            averageOrderValue: avgOrderValue,
            monthlyGrowth: revenueGrowth,
            productionEfficiency: realtimeStats.productionEfficiency,
          },
        },
      },
    });
  } catch (error) {
    console.error("Realtime dashboard API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
