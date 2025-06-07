import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminAuthAction } from "@/app/actions";
import {
  Lock,
  FileText,
  TrendingUp,
  BarChart3,
  Shield,
  Settings,
  Star,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { cookies } from "next/headers";
import JobSheetAdminDashboard from "@/components/job-sheet-admin-dashboard";

export default async function AdminJobSheetPage() {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

  if (!isAuthenticated) {
    return (
      <div className="mt-16 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl shadow-lg mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Secure access to job sheet management platform
            </p>
          </div>

          {/* Authentication Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4 mx-auto">
                <Lock className="w-5 h-5 text-gray-700" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Secure Access
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Enter your admin credentials to continue
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <form action={adminAuthAction as any} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="passcode"
                    className="text-sm font-medium text-gray-700"
                  >
                    Admin Passcode
                  </Label>
                  <Input
                    id="passcode"
                    name="passcode"
                    type="password"
                    placeholder="Enter your admin passcode"
                    required
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Access Admin Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features Section */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Job Management
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Analytics</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Reports</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Enterprise Security
                </h4>
                <p className="text-xs text-gray-600">
                  Protected by military-grade encryption protocols
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="container">
        {/* Enhanced Header for Authenticated State */}

        {/* Enhanced Dashboard Container */}
        <Card className="overflow-hidden">
          
          <CardContent className="">
            <JobSheetAdminDashboard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
