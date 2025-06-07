import { NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("parties")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("Supabase get error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Party name is required" }, { status: 400 });
    }

    const updateData: any = {
      name: body.name.trim(),
    };

    // Only update balance if it's provided
    if (body.balance !== undefined) {
      updateData.balance = parseFloat(body.balance) || 0;
    }

    const { data, error } = await supabase
      .from("parties")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // First check if the party exists
    const { data: existingParty, error: fetchError } = await supabase
      .from("parties")
      .select("id")
      .eq("id", params.id)
      .single();

    if (fetchError || !existingParty) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("parties")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Party deleted successfully" });
  } catch (error) {
    console.error("API DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}