import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Try to get notes, but don't fail if table doesn't exist
    try {
      const { data, error } = await supabase
        .from("job_sheet_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          return NextResponse.json({
            success: true,
            data: [],
            message: "Notes table not found - returning empty data"
          });
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: data || [],
      });
    } catch (tableError: any) {
      // Table doesn't exist, return empty array
      return NextResponse.json({
        success: true,
        data: [],
        message: "Notes table not found - returning empty data"
      });
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Add timestamp and ID
    const noteData = {
      ...body,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      created_by: body.created_by || body.author || "Admin"
    };
    
    try {
      const { data, error } = await supabase
        .from("job_sheet_notes")
        .insert([noteData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (insertError: any) {
      // If table doesn't exist, create a response indicating this
      if (insertError.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: "Notes table does not exist. Please create the job_sheet_notes table first.",
          code: "TABLE_NOT_FOUND"
        }, { status: 404 });
      }
      throw insertError;
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}