import { NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Use optimized database function for lightning-fast results
    const { data: stats, error: statsError } = await supabase.rpc(
      "get_dashboard_stats"
    );

    if (statsError) {
      // Fallback to individual queries if function doesn't exist
      const [partiesResult, jobSheetsResult, transactionsResult] =
        await Promise.all([
          supabase.from("parties").select("id, balance").limit(100),
          supabase
            .from("job_sheets")
            .select("id, printing, uv, baking, imp, created_at")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("party_transactions")
            .select("id, type, amount, created_at")
            .or("is_deleted.is.null,is_deleted.eq.false")
            .limit(200),
        ]);

      // Quick calculations
      const parties = partiesResult.data || [];
      const jobSheets = jobSheetsResult.data || [];
      const transactions = transactionsResult.data || [];

      const totalBalance = parties.reduce(
        (sum, p) => sum + (p.balance || 0),
        0
      );
      const totalRevenue = jobSheets.reduce(
        (sum, j) => sum + (j.printing || 0) + (j.uv || 0) + (j.baking || 0),
        0
      );

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyJobs = jobSheets.filter((j) => {
        if (!j.created_at) return false;
        const jobDate = new Date(j.created_at);
        return (
          jobDate.getMonth() === currentMonth &&
          jobDate.getFullYear() === currentYear
        );
      });

      const monthlyRevenue = monthlyJobs.reduce(
        (sum, j) => sum + (j.printing || 0) + (j.uv || 0) + (j.baking || 0),
        0
      );

      const fallbackStats = {
        totalJobSheets: jobSheets.length,
        totalParties: parties.length,
        totalBalance,
        totalRevenue,
        monthlyRevenue,
        activeTransactions: transactions.length,
        totalImpressions: jobSheets.reduce((sum, j) => sum + (j.imp || 0), 0),
      };

      const response = NextResponse.json(fallbackStats);
      response.headers.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300"
      );
      return response;
    }

    // Return optimized database function results
    const response = NextResponse.json(stats);
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
