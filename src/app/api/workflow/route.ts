import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";
import { integrationService } from "../../../lib/integration-service";

// GET - Get workflow statistics and status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const jobSheetId = url.searchParams.get("jobSheetId");

    if (action === "stats") {
      // Get comprehensive workflow statistics
      const { data: stats, error } = await supabase.rpc("get_workflow_stats");

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    if (action === "status" && jobSheetId) {
      // Get specific job workflow status
      const status = await integrationService.getWorkflowStatus(
        parseInt(jobSheetId)
      );

      if (!status) {
        return NextResponse.json(
          { success: false, error: "Workflow status not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    if (action === "overview") {
      // Get workflow overview with active jobs, machine status, and inventory alerts
      const [jobsResult, machinesResult, inventoryResult] =
        await Promise.allSettled([
          supabase
            .from("job_workflow_view")
            .select("*")
            .in("job_status", ["assigned", "in_progress"])
            .order("created_at", { ascending: false }),
          supabase
            .from("machines")
            .select(
              "id, name, status, is_available, current_job_count, max_concurrent_jobs, operator_name"
            )
            .eq("status", "active"),
          supabase
            .from("inventory_items")
            .select(
              "id, paper_type_name, gsm, current_quantity, available_quantity, party_id"
            )
            .lt("available_quantity", 100) // Low stock threshold
            .order("available_quantity", { ascending: true })
            .limit(10),
        ]);

      return NextResponse.json({
        success: true,
        data: {
          active_jobs:
            jobsResult.status === "fulfilled" ? jobsResult.value.data : [],
          machine_status:
            machinesResult.status === "fulfilled"
              ? machinesResult.value.data
              : [],
          low_inventory:
            inventoryResult.status === "fulfilled"
              ? inventoryResult.value.data
              : [],
        },
      });
    }

    // Default: Get recent workflow activities
    const { data: recentActivities, error: activitiesError } = await supabase
      .from("job_workflow_view")
      .select("*")
      .order("workflow_updated_at", { ascending: false })
      .limit(20);

    if (activitiesError) {
      return NextResponse.json(
        { success: false, error: activitiesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: recentActivities,
    });
  } catch (error) {
    console.error("GET workflow error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update job status or trigger workflow actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, job_sheet_id, status, machine_id, operator_notes } = body;

    if (!action || !job_sheet_id) {
      return NextResponse.json(
        { success: false, error: "Action and job_sheet_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (action) {
      case "update_status": {
        if (!status) {
          return NextResponse.json(
            {
              success: false,
              error: "Status is required for update_status action",
            },
            { status: 400 }
          );
        }

        // Update job status and workflow
        const { error: jobUpdateError } = await supabase
          .from("job_sheets")
          .update({
            job_status: status,
            operator_notes,
            ...(status === "in_progress" && {
              started_at: new Date().toISOString(),
            }),
            ...(status === "completed" && {
              completed_at: new Date().toISOString(),
            }),
          })
          .eq("id", job_sheet_id);

        if (jobUpdateError) {
          return NextResponse.json(
            { success: false, error: jobUpdateError.message },
            { status: 500 }
          );
        }

        // Update workflow status
        const workflowResult = await integrationService.updateJobStatus(
          job_sheet_id,
          status
        );

        if (!workflowResult.success) {
          console.warn(
            "Failed to update workflow status:",
            workflowResult.error
          );
        }

        return NextResponse.json({
          success: true,
          message: `Job status updated to ${status}`,
        });
      }

      case "reassign_machine": {
        if (!machine_id) {
          return NextResponse.json(
            {
              success: false,
              error: "Machine ID is required for reassign_machine action",
            },
            { status: 400 }
          );
        }

        // Check machine availability
        const { data: machine, error: machineError } = await supabase
          .from("machines")
          .select("id, name, status, is_available")
          .eq("id", machine_id)
          .single();

        if (machineError || !machine) {
          return NextResponse.json(
            { success: false, error: "Machine not found" },
            { status: 404 }
          );
        }

        if (machine.status !== "active" || !machine.is_available) {
          return NextResponse.json(
            { success: false, error: "Machine is not available" },
            { status: 400 }
          );
        }

        // Update job machine assignment
        const { error: assignError } = await supabase
          .from("job_sheets")
          .update({
            machine_id,
            job_status: "assigned",
            assigned_at: new Date().toISOString(),
            operator_notes: operator_notes || "Reassigned to different machine",
          })
          .eq("id", job_sheet_id);

        if (assignError) {
          return NextResponse.json(
            { success: false, error: assignError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Job reassigned to ${machine.name}`,
        });
      }

      case "release_machine": {
        // Release machine from job (useful for cancellations or manual overrides)
        const { error: releaseError } = await supabase
          .from("job_sheets")
          .update({
            machine_id: null,
            job_status: "created",
            assigned_at: null,
            operator_notes: operator_notes || "Machine released",
          })
          .eq("id", job_sheet_id);

        if (releaseError) {
          return NextResponse.json(
            { success: false, error: releaseError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Machine released from job",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("POST workflow error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Bulk workflow operations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, job_sheet_ids, target_status, target_machine_id } = body;

    if (!action || !job_sheet_ids || !Array.isArray(job_sheet_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: "Action and job_sheet_ids array are required",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (action) {
      case "bulk_status_update": {
        if (!target_status) {
          return NextResponse.json(
            { success: false, error: "Target status is required" },
            { status: 400 }
          );
        }

        const { error: bulkUpdateError } = await supabase
          .from("job_sheets")
          .update({
            job_status: target_status,
            ...(target_status === "in_progress" && {
              started_at: new Date().toISOString(),
            }),
            ...(target_status === "completed" && {
              completed_at: new Date().toISOString(),
            }),
          })
          .in("id", job_sheet_ids);

        if (bulkUpdateError) {
          return NextResponse.json(
            { success: false, error: bulkUpdateError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `${job_sheet_ids.length} jobs updated to ${target_status}`,
        });
      }

      case "bulk_machine_assign": {
        if (!target_machine_id) {
          return NextResponse.json(
            { success: false, error: "Target machine ID is required" },
            { status: 400 }
          );
        }

        // Check machine capacity
        const { data: machine, error: machineError } = await supabase
          .from("machines")
          .select(
            "id, name, status, is_available, current_job_count, max_concurrent_jobs"
          )
          .eq("id", target_machine_id)
          .single();

        if (machineError || !machine) {
          return NextResponse.json(
            { success: false, error: "Machine not found" },
            { status: 404 }
          );
        }

        const availableCapacity =
          (machine.max_concurrent_jobs || 1) - machine.current_job_count;
        if (job_sheet_ids.length > availableCapacity) {
          return NextResponse.json(
            {
              success: false,
              error: `Machine can only handle ${availableCapacity} more jobs. Requested: ${job_sheet_ids.length}`,
            },
            { status: 400 }
          );
        }

        const { error: bulkAssignError } = await supabase
          .from("job_sheets")
          .update({
            machine_id: target_machine_id,
            job_status: "assigned",
            assigned_at: new Date().toISOString(),
          })
          .in("id", job_sheet_ids);

        if (bulkAssignError) {
          return NextResponse.json(
            { success: false, error: bulkAssignError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `${job_sheet_ids.length} jobs assigned to ${machine.name}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown bulk action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("PUT workflow error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
