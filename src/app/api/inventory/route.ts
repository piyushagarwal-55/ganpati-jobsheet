import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all inventory items with party and paper type information
    const { data: inventoryItems, error } = await supabase
      .from("inventory_items")
      .select(
        `
        *,
        parties (
          id,
          name,
          phone,
          email
        ),
        paper_types (
          id,
          name,
          gsm
        )
      `
      )
      .order("created_at", { ascending: false });

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
      data: inventoryItems || [],
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      party_id,
      paper_type_id,
      transaction_type = "in",
      quantity,
      unit_type,
      unit_size,
      unit_cost = 0,
      description = "",
    } = body;

    // Calculate total sheets
    const total_sheets =
      transaction_type === "out"
        ? -Math.abs(quantity * unit_size)
        : Math.abs(quantity * unit_size);
    const total_cost = Math.abs(total_sheets) * unit_cost;

    // Get paper type name
    const { data: paperType } = await supabase
      .from("paper_types")
      .select("name")
      .eq("id", paper_type_id)
      .single();

    // Check if inventory item exists, if not create it
    let { data: inventoryItem } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("party_id", party_id)
      .eq("paper_type_id", paper_type_id)
      .single();

    if (!inventoryItem) {
      // Create new inventory item
      const { data: newItem, error: createError } = await supabase
        .from("inventory_items")
        .insert({
          party_id,
          paper_type_id,
          paper_type_name: paperType?.name || "Unknown",
          current_quantity: 0,
          unit_cost,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating inventory item:", createError);
        return NextResponse.json(
          {
            success: false,
            error: createError.message,
          },
          { status: 500 }
        );
      }

      inventoryItem = newItem;
    }

    // Get current balance
    const { data: currentItem } = await supabase
      .from("inventory_items")
      .select("current_quantity")
      .eq("id", inventoryItem.id)
      .single();

    const balance_after = (currentItem?.current_quantity || 0) + total_sheets;

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("inventory_transactions")
      .insert({
        inventory_item_id: inventoryItem.id,
        party_id,
        paper_type_id,
        transaction_type,
        quantity: Math.abs(quantity),
        unit_type,
        unit_size,
        total_sheets,
        unit_cost,
        total_cost,
        description,
        balance_after,
        created_by: "Admin", // TODO: Get from auth context
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error creating transaction:", transactionError);
      return NextResponse.json(
        {
          success: false,
          error: transactionError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
