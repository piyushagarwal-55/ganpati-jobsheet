import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  
  // Get current party balance
  const { data: party } = await supabase
    .from("parties")
    .select("balance")
    .eq("id", body.party_id)
    .single();

  const currentBalance = party?.balance || 0;
  const newBalance = currentBalance + body.amount;

  // Update party balance
  await supabase
    .from("parties")
    .update({ balance: newBalance })
    .eq("id", body.party_id);

  // Create transaction record
  const { data, error } = await supabase
    .from("party_transactions")
    .insert({
      ...body,
      balance_before: currentBalance,
      balance_after: newBalance,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}