import AdminDashboard from "@/components/admin/AdminDashboard";
import { adminAuthAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Lock } from "lucide-react";
import { cookies } from "next/headers";

export default async function AdminPage() {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={adminAuthAction}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="passcode">Enter Passcode</Label>
                  <Input
                    id="passcode"
                    name="passcode"
                    type="password"
                    placeholder="Enter admin passcode"
                    required
                  />
                </div>
                <SubmitButton className="w-full">Access Dashboard</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminDashboard />
    </div>
  );
}
