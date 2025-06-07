import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

// GET - Fetch all parties
export async function GET() {
  try {
    const supabase = await createClient();

    // Optimized query with limit for performance
    const { data: parties, error } = await supabase
      .from("parties")
      .select(
        "id, name, phone, email, address, balance, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100); // Limit for performance

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(parties || []);

    // Add caching headers for better performance
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new party
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { name, phone, email, address, balance } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Party name is required" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const partyData = {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      balance: parseFloat(balance || "0") || 0,
    };

    const { data: party, error } = await supabase
      .from("parties")
      .insert([partyData])
      .select()
      .single();

    if (error) {
      console.error("Error creating party:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If there's an initial balance, create a transaction record
    if (party.balance !== 0) {
      const transactionData = {
        party_id: party.id,
        type: party.balance > 0 ? "payment" : "order",
        amount: Math.abs(party.balance),
        description:
          party.balance > 0
            ? "Initial balance - advance payment"
            : "Initial balance - opening balance",
        balance_after: party.balance,
      };

      await supabase.from("party_transactions").insert([transactionData]);
    }

    return NextResponse.json(party, { status: 201 });
  } catch (error: any) {
    console.error("Exception in POST /api/parties:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update party
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { id, name, phone, email, address, balance } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Party ID is required" },
        { status: 400 }
      );
    }

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Party name is required" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const updateData = {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // If balance is being updated, handle it separately with a transaction
    if (balance !== undefined) {
      // Get current balance
      const { data: currentParty } = await supabase
        .from("parties")
        .select("balance")
        .eq("id", id)
        .single();

      if (currentParty && parseFloat(balance) !== currentParty.balance) {
        const balanceChange = parseFloat(balance) - currentParty.balance;

        // Create adjustment transaction
        const transactionData = {
          party_id: id,
          type: "adjustment",
          amount: Math.abs(balanceChange),
          description: `Balance adjustment: ${balanceChange > 0 ? "+" : ""}${balanceChange.toFixed(2)}`,
          balance_after: parseFloat(balance.toString()),
        };

        await supabase.from("party_transactions").insert([transactionData]);
      }
    }

    const { data: party, error } = await supabase
      .from("parties")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating party:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(party);
  } catch (error: any) {
    console.error("Exception in PUT /api/parties:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete party
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Party ID is required" },
        { status: 400 }
      );
    }

    // Check if party has associated records
    const { data: transactions } = await supabase
      .from("party_transactions")
      .select("id")
      .eq("party_id", id)
      .limit(1);

    const { data: orders } = await supabase
      .from("party_orders")
      .select("id")
      .eq("party_id", id)
      .limit(1);

    if (
      (transactions && transactions.length > 0) ||
      (orders && orders.length > 0)
    ) {
      return NextResponse.json(
        { error: "Cannot delete party with existing transactions or orders" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("parties").delete().eq("id", id);

    if (error) {
      console.error("Error deleting party:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Exception in DELETE /api/parties:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
