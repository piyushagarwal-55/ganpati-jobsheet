import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Handle missing environment variables gracefully
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a helper function to check environment variables
function checkEnvironmentVariables() {
    if (!supabaseUrl || !supabaseServiceKey) {
        return {
            hasError: true,
            error: "Supabase environment variables are not configured",
        };
    }
    return { hasError: false };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        // Check environment variables first
        const envCheck = checkEnvironmentVariables();
        if (envCheck.hasError) {
            return NextResponse.json(
                {
                    success: false,
                    error: envCheck.error,
                    message:
                        "Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables",
                },
                { status: 500 },
            );
        }

        // Create Supabase client only after environment check
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

        const { deletion_reason, deleted_by } = await request.json();

        if (!deletion_reason || !deletion_reason.trim()) {
            return NextResponse.json(
                { success: false, error: "Deletion reason is required" },
                { status: 400 },
            );
        }

        const jobSheetId = parseInt(params.id);

        if (isNaN(jobSheetId)) {
            return NextResponse.json(
                { success: false, error: "Invalid job sheet ID" },
                { status: 400 },
            );
        }

        // Check if job sheet exists
        const { data: existingSheet, error: fetchError } = await supabase
            .from("job_sheets")
            .select("id, is_deleted")
            .eq("id", jobSheetId)
            .single();

        if (fetchError || !existingSheet) {
            return NextResponse.json(
                { success: false, error: "Job sheet not found" },
                { status: 404 },
            );
        }

        if (existingSheet.is_deleted) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Job sheet is already marked as deleted",
                },
                { status: 400 },
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
                { status: 500 },
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
            { status: 500 },
        );
    }
}
