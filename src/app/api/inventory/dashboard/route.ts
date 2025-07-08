import { NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get inventory stats
    const { data: inventoryItems } = await supabase.from("inventory_items")
      .select(`
        *,
        parties (name),
        paper_types (name)
      `);

    const { data: transactions } = await supabase
      .from("inventory_transactions")
      .select(
        `
        *,
        parties (name),
        paper_types (name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate stats
    const totalItems = inventoryItems?.length || 0;
    const totalQuantity =
      inventoryItems?.reduce(
        (sum, item) => sum + (item.current_quantity || 0),
        0
      ) || 0;
    const lowStockItems =
      inventoryItems?.filter((item) => (item.current_quantity || 0) < 1000)
        .length || 0;

    // Get unique parties and paper types count
    const uniqueParties = new Set(inventoryItems?.map((item) => item.party_id))
      .size;
    const uniquePaperTypes = new Set(
      inventoryItems?.map((item) => item.paper_type_id)
    ).size;

    // Get low stock items (less than 1000 sheets)
    const lowStockItemsList =
      inventoryItems?.filter((item) => (item.current_quantity || 0) < 1000) ||
      [];

    // Get top parties by total quantity
    const partiesMap = new Map();
    inventoryItems?.forEach((item) => {
      const partyId = item.party_id;
      const partyName = item.parties?.name || `Party ${partyId}`;

      if (partiesMap.has(partyId)) {
        const existing = partiesMap.get(partyId);
        existing.total_quantity += item.current_quantity || 0;
      } else {
        partiesMap.set(partyId, {
          party_id: partyId,
          party_name: partyName,
          total_quantity: item.current_quantity || 0,
        });
      }
    });

    const topParties = Array.from(partiesMap.values())
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);

    const dashboardData = {
      stats: {
        totalItems,
        totalQuantity,
        lowStockItems,
        parties: uniqueParties,
        paperTypes: uniquePaperTypes,
      },
      recentTransactions: transactions || [],
      lowStockItems: lowStockItemsList,
      topParties,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
