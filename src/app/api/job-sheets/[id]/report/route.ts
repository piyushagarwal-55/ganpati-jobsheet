import { createClient } from "../../../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = parseInt(params.id);

    // Get job sheet data
    const { data: jobSheet, error: jobSheetError } = await supabase
      .from("job_sheets")
      .select("*")
      .eq("id", id)
      .single();

    if (jobSheetError || !jobSheet) {
      return NextResponse.json({
        success: false,
        error: "Job sheet not found",
      }, { status: 404 });
    }

    // Get related notes if they exist
    let notes = [];
    try {
      const { data: notesData, error: notesError } = await supabase
        .from("job_sheet_notes")
        .select("*")
        .eq("job_sheet_id", id)
        .order("created_at", { ascending: false });

      if (!notesError) {
        notes = notesData || [];
      }
    } catch {
      // Notes table doesn't exist, continue without notes
    }

    // Generate report number
    const timestamp = Date.now().toString().slice(-6);
    const reportNumber = `GO-JS-${id}-${timestamp}`;

    // Calculate totals
    const totalCost = (jobSheet.printing || 0) + (jobSheet.uv || 0) + (jobSheet.baking || 0);

    // For now, return the data (later you can generate a PDF)
    return NextResponse.json({
      success: true,
      reportNumber,
      jobSheet: {
        ...jobSheet,
        totalCost,
      },
      notes,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}