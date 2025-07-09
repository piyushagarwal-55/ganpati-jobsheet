import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../../supabase/server";

export const dynamic = "force-dynamic";

// GET operator dashboard data for a specific machine
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const machineId = parseInt(params.id);

    if (isNaN(machineId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid machine ID",
        },
        { status: 400 }
      );
    }

    // Get machine details
    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("*")
      .eq("id", machineId)
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

    // Get jobs assigned to this machine
    const { data: jobs, error: jobsError } = await supabase
      .from("job_sheets")
      .select(
        `
        *,
        machines!inner (
          id,
          name,
          operator_name
        )
      `
      )
      .eq("machine_id", machineId)
      .order("assigned_at", { ascending: true });

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch jobs",
        },
        { status: 500 }
      );
    }

    // Categorize jobs
    const assignedJobs =
      jobs?.filter((job) => job.job_status === "assigned") || [];
    const inProgressJobs =
      jobs?.filter((job) => job.job_status === "in_progress") || [];

    // Get completed jobs for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday =
      jobs?.filter((job) => {
        if (job.job_status !== "completed" || !job.completed_at) return false;
        const completedDate = new Date(job.completed_at);
        return completedDate >= today;
      }) || [];

    // Get machine statistics using the stored function
    const { data: statsResult, error: statsError } = await supabase.rpc(
      "get_machine_stats",
      { machine_id_param: machineId }
    );

    let stats = {
      total_jobs: 0,
      pending_jobs: 0,
      assigned_jobs: 0,
      in_progress_jobs: 0,
      completed_jobs: 0,
      cancelled_jobs: 0,
    };

    if (!statsError && statsResult) {
      stats = statsResult;
    }

    // Calculate additional metrics
    const totalActiveJobs = assignedJobs.length + inProgressJobs.length;
    const todayCompletedCount = completedToday.length;

    const dashboardData = {
      machine,
      assigned_jobs: assignedJobs,
      in_progress_jobs: inProgressJobs,
      completed_today: completedToday,
      stats: {
        ...stats,
        active_jobs: totalActiveJobs,
        completed_today: todayCompletedCount,
      },
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
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

// POST - Update job status (for operators)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const machineId = parseInt(params.id);
    const body = await request.json();

    const { job_sheet_id, action, operator_notes } = body;

    if (isNaN(machineId) || !job_sheet_id || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Machine ID, job sheet ID, and action are required",
        },
        { status: 400 }
      );
    }

    // Verify the job belongs to this machine
    const { data: job, error: jobError } = await supabase
      .from("job_sheets")
      .select("id, job_status, machine_id")
      .eq("id", job_sheet_id)
      .eq("machine_id", machineId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "Job not found or not assigned to this machine",
        },
        { status: 404 }
      );
    }

    let updateData: any = {
      operator_notes,
    };

    // Handle different actions
    switch (action) {
      case "start":
        if (job.job_status !== "assigned") {
          return NextResponse.json(
            {
              success: false,
              error: "Can only start assigned jobs",
            },
            { status: 400 }
          );
        }
        updateData.job_status = "in_progress";
        updateData.started_at = new Date().toISOString();
        break;

      case "complete":
        if (job.job_status !== "in_progress") {
          return NextResponse.json(
            {
              success: false,
              error: "Can only complete jobs that are in progress",
            },
            { status: 400 }
          );
        }
        updateData.job_status = "completed";
        updateData.completed_at = new Date().toISOString();
        break;

      case "cancel":
        if (["completed", "cancelled"].includes(job.job_status)) {
          return NextResponse.json(
            {
              success: false,
              error: "Cannot cancel completed or already cancelled jobs",
            },
            { status: 400 }
          );
        }
        updateData.job_status = "cancelled";
        break;

      case "update_notes":
        // Only update notes, no status change
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
          },
          { status: 400 }
        );
    }

    // Update the job
    const { data: updatedJob, error: updateError } = await supabase
      .from("job_sheets")
      .update(updateData)
      .eq("id", job_sheet_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating job:", updateError);
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
      message: `Job ${action}ed successfully`,
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
