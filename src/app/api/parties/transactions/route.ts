// src/app/api/parties/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

// GET - Fetch transactions (optionally filtered by party_id)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get("party_id");

    // Simplified query for better performance
    let query = supabase
      .from("party_transactions")
      .select(
        `
        id, party_id, type, amount, description, balance_after, created_at,
        party:parties(name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(200); // Limit for performance

    if (partyId) {
      query = query.eq("party_id", partyId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform transactions to include party_name
    const transformedTransactions = (transactions || []).map((transaction) => ({
      ...transaction,
      party_name: transaction.party?.name || "Unknown Party",
    }));

    const response = NextResponse.json(transformedTransactions);

    // Add caching headers for better performance
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=120"
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { party_id, type, amount, description } = body;

    // Validate required fields
    if (!party_id || !type || !amount) {
      return NextResponse.json(
        { error: "Party ID, type, and amount are required" },
        { status: 400 }
      );
    }

    if (!["payment", "order", "adjustment"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Get current party balance
    const { data: party, error: partyError } = await supabase
      .from("parties")
      .select("balance, name")
      .eq("id", party_id)
      .single();

    if (partyError || !party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Calculate new balance based on transaction type
    let balanceChange = 0;
    switch (type) {
      case "payment":
        balanceChange = transactionAmount; // Payment increases balance
        break;
      case "order":
        balanceChange = -transactionAmount; // Order decreases balance
        break;
      case "adjustment":
        balanceChange = transactionAmount; // Adjustment can be positive or negative
        break;
    }

    const newBalance = parseFloat(party.balance) + balanceChange;

    // Create transaction record
    const transactionData = {
      party_id: parseInt(party_id),
      type,
      amount: Math.abs(transactionAmount),
      description:
        description ||
        `${type.charAt(0).toUpperCase() + type.slice(1)} - ₹${Math.abs(transactionAmount)}`,
      balance_after: newBalance,
    };

    const { data: transaction, error } = await supabase
      .from("party_transactions")
      .insert([transactionData])
      .select(
        `
        *,
        party:parties(name)
      `
      )
      .single();

    if (error) {
      console.error("Error creating transaction:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update party balance
    const { error: updateError } = await supabase
      .from("parties")
      .update({ balance: newBalance })
      .eq("id", party_id);

    if (updateError) {
      console.error("Error updating party balance:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Transform response to include party_name
    const responseData = {
      ...transaction,
      party_name: transaction.party?.name || party.name,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: any) {
    console.error("Exception in POST /api/parties/transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Get transaction details before deleting
    const { data: transaction, error: fetchError } = await supabase
      .from("party_transactions")
      .select("party_id")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("party_transactions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting transaction:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Exception in DELETE /api/parties/transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
