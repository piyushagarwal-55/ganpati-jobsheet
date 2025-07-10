import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machine_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!machineId) {
      return NextResponse.json(
        { error: "Machine ID is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("job_sheets")
      .select(
        `
        id,
        description,
        party_name,
        machine_id,
        job_status,
        assigned_at,
        started_at,
        completed_at,
        operator_notes,
        created_at,
        updated_at,
        machines!inner(
          id,
          name,
          operator_name,
          operator_email
        )
      `
      )
      .eq("machine_id", machineId)
      .eq("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("job_status", status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { job_status, operator_notes, machine_id } = body;

    if (!job_status) {
      return NextResponse.json(
        { error: "Job status is required" },
        { status: 400 }
      );
    }

    // Valid job statuses
    const validStatuses = [
      "pending",
      "assigned",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(job_status)) {
      return NextResponse.json(
        { error: "Invalid job status" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      job_status,
      updated_at: new Date().toISOString(),
    };

    // Add operator notes if provided
    if (operator_notes !== undefined) {
      updateData.operator_notes = operator_notes;
    }

    // Add timestamps based on status
    if (job_status === "in_progress" && !body.started_at) {
      updateData.started_at = new Date().toISOString();
    } else if (job_status === "completed" && !body.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the job
    const { data: updatedJob, error: updateError } = await supabase
      .from("job_sheets")
      .update(updateData)
      .eq("id", jobId)
      .select(
        `
        id,
        description,
        party_name,
        machine_id,
        job_status,
        assigned_at,
        started_at,
        completed_at,
        operator_notes,
        created_at,
        updated_at
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating job:", updateError);
      return NextResponse.json(
        { error: "Failed to update job" },
        { status: 500 }
      );
    }

    // Create operator notification for job update
    if (machine_id) {
      await supabase.rpc("create_operator_notification", {
        p_type: "job_status_update",
        p_job_id: parseInt(jobId),
        p_machine_id: machine_id,
        p_title: `Job Status Updated to ${job_status}`,
        p_message: `Job #${jobId} status has been updated to ${job_status}${operator_notes ? ` with notes: ${operator_notes}` : ""}`,
        p_data: {
          job_id: parseInt(jobId),
          new_status: job_status,
          operator_notes,
          updated_at: updateData.updated_at,
        },
      });
    }

    return NextResponse.json({
      message: "Job updated successfully",
      job: updatedJob,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
