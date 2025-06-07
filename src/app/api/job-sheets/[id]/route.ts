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
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
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
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = parseInt(params.id);

    console.log(`[DELETE API] Attempting to delete job sheet ID: ${id}`);

    // First check if the job sheet exists
    const { data: existingSheet, error: checkError } = await supabase
      .from("job_sheets")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      console.log(
        `[DELETE API] Job sheet ${id} not found:`,
        checkError.message
      );
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet not found",
        },
        { status: 404 }
      );
    }

    console.log(`[DELETE API] Found job sheet ${id}, proceeding with deletion`);

    // First delete related notes if they exist
    const { error: notesError } = await supabase
      .from("job_sheet_notes")
      .delete()
      .eq("job_sheet_id", id);

    if (notesError) {
      console.log(
        `[DELETE API] Warning: Failed to delete notes for job sheet ${id}:`,
        notesError.message
      );
    } else {
      console.log(
        `[DELETE API] Successfully deleted notes for job sheet ${id}`
      );
    }

    // Delete the job sheet
    const { error: deleteError, count } = await supabase
      .from("job_sheets")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        `[DELETE API] Failed to delete job sheet ${id}:`,
        deleteError.message
      );
      return NextResponse.json(
        {
          success: false,
          error: deleteError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      `[DELETE API] Successfully deleted job sheet ${id}. Affected rows: ${count}`
    );

    // Verify deletion
    const { data: verifyData, error: verifyError } = await supabase
      .from("job_sheets")
      .select("id")
      .eq("id", id)
      .single();

    if (verifyData) {
      console.error(
        `[DELETE API] ERROR: Job sheet ${id} still exists after deletion!`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Delete operation failed - record still exists",
        },
        { status: 500 }
      );
    }

    console.log(
      `[DELETE API] Verified: Job sheet ${id} has been completely removed`
    );

    return NextResponse.json({
      success: true,
      message: "Job sheet deleted successfully",
      deletedId: id,
    });
  } catch (error: any) {
    console.error(`[DELETE API] Unexpected error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
