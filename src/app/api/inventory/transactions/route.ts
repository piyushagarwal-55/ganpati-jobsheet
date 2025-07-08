import { NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all inventory transactions with related data
    const { data: transactions, error } = await supabase
      .from("inventory_transactions")
      .select(
        `
        *,
        inventory_items (
          id,
          paper_type_name,
          current_quantity,
          available_quantity
        ),
        parties (
          id,
          name
        ),
        paper_types (
          id,
          name,
          gsm
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transactions || [],
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
