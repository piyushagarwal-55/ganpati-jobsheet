import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machine_id");
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!machineId) {
      return NextResponse.json(
        { error: "Machine ID is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("operator_notifications")
      .select("*")
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ notifications: notifications || [] });
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
    const notificationId = searchParams.get("notification_id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { read } = body;

    if (typeof read !== "boolean") {
      return NextResponse.json(
        { error: "Read status must be a boolean" },
        { status: 400 }
      );
    }

    const { data: updatedNotification, error: updateError } = await supabase
      .from("operator_notifications")
      .update({
        read,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating notification:", updateError);
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Notification updated successfully",
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Mark all notifications as read for a machine
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machine_id");

    if (!machineId) {
      return NextResponse.json(
        { error: "Machine ID is required" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("operator_notifications")
      .update({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("machine_id", machineId)
      .eq("read", false);

    if (updateError) {
      console.error("Error marking notifications as read:", updateError);
      return NextResponse.json(
        { error: "Failed to update notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
