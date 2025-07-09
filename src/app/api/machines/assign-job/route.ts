import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

export const dynamic = "force-dynamic";

// POST - Assign job to machine
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { job_sheet_id, machine_id, operator_notes } = body;

    if (!job_sheet_id || !machine_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet ID and machine ID are required",
        },
        { status: 400 }
      );
    }

    // Check if job exists and is not already assigned
    const { data: job, error: jobError } = await supabase
      .from("job_sheets")
      .select("id, job_status, machine_id")
      .eq("id", job_sheet_id)
      .eq("is_deleted", false)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet not found",
        },
        { status: 404 }
      );
    }

    if (job.machine_id && job.job_status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Job is already assigned to a machine",
        },
        { status: 400 }
      );
    }

    // Check if machine exists and is available
    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, name, status, is_available")
      .eq("id", machine_id)
      .single();

    if (machineError || !machine) {
      return NextResponse.json(
        {
          success: false,
          error: "Machine not found",
        },
        { status: 404 }
      );
    }

    if (machine.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `Machine is currently ${machine.status} and cannot accept new jobs`,
        },
        { status: 400 }
      );
    }

    // Assign the job to the machine
    const { data: updatedJob, error: updateError } = await supabase
      .from("job_sheets")
      .update({
        machine_id,
        job_status: "assigned",
        assigned_at: new Date().toISOString(),
        operator_notes,
      })
      .eq("id", job_sheet_id)
      .select(
        `
        *,
        machines (
          id,
          name,
          operator_name
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Error assigning job:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: `Job assigned to ${machine.name} successfully`,
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

// PUT - Reassign job to different machine
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { job_sheet_id, new_machine_id, operator_notes, reason } = body;

    if (!job_sheet_id || !new_machine_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet ID and new machine ID are required",
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const { data: job, error: jobError } = await supabase
      .from("job_sheets")
      .select("id, job_status, machine_id")
      .eq("id", job_sheet_id)
      .eq("is_deleted", false)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "Job sheet not found",
        },
        { status: 404 }
      );
    }

    if (job.job_status === "completed") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot reassign completed jobs",
        },
        { status: 400 }
      );
    }

    if (job.job_status === "in_progress") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot reassign jobs that are in progress",
        },
        { status: 400 }
      );
    }

    // Check if new machine exists and is available
    const { data: newMachine, error: newMachineError } = await supabase
      .from("machines")
      .select("id, name, status")
      .eq("id", new_machine_id)
      .single();

    if (newMachineError || !newMachine) {
      return NextResponse.json(
        {
          success: false,
          error: "New machine not found",
        },
        { status: 404 }
      );
    }

    if (newMachine.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `New machine is currently ${newMachine.status} and cannot accept jobs`,
        },
        { status: 400 }
      );
    }

    // Reassign the job
    const updateData: any = {
      machine_id: new_machine_id,
      job_status: "assigned",
      assigned_at: new Date().toISOString(),
      started_at: null, // Reset started time
    };

    if (operator_notes) {
      updateData.operator_notes =
        `${job.operator_notes || ""}\n\nReassigned: ${reason || "No reason provided"}\nNew notes: ${operator_notes}`.trim();
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from("job_sheets")
      .update(updateData)
      .eq("id", job_sheet_id)
      .select(
        `
        *,
        machines (
          id,
          name,
          operator_name
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Error reassigning job:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: `Job reassigned to ${newMachine.name} successfully`,
    });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
