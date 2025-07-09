import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

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
      gsm,
      transaction_type = "in",
      quantity,
      unit_type,
      unit_size,
      description = "",
    } = body;

    // Calculate total sheets
    const total_sheets =
      transaction_type === "out"
        ? -Math.abs(quantity * unit_size)
        : Math.abs(quantity * unit_size);

    // Get paper type name
    const { data: paperType } = await supabase
      .from("paper_types")
      .select("name")
      .eq("id", paper_type_id)
      .single();

    // Check if inventory item exists, if not create it (including GSM)
    let { data: inventoryItem } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("party_id", party_id)
      .eq("paper_type_id", paper_type_id)
      .eq("gsm", gsm)
      .single();

    if (!inventoryItem) {
      // Create new inventory item
      const { data: newItem, error: createError } = await supabase
        .from("inventory_items")
        .insert({
          party_id,
          paper_type_id,
          gsm,
          paper_type_name: paperType?.name || "Unknown",
          current_quantity: 0,
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
        gsm,
        transaction_type,
        quantity: Math.abs(quantity),
        unit_type,
        unit_size,
        total_sheets,
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

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const itemId = url.searchParams.get("id");
    const deleteType = url.searchParams.get("type") || "item"; // 'item' or 'transaction'

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: "Item ID is required",
        },
        { status: 400 }
      );
    }

    if (deleteType === "transaction") {
      // Use soft delete for transactions instead of hard delete
      const { data: existingTransaction, error: fetchError } = await supabase
        .from("inventory_transactions")
        .select("id, is_deleted, inventory_item_id")
        .eq("id", itemId)
        .single();

      if (fetchError || !existingTransaction) {
        return NextResponse.json(
          {
            success: false,
            error: "Transaction not found",
          },
          { status: 404 }
        );
      }

      if (existingTransaction.is_deleted) {
        return NextResponse.json(
          {
            success: false,
            error: "Transaction is already deleted",
          },
          { status: 400 }
        );
      }

      // Soft delete the transaction
      const { error: softDeleteError } = await supabase
        .from("inventory_transactions")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deletion_reason: "Deleted via inventory management",
          deleted_by: "Admin",
        })
        .eq("id", itemId);

      if (softDeleteError) {
        console.error("Error soft deleting transaction:", softDeleteError);
        return NextResponse.json(
          {
            success: false,
            error: softDeleteError.message,
          },
          { status: 500 }
        );
      }

      // Update inventory balances after soft delete
      if (existingTransaction.inventory_item_id) {
        const { error: balanceError } = await supabase.rpc(
          "update_inventory_balance",
          {
            inventory_item_id_param: existingTransaction.inventory_item_id,
          }
        );

        if (balanceError) {
          console.error("Error updating inventory balance:", balanceError);
          // Don't fail the request, transaction is already marked as deleted
        }
      }

      return NextResponse.json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } else {
      // Delete inventory item and all its transactions
      const { error: deleteError } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", itemId);

      if (deleteError) {
        console.error("Error deleting inventory item:", deleteError);
        return NextResponse.json(
          {
            success: false,
            error: deleteError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Inventory item and all related transactions deleted successfully",
      });
    }
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
