import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const transactionId = parseInt(params.id);

  if (isNaN(transactionId)) {
    return NextResponse.json(
      { error: "Invalid transaction ID" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Get transaction details before deletion to adjust party balance
    const { data: transaction, error: fetchError } = await supabase
      .from("party_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError || !transaction) {
      console.error("Transaction fetch error:", fetchError);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Get current party balance
    const { data: party, error: partyError } = await supabase
      .from("parties")
      .select("balance")
      .eq("id", transaction.party_id)
      .single();

    if (partyError || !party) {
      console.error("Party fetch error:", partyError);
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Calculate new balance after reversing the transaction
    let newBalance = party.balance;
    if (transaction.type === "payment") {
      newBalance = party.balance - transaction.amount; // Remove payment (decrease balance)
    } else if (transaction.type === "order") {
      newBalance = party.balance + transaction.amount; // Remove order (increase balance)
    }

    // Update party balance first
    const { error: balanceError } = await supabase
      .from("parties")
      .update({
        balance: newBalance,
      })
      .eq("id", transaction.party_id);

    if (balanceError) {
      console.error("Error updating party balance:", balanceError);
      return NextResponse.json(
        { error: "Failed to update party balance" },
        { status: 500 }
      );
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from("party_transactions")
      .delete()
      .eq("id", transactionId);

    if (deleteError) {
      console.error("Error deleting transaction:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const transactionId = parseInt(params.id);

  if (isNaN(transactionId)) {
    return NextResponse.json(
      { error: "Invalid transaction ID" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { description, soft_delete } = await request.json();

    if (soft_delete) {
      // Get transaction details first to reverse balance
      const { data: transaction, error: fetchError } = await supabase
        .from("party_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (fetchError || !transaction) {
        console.error("Transaction fetch error:", fetchError);
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 }
        );
      }

      // Get current party balance
      const { data: party, error: partyError } = await supabase
        .from("parties")
        .select("balance")
        .eq("id", transaction.party_id)
        .single();

      if (partyError || !party) {
        console.error("Party fetch error:", partyError);
        return NextResponse.json({ error: "Party not found" }, { status: 404 });
      }

      // Calculate new balance after reversing the transaction
      let newBalance = party.balance;
      if (transaction.type === "payment") {
        newBalance = party.balance - transaction.amount; // Remove payment (decrease balance)
      } else if (transaction.type === "order") {
        newBalance = party.balance + transaction.amount; // Remove order (increase balance)
      }

      // Update party balance first
      const { error: balanceError } = await supabase
        .from("parties")
        .update({
          balance: newBalance,
        })
        .eq("id", transaction.party_id);

      if (balanceError) {
        console.error("Error updating party balance:", balanceError);
        return NextResponse.json(
          { error: "Failed to update party balance" },
          { status: 500 }
        );
      }

      // Soft delete - update the description to mark as deleted
      const { error: updateError } = await supabase
        .from("party_transactions")
        .update({
          description: description,
        })
        .eq("id", transactionId);

      if (updateError) {
        console.error("Error soft deleting transaction:", updateError);
        return NextResponse.json(
          { error: "Failed to soft delete transaction" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Transaction marked as deleted and balance updated",
      });
    }

    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
