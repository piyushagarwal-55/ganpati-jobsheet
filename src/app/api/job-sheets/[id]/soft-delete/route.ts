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

    const jobSheetId = parseInt(params.id);

    if (isNaN(jobSheetId)) {
      return NextResponse.json(
        { success: false, error: "Invalid job sheet ID" },
        { status: 400 }
      );
    }

    // Check if job sheet exists
    console.log("Checking for job sheet with ID:", jobSheetId);
    const { data: existingSheet, error: fetchError } = await supabase
      .from("job_sheets")
      .select("id, is_deleted")
      .eq("id", jobSheetId)
      .single();

    console.log("Fetch result:", { existingSheet, fetchError });

    if (fetchError || !existingSheet) {
      console.log("Job sheet not found or error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet not found",
          debug: { fetchError, jobSheetId },
        },
        { status: 404 }
      );
    }

    if (existingSheet.is_deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet is already marked as deleted",
        },
        { status: 400 }
      );
    }

    // Soft delete the job sheet
    const { data, error } = await supabase
      .from("job_sheets")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deletion_reason: deletion_reason.trim(),
        deleted_by: deleted_by || "Admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobSheetId)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to mark job sheet as deleted",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Job sheet marked as deleted successfully",
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
