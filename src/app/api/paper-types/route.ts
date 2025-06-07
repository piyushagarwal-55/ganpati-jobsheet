import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Try to get paper types, but return empty array if table doesn't exist
    try {
      const { data, error } = await supabase
        .from("paper_types")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          return NextResponse.json({
            success: true,
            data: [],
            message: "Paper types table not found - returning empty data"
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
        message: "Paper types table not found - returning empty data"
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
    
    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({
        success: false,
        error: "Paper type name is required"
      }, { status: 400 });
    }
    
    const paperTypeData = {
      name: body.name.trim(),
      gsm: body.gsm ? parseInt(body.gsm) : null,
      created_at: new Date().toISOString(),
    };
    
    try {
      const { data, error } = await supabase
        .from("paper_types")
        .insert([paperTypeData])
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
          error: "Paper types table does not exist. Please create the paper_types table first.",
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