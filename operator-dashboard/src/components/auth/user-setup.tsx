"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { USERS_CONFIG } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";

interface SetupResult {
  email: string;
  status: "created" | "updated" | "error" | "exists";
  message: string;
}

export const UserSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SetupResult[]>([]);
  const { toast } = useToast();

  const handleSetupUsers = async () => {
    setLoading(true);
    setResults([]);

    try {
      const setupResults: SetupResult[] = [];

      for (const userConfig of USERS_CONFIG) {
        try {
          // Try to sign up the user
          const { data, error } = await supabaseBrowser.auth.signUp({
            email: userConfig.email,
            password: userConfig.password,
            options: {
              data: {
                role: userConfig.role,
                name: userConfig.name,
              },
            },
          });

          if (error) {
            if (
              error.message.includes("already registered") ||
              error.message.includes("already been registered")
            ) {
              setupResults.push({
                email: userConfig.email,
                status: "exists",
                message: "User already exists",
              });
            } else {
              setupResults.push({
                email: userConfig.email,
                status: "error",
                message: error.message,
              });
            }
          } else if (data.user) {
            setupResults.push({
              email: userConfig.email,
              status: "created",
              message: "User created successfully",
            });
          }
        } catch (err) {
          setupResults.push({
            email: userConfig.email,
            status: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      setResults(setupResults);

      const created = setupResults.filter((r) => r.status === "created").length;
      const exists = setupResults.filter((r) => r.status === "exists").length;
      const errors = setupResults.filter((r) => r.status === "error").length;

      if (errors === 0) {
        toast({
          title: "User Setup Complete",
          description: `${created} users created, ${exists} already existed`,
        });
      } else {
        toast({
          title: "Setup Completed with Errors",
          description: `${created} created, ${exists} existed, ${errors} errors`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast({
        title: "Setup Failed",
        description: "Failed to set up users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "created":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "exists":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "updated":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "created":
      case "exists":
      case "updated":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>User Setup</span>
        </CardTitle>
        <CardDescription>
          Set up authentication users for the operator dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Users to be created:
          </h4>
          <div className="grid gap-2">
            {USERS_CONFIG.map((user) => (
              <div
                key={user.email}
                className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {user.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Button */}
        <Button
          onClick={handleSetupUsers}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up users...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Set Up Users
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Setup Results:
            </h4>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.email}
                  className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{result.email}</p>
                    <p className="text-xs text-slate-500">{result.message}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Note:</strong> This will create user accounts in Supabase
            Auth. All users will have the password "12345". In production, you
            should use stronger passwords and require users to change them on
            first login.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
