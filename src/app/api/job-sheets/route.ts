import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET() {
  try {
    console.log("GET /api/job-sheets called");
    
    const supabase = await createClient();
    console.log("Supabase client created");
    
    // Try the query with explicit joins
    const { data, error } = await supabase
      .from("job_sheets")
      .select(`
        *,
        parties!job_sheets_party_id_fkey (
          id,
          name,
          balance,
          phone,
          email
        ),
        paper_types!job_sheets_paper_type_id_fkey (
          id,
          name,
          gsm
        )
      `)
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase error with joins:", error);
      
      // Fallback: try without joins
      const { data: simpleData, error: simpleError } = await supabase
        .from("job_sheets")
        .select("*")
        .order("id", { ascending: false });
        
      if (simpleError) {
        console.error("Simple query also failed:", simpleError);
        return NextResponse.json({
          success: false,
          error: simpleError.message
        }, { status: 500 });
      }
      
      // For simple data, manually fetch related data
      const enrichedData = await Promise.all(
        (simpleData || []).map(async (sheet) => {
          let partyData = null;
          let paperTypeData = null;
          
          // Fetch party data if party_id exists
          if (sheet.party_id) {
            const { data: party } = await supabase
              .from("parties")
              .select("id, name, balance, phone, email")
              .eq("id", sheet.party_id)
              .single();
            partyData = party;
          }
          
          // Fetch paper type data if paper_type_id exists
          if (sheet.paper_type_id) {
            const { data: paperType } = await supabase
              .from("paper_types")
              .select("id, name, gsm")
              .eq("id", sheet.paper_type_id)
              .single();
            paperTypeData = paperType;
          }
          
          return {
            ...sheet,
            parties: partyData,
            paper_types: paperTypeData,
          };
        })
      );
      
      // Transform the enriched data
      const transformedData = enrichedData.map(sheet => {
        const totalCost = (sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0);
        
        return {
          ...sheet,
          party_name: sheet.parties?.name || sheet.party_name || null,
          party_balance: sheet.parties?.balance || null,
          party_balance_after: sheet.parties?.balance || null, // Current balance
          party_phone: sheet.parties?.phone || null,
          party_email: sheet.parties?.email || null,
          paper_type_name: sheet.paper_types?.name || null,
          paper_type_gsm: sheet.paper_types?.gsm || null,
          total_cost: totalCost,
          created_at: sheet.created_at || new Date().toISOString(),
          updated_at: sheet.updated_at || new Date().toISOString(),
        };
      });
      
      return NextResponse.json({
        success: true,
        data: transformedData,
        warning: "Used fallback method due to join constraints"
      });
    }

    // Transform the data to flatten the joins
    const transformedData = data?.map(sheet => {
      const totalCost = (sheet.printing || 0) + (sheet.uv || 0) + (sheet.baking || 0);
      
      return {
        ...sheet,
        party_name: sheet.parties?.name || sheet.party_name || null,
        party_balance: sheet.parties?.balance || null,
        party_balance_after: sheet.parties?.balance || null, // Current balance
        party_phone: sheet.parties?.phone || null,
        party_email: sheet.parties?.email || null,
        paper_type_name: sheet.paper_types?.name || null,
        paper_type_gsm: sheet.paper_types?.gsm || null,
        total_cost: totalCost,
        created_at: sheet.created_at || new Date().toISOString(),
        updated_at: sheet.updated_at || new Date().toISOString(),
      };
    }) || [];

    console.log("Job sheets fetched successfully:", transformedData.length, "records");
    console.log("Sample transformed data:", transformedData[0]);
    
    return NextResponse.json({
      success: true,
      data: transformedData
    });
    
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Add other HTTP methods if needed
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    console.log("POST /api/job-sheets called with:", body);
    
    const { data, error } = await supabase
      .from("job_sheets")
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}