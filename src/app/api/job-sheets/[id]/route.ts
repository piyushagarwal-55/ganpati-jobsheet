import { createClient } from "../../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = parseInt(params.id);

    const { data, error } = await supabase
      .from("job_sheets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const id = parseInt(params.id);

    const { data, error } = await supabase
      .from("job_sheets")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = parseInt(params.id);

    // First delete related notes if they exist
    await supabase
      .from("job_sheet_notes")
      .delete()
      .eq("job_sheet_id", id);

    // Delete the job sheet
    const { error } = await supabase
      .from("job_sheets")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Job sheet deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}