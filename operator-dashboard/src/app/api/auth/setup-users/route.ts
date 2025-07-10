import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { USERS_CONFIG } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Only allow setup in development or with proper authorization
    const isDevelopment = process.env.NODE_ENV === "development";
    const authHeader = request.headers.get("authorization");
    const isAuthorized =
      authHeader === `Bearer ${process.env.SETUP_SECRET || "dev-setup-secret"}`;

    if (!isDevelopment && !isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client with service role key (if available)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const results = [];

    for (const userConfig of USERS_CONFIG) {
      try {
        // Create user with auth admin
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: userConfig.email,
            password: userConfig.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              role: userConfig.role,
              name: userConfig.name,
            },
          });

        if (authError) {
          // User might already exist
          if (authError.message.includes("already registered")) {
            // Try to update the existing user
            const { data: existingUsers } =
              await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(
              (user) => user.email === userConfig.email
            );

            if (existingUser) {
              const { data: updateData, error: updateError } =
                await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                  user_metadata: {
                    role: userConfig.role,
                    name: userConfig.name,
                  },
                });

              if (updateError) {
                results.push({
                  email: userConfig.email,
                  status: "error",
                  message: `Failed to update: ${updateError.message}`,
                });
              } else {
                results.push({
                  email: userConfig.email,
                  status: "updated",
                  message: "User metadata updated successfully",
                });
              }
            } else {
              results.push({
                email: userConfig.email,
                status: "error",
                message: "User exists but couldn't be found",
              });
            }
          } else {
            results.push({
              email: userConfig.email,
              status: "error",
              message: authError.message,
            });
          }
        } else {
          results.push({
            email: userConfig.email,
            status: "created",
            message: "User created successfully",
            userId: authData.user?.id,
          });
        }
      } catch (err) {
        results.push({
          email: userConfig.email,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: "User setup completed",
      results,
      summary: {
        total: USERS_CONFIG.length,
        created: results.filter((r) => r.status === "created").length,
        updated: results.filter((r) => r.status === "updated").length,
        errors: results.filter((r) => r.status === "error").length,
      },
    });
  } catch (error) {
    console.error("Error setting up users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "User setup endpoint",
    users: USERS_CONFIG.map((user) => ({
      email: user.email,
      role: user.role,
      name: user.name,
      // Don't expose passwords
    })),
  });
}
