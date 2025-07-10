import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { emailService } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  try {
    // Check if this is from a cron job or authorized request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "default-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending email notifications
    const { data: pendingEmails, error: fetchError } = await supabase.rpc(
      "get_pending_email_notifications",
      { limit_count: 10 }
    );

    if (fetchError) {
      console.error("Error fetching pending emails:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({
        message: "No pending emails",
        processed: 0,
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each pending email
    for (const email of pendingEmails) {
      try {
        const result = await emailService.sendEmail({
          to: email.to_email,
          subject: email.subject,
          html: email.html_content,
          text: email.text_content || "",
        });

        if (result.success) {
          // Mark as sent
          await supabase.rpc("mark_email_as_sent", { email_id: email.id });
          successCount++;
          console.log(
            `✅ Email sent successfully to ${email.to_email}: ${email.subject}`
          );
        } else {
          // Mark as failed
          await supabase.rpc("mark_email_as_failed", {
            email_id: email.id,
            error_msg: result.error || "Unknown error",
          });
          failureCount++;
          console.error(
            `❌ Email failed to ${email.to_email}: ${result.error}`
          );
        }
      } catch (error) {
        // Mark as failed
        await supabase.rpc("mark_email_as_failed", {
          email_id: email.id,
          error_msg:
            error instanceof Error ? error.message : "Unexpected error",
        });
        failureCount++;
        console.error(
          `❌ Email processing error for ${email.to_email}:`,
          error
        );
      }

      // Add small delay to prevent overwhelming the email service
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      message: `Processed ${pendingEmails.length} emails`,
      success: successCount,
      failed: failureCount,
      total: pendingEmails.length,
    });
  } catch (error) {
    console.error("Email worker error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to manually trigger email processing (for testing)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Simple token-based auth for manual testing
  if (token !== process.env.EMAIL_WORKER_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Reuse the POST logic
  const fakeRequest = new NextRequest(request.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || "default-secret"}`,
    },
  });

  return POST(fakeRequest);
}
