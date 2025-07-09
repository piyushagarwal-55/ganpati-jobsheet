import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../../supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { deletion_reason, deleted_by } = await request.json();

    if (!deletion_reason || !deletion_reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Deletion reason is required" },
        { status: 400 }
      );
    }

    const transactionId = parseInt(params.id);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    // Check if transaction exists
    console.log("Checking for inventory transaction with ID:", transactionId);
    const { data: existingTransaction, error: fetchError } = await supabase
      .from("inventory_transactions")
      .select("id, is_deleted, inventory_item_id")
      .eq("id", transactionId)
      .single();

    console.log("Fetch result:", { existingTransaction, fetchError });

    if (fetchError || !existingTransaction) {
      console.log("Inventory transaction not found or error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Inventory transaction not found",
          debug: { fetchError, transactionId },
        },
        { status: 404 }
      );
    }

    if (existingTransaction.is_deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Inventory transaction is already marked as deleted",
        },
        { status: 400 }
      );
    }

    // Soft delete the transaction
    const { data, error } = await supabase
      .from("inventory_transactions")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deletion_reason: deletion_reason.trim(),
        deleted_by: deleted_by || "Admin",
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to mark inventory transaction as deleted",
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
      message: "Inventory transaction marked as deleted successfully",
      data,
    });
  } catch (error) {
    console.error("Soft delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
