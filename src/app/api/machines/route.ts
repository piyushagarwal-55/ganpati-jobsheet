import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export const dynamic = "force-dynamic";

// GET all machines
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: machines, error } = await supabase
      .from("machines")
      .select("*")
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
      data: machines || [],
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

// POST - Create new machine
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      name,
      type,
      description,
      color_capacity,
      max_sheet_size,
      status = "active",
      operator_name,
    } = body;

    // Validate required fields
    if (!name || !type || !color_capacity) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, type, and color capacity are required",
        },
        { status: 400 }
      );
    }

    // Check if machine name already exists
    const { data: existingMachine } = await supabase
      .from("machines")
      .select("id")
      .eq("name", name)
      .single();

    if (existingMachine) {
      return NextResponse.json(
        {
          success: false,
          error: "Machine name already exists",
        },
        { status: 400 }
      );
    }

    const { data: machine, error } = await supabase
      .from("machines")
      .insert({
        name,
        type,
        description,
        color_capacity,
        max_sheet_size,
        status,
        operator_name,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating machine:", error);
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
      data: machine,
      message: "Machine created successfully",
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

// PUT - Update machine
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Machine ID is required",
        },
        { status: 400 }
      );
    }

    // Check if machine exists
    const { data: existingMachine } = await supabase
      .from("machines")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingMachine) {
      return NextResponse.json(
        {
          success: false,
          error: "Machine not found",
        },
        { status: 404 }
      );
    }

    // If name is being updated, check for duplicates
    if (updateData.name) {
      const { data: duplicateMachine } = await supabase
        .from("machines")
        .select("id")
        .eq("name", updateData.name)
        .neq("id", id)
        .single();

      if (duplicateMachine) {
        return NextResponse.json(
          {
            success: false,
            error: "Machine name already exists",
          },
          { status: 400 }
        );
      }
    }

    const { data: machine, error } = await supabase
      .from("machines")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine:", error);
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
      data: machine,
      message: "Machine updated successfully",
    });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE machine
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Machine ID is required",
        },
        { status: 400 }
      );
    }

    // Check if machine has assigned jobs
    const { data: assignedJobs } = await supabase
      .from("job_sheets")
      .select("id")
      .eq("machine_id", id)
      .in("job_status", ["assigned", "in_progress"])
      .limit(1);

    if (assignedJobs && assignedJobs.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete machine with active job assignments",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("machines").delete().eq("id", id);

    if (error) {
      console.error("Error deleting machine:", error);
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
      message: "Machine deleted successfully",
    });
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
