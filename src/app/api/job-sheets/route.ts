import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Query all job sheets (including soft deleted for admin purposes)
    const { data, error } = await supabase
      .from("job_sheets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100); // Limit results for performance

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

    // Transform the data without complex joins
    const transformedData = (data || []).map((sheet) => {
      const totalCost =
        (sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0);

      return {
        ...sheet,
        total_cost: totalCost,
        created_at: sheet.created_at || new Date().toISOString(),
        updated_at: sheet.updated_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedData,
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

// Add other HTTP methods if needed
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("job_sheets")
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
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
